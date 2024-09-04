import { TerminalCommand } from "./model/terminal.command";
import { AppDirectory } from "src/app/system-files/app.directory";
import { TriggerProcessService } from "src/app/shared/system-service/trigger.process.service";
import { FileInfo } from "src/app/system-files/fileinfo";
import { RunningProcessService } from "src/app/shared/system-service/running.process.service";
import { StateManagmentService } from "src/app/shared/system-service/state.management.service";
import {extname, basename, resolve, dirname} from 'path';
import { FileService } from "src/app/shared/system-service/file.service";
import { FileEntry } from 'src/app/system-files/fileentry';


export interface OctalRepresentation {
    symbolic:string;
    binary: number;
    permission: string;
}

export class TerminalCommands{
    private _fileService:FileService;
    private _directoryFilesEntries!:FileEntry[];
    
    private  permissionChart!:Map<number, OctalRepresentation>;
    private files:FileInfo[] = [];
    private currentDirectoryPath = '/';
    private fallBackDirPath = '';

    constructor() { 
        this._fileService = FileService.instace;
        this.permissionChart = new Map<number, OctalRepresentation>();
        this.genPermissionsRepresentation();
    }

    help(arg0:string[], arg1:string[],arg2:string):string{
        return '';
    }

    clear(arg:TerminalCommand[]):void{
        arg = [];
    }

    addspaces(arg:string, maxSpace = 21):string{
        const maxSpaceInput = maxSpace;
        const argLen = arg.length;
        const diff = maxSpaceInput - argLen;
        const strArr = arg.split("");
        let counter = 0;

        while(counter < diff){
            strArr.push(" ");
            //strArr.unshift(" ");
            counter++;
        }
        return strArr.join("");
    }

    pwd():string{
        return this.currentDirectoryPath;
    }

    genPermissionsRepresentation():void{
        const rwx:OctalRepresentation ={symbolic:'rwx', binary:111, permission:'Read + Write + Execute'};
        const rw_:OctalRepresentation ={symbolic:'rw-', binary:110, permission:'Read + Write'};
        const r_w:OctalRepresentation ={symbolic:'r-x', binary:101, permission:'Read + Execute'};
        const r__:OctalRepresentation ={symbolic:'r--', binary:100, permission:'Read'};
        const _wx:OctalRepresentation ={symbolic:'-wx', binary:0b11, permission:'Write + Execute'};
        const _w_:OctalRepresentation ={symbolic:'-w-', binary:0b10, permission:'Write'};
        const __x:OctalRepresentation ={symbolic:'--x', binary:0b01, permission:'Execute'};
        const ___:OctalRepresentation ={symbolic:'---', binary:0b00, permission:'None'};

        this.permissionChart.set(7, rwx);
        this.permissionChart.set(6, rw_);
        this.permissionChart.set(5, r_w);
        this.permissionChart.set(4, r__);
        this.permissionChart.set(3, _wx);
        this.permissionChart.set(2, _w_);
        this.permissionChart.set(1, __x);
        this.permissionChart.set(0, ___);
    }

    getPermission(arg0:string):string{
        let result = '';
        const argSplit = arg0.split('');
        argSplit.shift();

        argSplit.forEach(x => {
            const permission = this.permissionChart.get(Number(x));
            result += permission?.symbolic;
        });

        return result;
    }

    async ls(arg0:string):Promise<{type: string;  result: any;}>{

        const result = await this.loadFilesInfoAsync(this.currentDirectoryPath).then(()=>{

            if(arg0 == undefined || arg0 == ''){
                const onlyFileNames:string[] = [];
                this.files.forEach(file => {
                    onlyFileNames.push(file.getFileName);
                });
                return {type:'string[]', result:onlyFileNames};
            }

            const lsOptions:string[] = ['-l', '-r', '-t', '-lr', '-rl', '-lt', '-tl', '-lrt', '-ltr', '-rtl', '-rlt', '-tlr', '-trl'];
            if(lsOptions.includes(arg0)) {
                
                const splitOptions = arg0.replace('-','').split('').sort().reverse();
                console.log('splitOptions:', splitOptions);

                const result:string[] = [];

                splitOptions.forEach(i => {
                    // sort by time
                    if( i === 't'){
                       this.files = this.files.sort((objA, objB) => objB.getDateModified.getTime() -  objA.getDateModified.getTime());
                    }else if( i  === 'r'){ // reverse the order
                        this.files.reverse();
                    }else{ // present in list format
                        this.files.forEach(file => {
                            const strPermission =this.getPermission(file.getMode);
                            const fileInfo = `
${(file.getIsFile)? '-':'d'}${this.addspaces(strPermission,10)} ${this.addspaces('Terminal',8)} ${this.addspaces('staff', 6)} ${this.addspaces(String(file.getSize),6)}  ${this.addspaces(file.getDateTimeModifiedUS,12)} ${this.addspaces(file.getFileName,11)}
                        `
                            result.push(fileInfo);
                        });
                    }
                });
                return {type:'string', result:result.join('')}; // Join with empty string to avoid commas
            }
            return {type:'', result: ''};
        })
        return result;
    }


    async cp(sourceArg:string, destinationArg:string):Promise<string>{

        console.log(`copy-source ${sourceArg}`);
        console.log(`copy-destination ${sourceArg}`);
        //console.log(`destination ${destinationArg}`);

        const folderQueue:string[] = []

        const isDirectory = await this._fileService.checkIfDirectory(sourceArg);
        if(isDirectory){
            folderQueue.push(sourceArg);
                const result = await this._fileService.copyHandler(sourceArg, destinationArg);
                if(result){
                    this.sendDirectoryUpdateNotification(destinationArg);
            }
        }else{
            const result = await this._fileService.copyHandler(sourceArg, destinationArg);
            if(result){
                this.sendDirectoryUpdateNotification(destinationArg);
            }
        }        
        return '';
    }

    private sendDirectoryUpdateNotification(arg0:string):void{
        console.log(`arg0: ${arg0}`);
        if(arg0.includes('/Desktop')){
            this._fileService.addEventOriginator('filemanager');
        }else{
            this._fileService.addEventOriginator('fileexplorer');
        }
        this._fileService.dirFilesUpdateNotify.next();
    }

    private async loadFilesInfoAsync(directory:string):Promise<void>{
        this.files = [];
        this._fileService.resetDirectoryFiles();
        const directoryEntries  = await this._fileService.getEntriesFromDirectoryAsync(directory);
        this._directoryFilesEntries = this._fileService.getFileEntriesFromDirectory(directoryEntries,directory);
    
        for(let i = 0; i < directoryEntries.length; i++){
          const fileEntry = this._directoryFilesEntries[i];
          const fileInfo = await this._fileService.getFileInfoAsync(fileEntry.getPath);
    
          this.files.push(fileInfo)
        }
    }
}