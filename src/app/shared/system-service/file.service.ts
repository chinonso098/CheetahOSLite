import { basename, extname, resolve } from '@zenfs/core/vfs/path.js';
import { Constants } from 'src/app/system-files/constants';
import { FileMetaData } from 'src/app/system-files/file.metadata';
import { FileEntry } from 'src/app/system-files/fileentry';
import { FileInfo } from 'src/app/system-files/fileinfo';
import { ShortCut } from 'src/app/system-files/shortcut';

import { Buffer } from 'buffer';
import ini from 'ini';
import { Subject } from 'rxjs';

import { configure, fs, CopyOnWrite, Fetch, resolveMountConfig, type IndexData } from '@zenfs/core';
(globalThis as any).fs = (globalThis as any).__zenfs__;

import { IndexedDB } from '@zenfs/dom';
import OSFileSystemIndex from '../../../../index.json';
/// <reference types="node" />

await configure({
	mounts: {
		'/': {
			backend: CopyOnWrite,
			readable: await resolveMountConfig({ backend: Fetch, index: OSFileSystemIndex as IndexData, baseUrl: 'http://localhost:4200/osdrive' }),
			writable: await resolveMountConfig({ backend: IndexedDB, storeName: 'fs-cache' }),
		},
	},
});

const _consts: Constants = new Constants();
let _directoryFileEntires: FileEntry[] = [];
let _eventOriginator = '';

export const dirFilesReadyNotify: Subject<void> = new Subject<void>();
export const dirFilesUpdateNotify: Subject<void> = new Subject<void>();

function changeFolderIcon(fileName: string, iconPath: string): string {
	const baseUrl = '/osdrive';
	const iconMaybe = `/icons/${fileName.toLocaleLowerCase()}_folder.ico`;
	return fs.existsSync(iconMaybe) ? `${baseUrl}${iconMaybe}` : iconPath;
}

export async function checkIfDirectory(path: string): Promise<boolean> {
	return (await fs.promises.stat(path)).isDirectory();
}

export async function checkIfExistsAsync(dirPath: string): Promise<boolean> {
	return fs.promises.exists(dirPath);
}

export async function copyFileAsync(sourcePath: string, destinationPath: string): Promise<boolean> {
	const fileName = basename(sourcePath);
	console.log(`Destination: ${destinationPath}/${fileName}`);
	await fs.promises.copyFile(sourcePath, `${destinationPath}/${fileName}`);
	return true;
}

export async function copyHandler(sourcePathArg: string, destinationArg: string): Promise<boolean> {
	const checkIfDirResult = await checkIfDirectory(`${sourcePathArg}`);
	if (checkIfDirResult) {
		// ignoring directories for now
	} else {
		const result = await copyFileAsync(`${sourcePathArg}`, `${destinationArg}`);
		if (result) {
			console.log(`file:${sourcePathArg} successfully copied to destination:${destinationArg}`);
		} else {
			console.log(`file:${sourcePathArg} failed to copy to destination:${destinationArg}`);
			return false;
		}
	}

	return true;
}

export async function getExtraFileMetaDataAsync(path: string) {
	const stats = await fs.promises.stat(path);
	return new FileMetaData(stats?.ctime, stats?.mtime, stats?.size, stats?.mode);
}

export async function getEntriesFromDirectoryAsync(path: string): Promise<string[]> {
	if (!path) {
		console.error('getEntriesFromDirectoryAsync error: Path must not be empty');
		return Promise.reject(new Error('Path must not be empty'));
	}

	return await fs.promises.readdir(path);
}

export function getFileEntriesFromDirectory(fileList: string[], directory: string): FileEntry[] {
	for (let i = 0; i < fileList.length; i++) {
		const file = fileList[i];
		const fileEntry = new FileEntry();
		fileEntry.setName = basename(file, extname(file));
		fileEntry.setPath = resolve(directory, file);
		_directoryFileEntires.push(fileEntry);
	}
	return _directoryFileEntires;
}

export async function getFileInfoAsync(path: string): Promise<FileInfo> {
	const extension = extname(path);
	const _fileInfo = new FileInfo();

	if (!extension) {
		const sc = (await setFolderValuesAsync(path)) as ShortCut;
		const fileMetaData = (await getExtraFileMetaDataAsync(path)) as FileMetaData;

		_fileInfo.setIconPath = changeFolderIcon(sc.geFileName, sc.getIconPath);
		_fileInfo.setCurrentPath = path;
		_fileInfo.setFileType = sc.getFileType;
		_fileInfo.setFileName = sc.geFileName;
		_fileInfo.setOpensWith = sc.getOpensWith;
		_fileInfo.setIsFile = false;
		_fileInfo.setDateModified = fileMetaData.getModifiedDate;
		_fileInfo.setSize = fileMetaData.getSize;
		_fileInfo.setMode = fileMetaData.getMode;
		return _fileInfo;
	}

	const fileMetaData = (await getExtraFileMetaDataAsync(path)) as FileMetaData;

	if (extension == '.url') {
		const sc = (await getShortCutFromURLAsync(path)) as ShortCut;
		_fileInfo.setIconPath = sc.getIconPath;
		_fileInfo.setCurrentPath = path;
		_fileInfo.setContentPath = sc.getContentPath;
		_fileInfo.setFileType = sc.getFileType;
		_fileInfo.setFileName = basename(path, extname(path));
		_fileInfo.setOpensWith = sc.getOpensWith;
		_fileInfo.setDateModified = fileMetaData.getModifiedDate;
		_fileInfo.setSize = fileMetaData.getSize;
		_fileInfo.setMode = fileMetaData.getMode;
	} else if (_consts.IMAGE_FILE_EXTENSIONS.includes(extension)) {
		const sc = await getShortCutFromB64DataUrlAsync(path, 'image');
		_fileInfo.setIconPath = sc.getIconPath;
		_fileInfo.setCurrentPath = path;
		_fileInfo.setContentPath = sc.getContentPath;
		_fileInfo.setFileType = extension;
		_fileInfo.setFileName = sc.geFileName;
		_fileInfo.setOpensWith = 'photoviewer';
		_fileInfo.setDateModified = fileMetaData.getModifiedDate;
		_fileInfo.setSize = fileMetaData.getSize;
		_fileInfo.setMode = fileMetaData.getMode;
	} else if (_consts.VIDEO_FILE_EXTENSIONS.includes(extension)) {
		const sc = await getShortCutFromB64DataUrlAsync(path, 'video');
		_fileInfo.setIconPath = '/osdrive/icons/video_file.ico';
		_fileInfo.setCurrentPath = path;
		_fileInfo.setContentPath = sc.getContentPath;
		_fileInfo.setFileType = extension;
		_fileInfo.setFileName = sc.geFileName;
		_fileInfo.setOpensWith = 'videoplayer';
		_fileInfo.setDateModified = fileMetaData.getModifiedDate;
		_fileInfo.setSize = fileMetaData.getSize;
		_fileInfo.setMode = fileMetaData.getMode;
	} else if (_consts.AUDIO_FILE_EXTENSIONS.includes(extension)) {
		const sc = await getShortCutFromB64DataUrlAsync(path, 'audio');
		_fileInfo.setIconPath = '/osdrive/icons/music_file.ico';
		_fileInfo.setCurrentPath = path;
		_fileInfo.setContentPath = sc.getContentPath;
		_fileInfo.setFileType = extension;
		_fileInfo.setFileName = sc.geFileName;
		_fileInfo.setOpensWith = 'audioplayer';
		_fileInfo.setDateModified = fileMetaData.getModifiedDate;
		_fileInfo.setSize = fileMetaData.getSize;
		_fileInfo.setMode = fileMetaData.getMode;
	} else if (extension == '.txt' || extension == '.properties') {
		_fileInfo.setIconPath = '/osdrive/icons/file.ico';
		_fileInfo.setCurrentPath = path;
		_fileInfo.setFileType = extname(path);
		_fileInfo.setFileName = basename(path, extname(path));
		_fileInfo.setOpensWith = 'texteditor';
		_fileInfo.setDateModified = fileMetaData.getModifiedDate;
		_fileInfo.setSize = fileMetaData.getSize;
		_fileInfo.setMode = fileMetaData.getMode;
	} else {
		_fileInfo.setIconPath = '/osdrive/icons/unknown.ico';
		_fileInfo.setCurrentPath = path;
		_fileInfo.setFileName = basename(path, extname(path));
		_fileInfo.setDateModified = fileMetaData.getModifiedDate;
		_fileInfo.setSize = fileMetaData.getSize;
		_fileInfo.setMode = fileMetaData.getMode;
	}

	return _fileInfo;
}

export async function getShortCutFromB64DataUrlAsync(path: string, contentType: string): Promise<ShortCut> {
	const contents = await fs.promises.readFile(path);

	const stringData = contents.toString('utf-8');
	if (isUtf8Encoded(stringData)) {
		if (stringData.substring(0, 10) == 'data:image' || stringData.substring(0, 10) == 'data:video' || stringData.substring(0, 10) == 'data:audio') {
			// Extract Base64-encoded string from Data URL
			const base64Data = contents.toString().split(',')[1];
			const encoding: BufferEncoding = 'base64';
			const cntntData = Buffer.from(base64Data, encoding);
			const fileUrl = bufferToUrl(cntntData);

			if (stringData.substring(0, 10) == 'data:image') return new ShortCut(fileUrl, basename(path, extname(path)), '', fileUrl, '');
			else return new ShortCut('', basename(path, extname(path)), '', fileUrl, '');
		} else {
			const fileUrl = bufferToUrl2(contents);
			if (contentType === 'image') return new ShortCut(fileUrl, basename(path, extname(path)), '', fileUrl, '');
			else return new ShortCut('', basename(path, extname(path)), '', fileUrl, '');
		}
	}

	return new ShortCut('', basename(path, extname(path)), '', bufferToUrl2(contents), '');
}

export async function getShortCutFromURLAsync(path: string): Promise<ShortCut> {
	const contents = await fs.promises.readFile(path);

	const stage = contents ? contents.toString() : Buffer.from('').toString();
	const shortCut = (ini.parse(stage) as unknown) || { InternetShortcut: { FileName: '', IconPath: '', FileType: '', ContentPath: '', OpensWith: '' } };
	if (typeof shortCut === 'object') {
		const iSCut = (shortCut as { InternetShortcut: unknown })?.['InternetShortcut'];
		const fileName = (iSCut as { FileName: unknown })?.['FileName'] as string;
		const iconPath = (iSCut as { IconPath: unknown })?.['IconPath'] as string;
		const fileType = (iSCut as { FileType: unknown })?.['FileType'] as string;
		const contentPath = (iSCut as { ContentPath: unknown })?.['ContentPath'] as string;
		const opensWith = (iSCut as { OpensWith: unknown })?.['OpensWith'] as string;
		return new ShortCut(iconPath, fileName, fileType, contentPath, opensWith);
	}

	return new ShortCut('', '', '', '', '');
}

export function resetDirectoryFiles() {
	_directoryFileEntires = [];
}

export async function setFolderValuesAsync(path: string): Promise<ShortCut> {
	const exists = await fs.promises.exists(path);

	if (exists) {
		const stats = await fs.promises.stat(path);
		const isDirectory = stats?.isDirectory();
		const iconFile = `/osdrive/icons/${isDirectory ? 'folder.ico' : 'unknown.ico'}`;
		const fileType = 'folder';
		const opensWith = 'fileexplorer';
		return new ShortCut(iconFile, basename(path, extname(path)), fileType, basename(path, extname(path)), opensWith);
	}

	return new ShortCut('', '', '', '', '');
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

export function addEventOriginator(eventOrig: string): void {
	_eventOriginator = eventOrig;
}

export function getEventOrginator(): string {
	return _eventOriginator;
}

export function removeEventOriginator(): void {
	_eventOriginator = '';
}
