export class TerminalCommand {
    private _command: string;
    private _responseCode:number;
    private _commandOutput: string;

    constructor(cmd:string, respCode = 0, cmdOutput:string ){
        this._command = cmd;
        this._responseCode = respCode;
        this._commandOutput = cmdOutput;
    }

    get getCommand(){
        return this._command;
    }
    set setCommand(cmd:string){
         this._command = cmd;
    }

    get getResponseCode(){
        return this._responseCode;
    }
    set setResponseCode(respCode:number){
        this._responseCode= respCode
    }

    get getCommandOutput(){
        return this._commandOutput;
    }
    set setCommandOutput(cmdOutput:string){
        this._commandOutput = cmdOutput;
    }
  }