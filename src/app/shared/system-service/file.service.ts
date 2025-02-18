import { basename, extname, resolve } from '@zenfs/core/vfs/path.js';
import * as constants from 'src/app/system-files/constants';
import { FileMetaData } from 'src/app/system-files/file.metadata';
import { FileEntry } from 'src/app/system-files/fileentry';
import { FileInfo } from 'src/app/system-files/fileinfo';
import { ShortCut } from 'src/app/system-files/shortcut';

import { Buffer } from 'buffer';
import ini from 'ini';
import { Subject } from 'rxjs';

import {
	configure,
	CopyOnWrite,
	Fetch,
	default as fs,
	resolveMountConfig,
	type ErrnoError,
	type IndexData,
} from '@zenfs/core';

import { IndexedDB } from '@zenfs/dom';
import OSFileSystemIndex from '../../../../index.json';
/// <reference types="node" />

const configured = configure({
	mounts: {
		'/': {
			backend: CopyOnWrite,
			readable: {
				backend: Fetch,
				index: OSFileSystemIndex as IndexData,
				baseUrl: 'http://localhost:4200/osdrive',
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

async function changeFolderIcon(
	fileName: string,
	iconPath: string
): Promise<string> {
	await configured;
	const baseUrl = '/osdrive';
	const iconMaybe = `/icons/${fileName.toLocaleLowerCase()}_folder.ico`;
	return fs.existsSync(iconMaybe) ? `${baseUrl}${iconMaybe}` : iconPath;
}

export async function checkIfDirectory(path: string): Promise<boolean> {
	await configured;
	const stats = await fs.promises.stat(path).catch(throwWithPath);
	return stats.isDirectory();
}

export async function checkIfExistsAsync(dirPath: string): Promise<boolean> {
	await configured;
	return fs.promises.exists(dirPath).catch(throwWithPath);
}

export async function copyFileAsync(
	sourcePath: string,
	destinationPath: string
): Promise<boolean> {
	await configured;
	const fileName = basename(sourcePath);
	console.log(`Destination: ${destinationPath}/${fileName}`);
	await fs.promises
		.copyFile(sourcePath, `${destinationPath}/${fileName}`)
		.catch(throwWithPath);
	return true;
}

export async function copyHandler(
	sourcePathArg: string,
	destinationArg: string
): Promise<boolean> {
	const checkIfDirResult = await checkIfDirectory(`${sourcePathArg}`);
	if (checkIfDirResult) {
		// ignoring directories for now
	} else {
		const result = await copyFileAsync(
			`${sourcePathArg}`,
			`${destinationArg}`
		);
		if (result) {
			console.log(
				`file:${sourcePathArg} successfully copied to destination:${destinationArg}`
			);
		} else {
			console.log(
				`file:${sourcePathArg} failed to copy to destination:${destinationArg}`
			);
			return false;
		}
	}

	return true;
}

export async function getExtraFileMetaDataAsync(path: string) {
	await configured;
	const stats = await fs.promises.stat(path).catch(throwWithPath);
	return new FileMetaData(stats.ctime, stats.mtime, stats.size, stats.mode);
}

export async function getEntriesFromDirectoryAsync(
	path: string
): Promise<string[]> {
	if (!path) {
		console.error(
			'getEntriesFromDirectoryAsync error: Path must not be empty'
		);
		return Promise.reject(new Error('Path must not be empty'));
	}

	await configured;
	return await fs.promises.readdir(path).catch(throwWithPath);
}

export function getFileEntriesFromDirectory(
	fileList: string[],
	directory: string
): FileEntry[] {
	let _directoryFileEntires: FileEntry[] = [];

	for (let i = 0; i < fileList.length; i++) {
		const file = fileList[i];

		_directoryFileEntires.push({
			name: basename(file, extname(file)),
			path: resolve(directory, file),
		});
	}
	return _directoryFileEntires;
}

export async function getFileInfoAsync(path: string): Promise<FileInfo> {
	const extension = extname(path);
	const _fileInfo = new FileInfo();

	if (!extension) {
		const sc = await setFolderValuesAsync(path);
		const fileMetaData = await getExtraFileMetaDataAsync(path);

		_fileInfo.iconPath = await changeFolderIcon(sc.fileName, sc.iconPath);
		_fileInfo.currentPath = path;
		_fileInfo.fileType = sc.fileType;
		_fileInfo.fileName = sc.fileName;
		_fileInfo.opensWith = sc.opensWith;
		_fileInfo.isFile = false;
		_fileInfo.dateModified = fileMetaData.modifiedDate;
		_fileInfo.size = fileMetaData.size;
		_fileInfo.mode = fileMetaData.mode;
		return _fileInfo;
	}

	const fileMetaData = await getExtraFileMetaDataAsync(path);

	if (extension == '.url') {
		const sc = await getShortCutFromURLAsync(path);
		_fileInfo.iconPath = sc.iconPath;
		_fileInfo.currentPath = path;
		_fileInfo.contentPath = sc.contentPath;
		_fileInfo.fileType = sc.fileType;
		_fileInfo.fileName = basename(path, extname(path));
		_fileInfo.opensWith = sc.opensWith;
		_fileInfo.dateModified = fileMetaData.modifiedDate;
		_fileInfo.size = fileMetaData.size;
		_fileInfo.mode = fileMetaData.mode;
	} else if (constants.IMAGE_FILE_EXTENSIONS.includes(extension)) {
		const sc = await getShortCutFromB64DataUrlAsync(path, 'image');
		_fileInfo.iconPath = sc.iconPath;
		_fileInfo.currentPath = path;
		_fileInfo.contentPath = sc.contentPath;
		_fileInfo.fileType = extension;
		_fileInfo.fileName = sc.fileName;
		_fileInfo.opensWith = 'photoviewer';
		_fileInfo.dateModified = fileMetaData.modifiedDate;
		_fileInfo.size = fileMetaData.size;
		_fileInfo.mode = fileMetaData.mode;
	} else if (constants.VIDEO_FILE_EXTENSIONS.includes(extension)) {
		const sc = await getShortCutFromB64DataUrlAsync(path, 'video');
		_fileInfo.iconPath = '/osdrive/icons/video_file.ico';
		_fileInfo.currentPath = path;
		_fileInfo.contentPath = sc.contentPath;
		_fileInfo.fileType = extension;
		_fileInfo.fileName = sc.fileName;
		_fileInfo.opensWith = 'videoplayer';
		_fileInfo.dateModified = fileMetaData.modifiedDate;
		_fileInfo.size = fileMetaData.size;
		_fileInfo.mode = fileMetaData.mode;
	} else if (constants.AUDIO_FILE_EXTENSIONS.includes(extension)) {
		const sc = await getShortCutFromB64DataUrlAsync(path, 'audio');
		_fileInfo.iconPath = '/osdrive/icons/music_file.ico';
		_fileInfo.currentPath = path;
		_fileInfo.contentPath = sc.contentPath;
		_fileInfo.fileType = extension;
		_fileInfo.fileName = sc.fileName;
		_fileInfo.opensWith = 'audioplayer';
		_fileInfo.dateModified = fileMetaData.modifiedDate;
		_fileInfo.size = fileMetaData.size;
		_fileInfo.mode = fileMetaData.mode;
	} else if (extension == '.txt' || extension == '.properties') {
		_fileInfo.iconPath = '/osdrive/icons/file.ico';
		_fileInfo.currentPath = path;
		_fileInfo.fileType = extname(path);
		_fileInfo.fileName = basename(path, extname(path));
		_fileInfo.opensWith = 'texteditor';
		_fileInfo.dateModified = fileMetaData.modifiedDate;
		_fileInfo.size = fileMetaData.size;
		_fileInfo.mode = fileMetaData.mode;
	} else {
		_fileInfo.iconPath = '/osdrive/icons/unknown.ico';
		_fileInfo.currentPath = path;
		_fileInfo.fileName = basename(path, extname(path));
		_fileInfo.dateModified = fileMetaData.modifiedDate;
		_fileInfo.size = fileMetaData.size;
		_fileInfo.mode = fileMetaData.mode;
	}

	return _fileInfo;
}

export async function getShortCutFromB64DataUrlAsync(
	path: string,
	contentType: string
): Promise<ShortCut> {
	await configured;
	const contents = await fs.promises.readFile(path).catch(throwWithPath);

	const stringData = contents.toString('utf-8');
	if (!isUtf8Encoded(stringData)) {
		return {
			iconPath: '',
			fileName: basename(path, extname(path)),
			fileType: '',
			contentPath: bufferToUrl2(contents),
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
		const encoding: BufferEncoding = 'base64';
		const cntntData = Buffer.from(base64Data, encoding);
		const fileUrl = bufferToUrl(cntntData);

		return {
			iconPath:
				stringData.substring(0, 10) == 'data:image' ? fileUrl : '',
			fileName: basename(path, extname(path)),
			fileType: '',
			contentPath: fileUrl,
			opensWith: '',
		};
	} else {
		const fileUrl = bufferToUrl2(contents);
		return {
			iconPath: contentType === 'image' ? fileUrl : '',
			fileName: basename(path, extname(path)),
			fileType: '',
			contentPath: fileUrl,
			opensWith: '',
		};
	}
}

export async function getShortCutFromURLAsync(path: string): Promise<ShortCut> {
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
	const iSCut = (shortCut as { InternetShortcut: unknown })?.[
		'InternetShortcut'
	];
	const fileName = (iSCut as { FileName: unknown })?.['FileName'] as string;
	const iconPath = (iSCut as { IconPath: unknown })?.['IconPath'] as string;
	const fileType = (iSCut as { FileType: unknown })?.['FileType'] as string;
	const contentPath = (iSCut as { ContentPath: unknown })?.[
		'ContentPath'
	] as string;
	const opensWith = (iSCut as { OpensWith: unknown })?.[
		'OpensWith'
	] as string;
	return {
		iconPath,
		fileName,
		fileType,
		contentPath,
		opensWith,
	};
}

export async function setFolderValuesAsync(path: string): Promise<ShortCut> {
	await configured;
	const exists = await fs.promises.exists(path).catch(throwWithPath);

	if (!exists) {
		return {
			iconPath: '',
			fileName: '',
			fileType: '',
			contentPath: '',
			opensWith: '',
		};
	}

	const stats = await fs.promises.stat(path).catch(throwWithPath);
	const iconFile = `/osdrive/icons/${stats.isDirectory() ? 'folder.ico' : 'unknown.ico'}`;
	const fileType = 'folder';
	const opensWith = 'fileexplorer';
	return {
		iconPath: iconFile,
		fileName: basename(path, extname(path)),
		fileType: fileType,
		contentPath: basename(path, extname(path)),
		opensWith: opensWith,
	};
}

function bufferToUrl(buffer: Buffer): string {
	return URL.createObjectURL(new Blob([new Uint8Array(buffer)]));
}

function bufferToUrl2(arr: Uint8Array): string {
	return URL.createObjectURL(new Blob([arr]));
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

let _eventOriginator = '';

export function addEventOriginator(eventOrig: string): void {
	_eventOriginator = eventOrig;
}

export function getEventOrginator(): string {
	return _eventOriginator;
}

export function removeEventOriginator(): void {
	_eventOriginator = '';
}
