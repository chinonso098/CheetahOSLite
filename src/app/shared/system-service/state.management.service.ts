import {Injectable } from "@angular/core";
import { AppState, BaseState, WindowState } from "src/app/system-files/state/state.interface";
import { StateType } from "src/app/system-files/state/state.type";
import { SessionManagmentService } from "./session.management.service";
@Injectable({
    providedIn: 'root'
})

export class StateManagmentService{

    static instance: StateManagmentService;
    private _appStateManagmentService:Map<string, unknown>;  
    private _sessionManagmentService: SessionManagmentService 
    
    constructor(){
        this._appStateManagmentService = new Map<string, unknown>();
        StateManagmentService.instance = this; //I added this to access the service from a class, not component
        this._sessionManagmentService = SessionManagmentService.instance;
    }

    /**
     * 
     * @param uid 
     * @param stateData 
     * @param type 
     * 
     * addState perform the dual role of adding a new entry or updating an existing entry
     */
    addState(uid:string, stateData:unknown, type?:StateType):void{

        //console.log(`uid:${uid} type:${type}`);

        if(type !== undefined){
            
            if(this._appStateManagmentService.has(uid)){
                const currStateData = this._appStateManagmentService.get(uid) as BaseState[];
                if(type == StateType.App){
                    currStateData[StateType.App] = stateData as AppState;
                }else{
                    currStateData[StateType.Window] = stateData as WindowState;
                }
                this._appStateManagmentService.set(uid,currStateData);
                this._sessionManagmentService.addSession(uid, currStateData);
            }else{
                const appState:AppState={pid:0, app_data:'', app_name:'', unique_id:''}
                const windowState:WindowState={app_name:'', pid:0, x_axis:0, y_axis:0, height:0, width:0, z_index:0, is_visible:true}
                let state:BaseState[] = [];
    
                if(type == StateType.App){
                    state = [stateData as AppState, windowState];
                }else{
                    state= [appState, stateData as WindowState];
                }
    
                this._appStateManagmentService.set(uid,state);
                this._sessionManagmentService.addSession(uid, state);
            }
        }else{
            this._appStateManagmentService.set(uid,stateData)
        }
    }

    /**
     * 
     * @param uid 
     * @param type 
     * @returns 
     * 
     * returns exisiting state data.
     * if a type value is passed, the it will return either a Window or App State
     */
    getState(uid:string, type?:StateType):unknown{
        
        if(type !== undefined){
            const stateData = this._appStateManagmentService.get(uid) as BaseState[];

            if(stateData !== undefined){
                if(type == StateType.App)
                    return stateData[StateType.App];
                else
                    return stateData[StateType.Window];
            }
            return stateData
        }else{
            const stateData = this._appStateManagmentService.get(uid);
            return stateData;
        }
    }

    /**
     * 
     * @param uid 
     * @returns 
     * return a true/false value when checking for a state
     */
    hasState(uid:string):boolean{
        return this._appStateManagmentService.has(uid) ? true : false;
    }

    /**
     * 
     * @param uid 
     * remove an existing state
     */
    removeState(uid:string): void{
       if(this._appStateManagmentService.has(uid))
            this._appStateManagmentService.delete(uid)
    }

    getKeys():string[]{
        const keys:string[] = [];

        for(const key of this._appStateManagmentService.keys()){
            keys.push(key)
        }
        return keys;
    }

}