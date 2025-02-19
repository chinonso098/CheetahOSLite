import { basename, extname, join, resolve } from '@zenfs/core/vfs/path.js';
import * as constants from 'src/app/system-files/constants';
import { FileInfo } from 'src/app/system-files/fileinfo';
import { ShortCut } from 'src/app/system-files/shortcut';

import { Buffer } from 'buffer';
import ini from 'ini';
import { Subject } from 'rxjs';

import type { Dirent, ErrnoError, IndexData, Stats } from '@zenfs/core';
import { configure, CopyOnWrite, Fetch, default as fs } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';
import OSFileSystemIndex from '../../../../index.json';
/// <reference types="node" />

const fsPrefix = '/osdrive';

export const configured = configure({
	mounts: {
		'/': {
			backend: CopyOnWrite,
			readable: {
				backend: Fetch,
				index: OSFileSystemIndex as IndexData,
				baseUrl: 'http://localhost:4200' + fsPrefix,
			},
			writable: {
				backend: IndexedDB,
				storeName: 'fs-cache',
			},
		},
	},
});

function throwWithPath(error: ErrnoError): never {
	// We want the path in the message, since Angular won't throw the actual error.
	error.message = error.toString();
	throw error;
}

export const dirFilesReadyNotify: Subject<void> = new Subject<void>();
export const dirFilesUpdateNotify: Subject<void> = new Subject<void>();

export async function isDir(path: string): Promise<boolean> {
	await configured;
	const stats = await fs.promises.stat(path).catch(throwWithPath);
	return stats.isDirectory();
}

export async function exists(dirPath: string): Promise<boolean> {
	await configured;
	return fs.promises.exists(dirPath).catch(throwWithPath);
}

export async function copy(source: string, destination: string): Promise<void> {
	await configured;
	const stats = await fs.promises.stat(destination);
	if (stats.isDirectory()) destination = join(destination, basename(source));
	await fs.promises.cp(source, destination).catch(throwWithPath);
}

export async function readdir(path: string): Promise<string[]> {
	await configured;
	return await fs.promises.readdir(path).catch(throwWithPath);
}

async function fileInfo(fullPath: string, entry: Dirent): Promise<FileInfo> {
	const extension = extname(fullPath);
	const info = new FileInfo(entry);

	if (!extension) {
		const iconFile = '/osdrive/icons/' + (entry.isDirectory() ? 'folder.ico' : 'unknown.ico');
		const iconMaybe = `/icons/${entry.name.toLocaleLowerCase()}_folder.ico`;
		info.iconPath = fs.existsSync(iconMaybe) ? fsPrefix + iconMaybe : iconFile;

		info.fileType = 'folder';
		info.opensWith = 'fileexplorer';
		return info;
	}

	if (extension == '.url') {
		const sc = await shortcutFromURL(fullPath);
		Object.assign(info, sc);
	} else if (constants.IMAGE_FILE_EXTENSIONS.includes(extension)) {
		const sc = await shortcutFromB64DataUrl(fullPath, 'image');
		info.iconPath = sc.iconPath;
		info.contentPath = sc.contentPath;
		info.fileType = extension;
		info.opensWith = 'photoviewer';
	} else if (constants.VIDEO_FILE_EXTENSIONS.includes(extension)) {
		const sc = await shortcutFromB64DataUrl(fullPath, 'video');
		info.iconPath = '/osdrive/icons/video_file.ico';
		info.contentPath = sc.contentPath;
		info.fileType = extension;
		info.opensWith = 'videoplayer';
	} else if (constants.AUDIO_FILE_EXTENSIONS.includes(extension)) {
		const sc = await shortcutFromB64DataUrl(fullPath, 'audio');
		info.iconPath = '/osdrive/icons/music_file.ico';
		info.contentPath = sc.contentPath;
		info.fileType = extension;
		info.opensWith = 'audioplayer';
	} else if (extension == '.txt' || extension == '.properties') {
		info.iconPath = '/osdrive/icons/file.ico';
		info.fileType = extname(fullPath);
		info.opensWith = 'texteditor';
	} else {
		info.iconPath = '/osdrive/icons/unknown.ico';
	}

	return info;
}

export async function* directoryInfo(path: string): AsyncIterableIterator<FileInfo> {
	await configured;
	if (path == '/fileexplorer.url') debugger;
	for (const entry of await fs.promises
		.readdir(path, { withFileTypes: true })
		.catch(throwWithPath)) {
		yield await fileInfo(join(path, entry.path), entry);
	}
}

export async function shortcutFromB64DataUrl(path: string, contentType: string): Promise<ShortCut> {
	await configured;
	const contents = await fs.promises.readFile(path).catch(throwWithPath);

	const stringData = contents.toString('utf-8');
	if (!isUtf8Encoded(stringData)) {
		return {
			iconPath: '',
			fileName: basename(path, extname(path)),
			fileType: '',
			contentPath: URL.createObjectURL(new Blob([contents])),
			opensWith: '',
		};
	}

	if (
		stringData.substring(0, 10) == 'data:image' ||
		stringData.substring(0, 10) == 'data:video' ||
		stringData.substring(0, 10) == 'data:audio'
	) {
		// Extract Base64-encoded string from Data URL
		const base64Data = contents.toString().split(',')[1];
		const contentData = Buffer.from(base64Data, 'base64');
		const fileUrl = URL.createObjectURL(new Blob([new Uint8Array(contentData)]));

		return {
			iconPath: stringData.substring(0, 10) == 'data:image' ? fileUrl : '',
			fileName: basename(path, extname(path)),
			fileType: '',
			contentPath: fileUrl,
			opensWith: '',
		};
	} else {
		const fileUrl = URL.createObjectURL(new Blob([contents]));
		return {
			iconPath: contentType === 'image' ? fileUrl : '',
			fileName: basename(path, extname(path)),
			fileType: '',
			contentPath: fileUrl,
			opensWith: '',
		};
	}
}

export async function shortcutFromURL(path: string): Promise<ShortCut> {
	await configured;
	const contents = await fs.promises.readFile(path).catch(throwWithPath);

	const stage = contents ? contents.toString() : Buffer.from('').toString();
	const shortCut = (ini.parse(stage) as unknown) || {
		InternetShortcut: {
			FileName: '',
			IconPath: '',
			FileType: '',
			ContentPath: '',
			OpensWith: '',
		},
	};
	if (typeof shortCut != 'object') {
		return {
			iconPath: '',
			fileName: '',
			fileType: '',
			contentPath: '',
			opensWith: '',
		};
	}
	const iSCut = (shortCut as { InternetShortcut: any })?.InternetShortcut;
	return {
		iconPath: iSCut?.IconPath,
		fileName: iSCut?.FileName,
		fileType: iSCut?.FileType,
		contentPath: iSCut?.ContentPath,
		opensWith: iSCut?.OpensWith,
	};
}

function isUtf8Encoded(data: string): boolean {
	try {
		const encoder = new TextEncoder();
		const bytes = encoder.encode(data);
		const decoder = new TextDecoder('utf-8', { fatal: true });
		decoder.decode(bytes);
		return true;
	} catch (error) {
		return false;
	}
}

export let eventOriginator = '';

export function setEventOriginator(eventOrig: string): void {
	eventOriginator = eventOrig;
}
