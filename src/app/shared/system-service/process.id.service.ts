import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})

export class ProcessIDService{

    private _activeProcessIds: number[];
    static instance: ProcessIDService;

    constructor(){
        this._activeProcessIds = [];
        ProcessIDService.instance = this; //I added this to access the service from a class, not component
     }

    public getNewProcessId(): number{
        let pid = 0;
        pid = this.generateProcessId();

        while(this._activeProcessIds.includes(pid))
                pid = this.generateProcessId();

        this._activeProcessIds.push(pid);
        return pid;
    }

    private generateProcessId(): number{
        const min = Math.ceil(1000);
        const max = Math.floor(9999);
        return Math.floor(Math.random() * (max - min + 1)) + min; 
    }

    public removeProcessId(pid:number):void{
        
       const deleteCount = 1;
       const pidIndex = this._activeProcessIds.indexOf(pid)
       if (pidIndex !== -1) {
            this._activeProcessIds.splice(pidIndex, deleteCount);
        }
    }

    public processCount():number{
        return this._activeProcessIds.length;
    }
}