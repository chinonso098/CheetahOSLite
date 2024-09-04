import { Injectable } from "@angular/core";
import { FileInfo } from "src/app/system-files/fileinfo";
import { ShortCut } from "src/app/system-files/shortcut";
import { extname, basename, resolve, join } from 'path';
import { Constants } from "src/app/system-files/constants";
import { FileEntry } from 'src/app/system-files/fileentry';
import { FileMetaData } from "src/app/system-files/file.metadata";

import { Subject } from "rxjs";
import { Buffer } from 'buffer';
import ini  from 'ini';

import OSFileSystemIndex from '../../../../index.json';
import {configure, fs, Overlay, Fetch} from '@zenfs/core';
import {IndexedDB} from '@zenfs/dom';
import { IndexData } from "@zenfs/core/backends/index/index.js";

@Injectable({
    providedIn: 'root'
})

export class FileService{

    static instace:FileService;
    private _fileInfo!:FileInfo;
    private _consts:Constants = new Constants();
    private _isFileSystemInit = false;
    private _directoryFileEntires:FileEntry[]=[];
    private _eventOriginator = '';

    dirFilesReadyNotify: Subject<void> = new Subject<void>();
    dirFilesUpdateNotify: Subject<void> = new Subject<void>();

    constructor(){ 
        FileService.instace = this;
    }

    private async initZenFSAsync(): Promise<void> {
		if (this._isFileSystemInit) {
			return;
		}
		await configure<typeof Overlay>({
			mounts: {
				'/': {
					backend: Overlay,
					readable: { backend: Fetch, index: OSFileSystemIndex as IndexData, baseUrl: 'osdrive' },
					writable: { backend: IndexedDB, storeName: 'fs-cache' },
				},
			},
		});
		this._isFileSystemInit = true;
	}

    private changeFolderIcon(fileName: string, iconPath: string): string {
        const baseUrl = '/osdrive';
		const iconMaybe = `/icons/${fileName.toLocaleLowerCase()}_folder.ico`;
		return fs.existsSync(iconMaybe) ? `${baseUrl}${iconMaybe}` : iconPath;
	}

    public async checkIfDirectory(path: string): Promise<boolean> {
		const stats = await fs.promises.stat(path);
		return stats?.isDirectory();
	}

    public async checkIfExistsAsync(dirPath: string): Promise<boolean> {
		return fs.promises.exists(dirPath);
	}

    public async copyFileAsync(sourcePath: string, destinationPath: string): Promise<boolean> {
		const fileName = this.fileName(sourcePath);
		console.log(`Destination: ${destinationPath}/${fileName}`);
		await fs.promises.copyFile(sourcePath, `${destinationPath}/${fileName}`);
		return true;
	}

    public async copyHandler(sourcePathArg:string, destinationArg:string):Promise<boolean>{

        const checkIfDirResult = await this.checkIfDirectory(`${sourcePathArg}`);
        if(checkIfDirResult){
            // ignoring directories for now
        }else{
            const result = await this.copyFileAsync(`${sourcePathArg}`, `${destinationArg}`);
            if(result){
                console.log(`file:${sourcePathArg} successfully copied to destination:${destinationArg}`);
            }else{
                console.log(`file:${sourcePathArg} failed to copy to destination:${destinationArg}`)
                return false
            }
        }

        return true
    }

    public async getExtraFileMetaDataAsync(path: string) {
		const stats = await fs.promises.stat(path);
		return new FileMetaData(stats?.ctime, stats?.mtime, stats?.size, stats?.mode);
	}

    public async getEntriesFromDirectoryAsync(path: string): Promise<string[]> {
		if (!path) {
			console.error('getEntriesFromDirectoryAsync error: Path must not be empty');
			return Promise.reject(new Error('Path must not be empty'));
		}

		/** This is where ZenFS is initialized */
		await this.initZenFSAsync();
		return await fs.promises.readdir(path);

	}

    public  getFileEntriesFromDirectory(fileList:string[], directory:string):FileEntry[]{
        for(let i = 0; i < fileList.length; i++){
            const  file = fileList[i];
            const fileEntry = new FileEntry();
            fileEntry.setName = basename(file, extname(file));
            fileEntry.setPath = resolve(directory, file);
            this._directoryFileEntires.push(fileEntry);
        }
        return this._directoryFileEntires;
    }


	private fileName(path: string): string {
		return `${basename(path, extname(path))}${extname(path)}`;
	}

    public async getFileInfoAsync(path:string):Promise<FileInfo>{
        const extension = extname(path);
        this._fileInfo = new FileInfo();

        if(!extension){
            const sc = await this.setFolderValuesAsync(path) as ShortCut;
            const fileMetaData = await this.getExtraFileMetaDataAsync(path) as FileMetaData;

            this._fileInfo.setIconPath = this.changeFolderIcon(sc.geFileName,sc.getIconPath);
            this._fileInfo.setCurrentPath = path;
            this._fileInfo.setFileType = sc.getFileType;
            this._fileInfo.setFileName = sc.geFileName;
            this._fileInfo.setOpensWith = sc.getOpensWith;
            this._fileInfo.setIsFile = false;
            this._fileInfo.setDateModified = fileMetaData.getModifiedDate;
            this._fileInfo.setSize = fileMetaData.getSize;
            this._fileInfo.setMode = fileMetaData.getMode;
        }
        else{

            const fileMetaData = await this.getExtraFileMetaDataAsync(path) as FileMetaData;

            if(extension == '.url'){
                const sc = await this.getShortCutFromURLAsync(path) as ShortCut;
                this._fileInfo.setIconPath = sc.getIconPath;
                this._fileInfo.setCurrentPath = path;
                this._fileInfo.setContentPath = sc.getContentPath;
                this._fileInfo.setFileType = sc.getFileType;
                this._fileInfo.setFileName = basename(path, extname(path));
                this._fileInfo.setOpensWith = sc.getOpensWith;
                this._fileInfo.setDateModified = fileMetaData.getModifiedDate;
                this._fileInfo.setSize = fileMetaData.getSize;
                this._fileInfo.setMode = fileMetaData.getMode;
            }
             else if(this._consts.IMAGE_FILE_EXTENSIONS.includes(extension)){    
                const sc = await this.getShortCutFromB64DataUrlAsync(path,'image');
                this._fileInfo.setIconPath = sc.getIconPath;
                this._fileInfo.setCurrentPath = path;
                this._fileInfo.setContentPath = sc.getContentPath;
                this._fileInfo.setFileType = extension;
                this._fileInfo.setFileName = sc.geFileName;
                this._fileInfo.setOpensWith = 'photoviewer';
                this._fileInfo.setDateModified = fileMetaData.getModifiedDate;
                this._fileInfo.setSize = fileMetaData.getSize;
                this._fileInfo.setMode = fileMetaData.getMode;
            }
            else if(this._consts.VIDEO_FILE_EXTENSIONS.includes(extension)){    
                const sc = await this.getShortCutFromB64DataUrlAsync(path, 'video');
                this._fileInfo.setIconPath = '/osdrive/icons/video_file.ico';
                this._fileInfo.setCurrentPath = path;
                this._fileInfo.setContentPath = sc.getContentPath;
                this._fileInfo.setFileType = extension;
                this._fileInfo.setFileName = sc.geFileName;
                this._fileInfo.setOpensWith = 'videoplayer';
                this._fileInfo.setDateModified = fileMetaData.getModifiedDate;
                this._fileInfo.setSize = fileMetaData.getSize;
                this._fileInfo.setMode = fileMetaData.getMode;
            }else if(this._consts.AUDIO_FILE_EXTENSIONS.includes(extension)){    
                const sc = await this.getShortCutFromB64DataUrlAsync(path, 'audio');
                this._fileInfo.setIconPath = '/osdrive/icons/music_file.ico';
                this._fileInfo.setCurrentPath = path;
                this._fileInfo.setContentPath = sc.getContentPath;
                this._fileInfo.setFileType = extension;
                this._fileInfo.setFileName = sc.geFileName;
                this._fileInfo.setOpensWith = 'audioplayer';
                this._fileInfo.setDateModified = fileMetaData.getModifiedDate;
                this._fileInfo.setSize = fileMetaData.getSize;
                this._fileInfo.setMode = fileMetaData.getMode;
            }else if(extension == '.txt' || extension == '.properties'){
                this._fileInfo.setIconPath = '/osdrive/icons/file.ico';
                this._fileInfo.setCurrentPath = path;
                this._fileInfo.setFileType = extname(path);
                this._fileInfo.setFileName = basename(path, extname(path));
                this._fileInfo.setOpensWith = 'texteditor';
                this._fileInfo.setDateModified = fileMetaData.getModifiedDate;
                this._fileInfo.setSize = fileMetaData.getSize;
                this._fileInfo.setMode = fileMetaData.getMode;
            }
             else{
                this._fileInfo.setIconPath='/osdrive/icons/unknown.ico';
                this._fileInfo.setCurrentPath = path;
                this._fileInfo.setFileName = basename(path, extname(path));
                this._fileInfo.setDateModified = fileMetaData.getModifiedDate;
                this._fileInfo.setSize = fileMetaData.getSize;
                this._fileInfo.setMode = fileMetaData.getMode;
            }
        }
        return this._fileInfo;
    }

    public async getShortCutFromB64DataUrlAsync(path: string, contentType: string): Promise<ShortCut> {

        const contents = await fs.promises.readFile(path);

        const stringData = contents.toString('utf-8');
        if (this.isUtf8Encoded(stringData)) {
            if (stringData.substring(0, 10) == 'data:image' || stringData.substring(0, 10) == 'data:video' || stringData.substring(0, 10) == 'data:audio') {
                // Extract Base64-encoded string from Data URL
                const base64Data = contents.toString().split(',')[1];
                const encoding: BufferEncoding = 'base64';
                const cntntData = Buffer.from(base64Data, encoding);
                const fileUrl = this.bufferToUrl(cntntData);

                if (stringData.substring(0, 10) == 'data:image') 
                    return new ShortCut(fileUrl, basename(path, extname(path)), '', fileUrl, '');
                else 
                    return new ShortCut('', basename(path, extname(path)), '', fileUrl, '');
            } else {
                const fileUrl = this.bufferToUrl2(contents);
                if (contentType === 'image') 
                    return new ShortCut(fileUrl, basename(path, extname(path)), '', fileUrl, '');
                else 
                    return new ShortCut('', basename(path, extname(path)), '', fileUrl, '');
            }
        }  
        
        return new ShortCut('', basename(path, extname(path)), '', this.bufferToUrl2(contents), '');
	}

    public async getShortCutFromURLAsync(path:string):Promise<ShortCut>{

        const contents = await fs.promises.readFile(path);

        const stage = contents? contents.toString(): Buffer.from('').toString();
        const shortCut = ini.parse(stage) as unknown || {InternetShortcut:{ FileName:'', IconPath:'', FileType:'',ContentPath:'', OpensWith:''}};
        if (typeof shortCut === 'object') {
            const iSCut = (shortCut as {InternetShortcut:unknown})?.['InternetShortcut'];
            const  fileName=  (iSCut as {FileName:unknown})?.['FileName'] as string;
            const iconPath = (iSCut as {IconPath:unknown})?.['IconPath'] as string;
            const fileType = (iSCut as {FileType:unknown})?.['FileType'] as string;
            const contentPath = (iSCut as {ContentPath:unknown})?.['ContentPath'] as string;
            const opensWith = (iSCut as {OpensWith:unknown})?.['OpensWith'] as string;
            return new ShortCut(iconPath,fileName,fileType,contentPath,opensWith);
        }

        return new ShortCut('','','','','');
    }

    public resetDirectoryFiles(){
        this._directoryFileEntires=[]
    }

    public async setFolderValuesAsync(path: string):Promise<ShortCut>{
        const exists = await fs.promises.exists(path);

        if(exists){
            const stats = await fs.promises.stat(path);
            const isDirectory = stats?.isDirectory();
            const iconFile = `/osdrive/icons/${isDirectory ? 'folder.ico' : 'unknown.ico'}`
            const fileType = 'folder';
            const opensWith ='fileexplorer'
            return new ShortCut(iconFile, basename(path, extname(path)),fileType,basename(path, extname(path)) ,opensWith );
        }
	
        return new ShortCut('','','','','' )
    }

    private bufferToUrl(buffer:Buffer):string{
       return URL.createObjectURL(new Blob([new Uint8Array(buffer)]));
    }

    private bufferToUrl2(arr:Uint8Array):string{
        return URL.createObjectURL(new Blob([arr]));
     }

    private isUtf8Encoded(data: string): boolean {
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

    addEventOriginator(eventOrig:string):void{
        this._eventOriginator = eventOrig;
    }

    getEventOrginator():string{
        return this._eventOriginator;
    }

    removeEventOriginator():void{
        this._eventOriginator = '';
    }
}
