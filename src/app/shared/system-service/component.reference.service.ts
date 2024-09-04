import { ComponentRef, Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})

export class ComponentReferenceService{

    private _componentsReferences:Map<number, ComponentRef<unknown>>; 
    
    constructor(){
        this._componentsReferences = new Map<number, ComponentRef<unknown>>();
    }

    addComponentReference(processId:number, componentToAdd:ComponentRef<unknown>):void{
        this._componentsReferences.set(processId,componentToAdd)
    }

    getComponentReference(processId:number):ComponentRef<unknown>{
        const componentRef = this._componentsReferences.get(processId);
   
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return componentRef!;
    }

    removeComponentReference(processId:number): void{
        this._componentsReferences.delete(processId)
    }

}