import { Injectable } from "@angular/core";

interface Script {
    name: string;
    src: string;
  }
  
interface Scripts {
    [key: string]: Script;
  }
  
@Injectable({
    providedIn: 'root'
})

export class ScriptService {

    private scripts: Scripts = {};
  
    async loadScript(name: string, src: string): Promise<void> {
      if (!this.scripts[name]) {
        this.scripts[name] = { name, src };
        return await this.loadExternalScript(this.scripts[name]);
      }
      return Promise.resolve();
    }

    async loadScripts(names:string[], srcs: string[]): Promise<void> {
        const promises: any[] = [];

        for(let i = 0; i <= names.length -1 ; i++){
            if (!this.scripts[names[i]]) {
                this.scripts[names[i]] = { name:names[i], src:srcs[i] };
                const res =  await this.loadExternalScript(this.scripts[names[i]]);
                promises.push(res) 
            }
        }
        
        return Promise.resolve();
    }
  
    private async loadExternalScript(script: Script): Promise<void> {
      return new Promise((resolve, reject) => {
        const scriptElement = document.createElement('script');
        scriptElement.type = "text/javascript";
        scriptElement.src = script.src;
        scriptElement.async = true;
        scriptElement.onload = () => {
          resolve();
        };
        scriptElement.onerror = (error: any) => {
          reject(error);
        };
        //document.body.appendChild(scriptElement);
        document.getElementsByTagName('head')[0].appendChild(scriptElement);
      });
    }
}