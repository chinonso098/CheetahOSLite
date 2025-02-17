import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProcessIDService } from 'src/app/shared/system-service/process.id.service';
import { RunningProcessService } from 'src/app/shared/system-service/running.process.service';
import { BaseComponent } from 'src/app/system-base/base/base.component';
import { ComponentType } from 'src/app/system-files/component.types';
import { Process } from 'src/app/system-files/process';
import { TerminalCommand } from './model/terminal.command';
import { TerminalCommands } from './terminal.commands';

@Component({
  selector: 'cos-terminal',
  templateUrl: './terminal.component.html',
  styleUrls: ['./terminal.component.css'],
  standalone: false,
})
export class TerminalComponent implements BaseComponent, OnInit, AfterViewInit, OnDestroy{

  @ViewChild('terminalCntnr', {static: true}) terminalCntnr!: ElementRef;
  @ViewChild('terminalOutputCntnr', {static: true}) terminalOutputCntnr!: ElementRef;
  @ViewChild('terminalHistoryOutput', {static: true}) terminalHistoryOutput!: ElementRef;

  private _processIdService:ProcessIDService;
  private _runningProcessService:RunningProcessService;
  private _maximizeWindowSub!: Subscription;
  private _minimizeWindowSub!: Subscription;
  private _formBuilder;
  private _terminaCommandsImpl!:TerminalCommands;

  private versionNum = '1.0.4';

  Success = 1;
  Fail = 2;
  Warning = 3;
  Options = 4;

  isBannerVisible = true;
  isWelcomeVisible = true;

  banner = '';
  welcomeMessage = "Type 'help', or 'help -verbose' to view a list of available commands.";
  terminalPrompt = ">";
  commandHistory:TerminalCommand[] = [];
  echoCommands:string[] = ["close", "curl","date", "echo", "help", "hostname", "list", "open", "version", "whoami", "weather","pwd"];
  utilityCommands:string[] = ["all", "cat", "cd", "clear", "cp", "dir", "download","exit", "ls", "mkdir", "mv", "rm","touch"];
  fetchedDirectoryList:string[] = [];
  generatedArguments:string[] = [];
  allCommands:string[] = [];
  haveISeenThisRootArg = '';
  haveISeenThisAutoCmplt = '';

  terminalForm!: FormGroup;
  numCntr = 0;
  traversalDepth = 0;

  hasWindow = true;
  icon = '/osdrive/icons/terminal_48.png';
  name = 'terminal';
  processId = 0;
  type = ComponentType.System;
  displayName = 'Terminal';

  constructor( processIdService:ProcessIDService,runningProcessService:RunningProcessService, formBuilder:FormBuilder) { 
    this._processIdService = processIdService;
    this._runningProcessService = runningProcessService;
    this._formBuilder = formBuilder;
    this._terminaCommandsImpl = new TerminalCommands();

    this.processId = this._processIdService.getNewProcessId()
    this._runningProcessService.addProcess(this.getComponentDetail()); 
    this._maximizeWindowSub = this._runningProcessService.maximizeWindowNotify.subscribe(() =>{this.maximizeWindow()})
    this._minimizeWindowSub = this._runningProcessService.minimizeWindowNotify.subscribe((p) =>{this.minimizeWindow(p)})
  }

  ngOnInit():void{
    this.terminalForm = this._formBuilder.nonNullable.group({
      terminalCmd: '',
    });

    this.banner = this.getTerminalBanner();
    this.allCommands = [...this.echoCommands, ...this.utilityCommands];
  }

  ngAfterViewInit():void{
    this.setTerminalWindowToFocus(this.processId); 
    this.populateWelecomeMessageField();
  }
  
  ngOnDestroy():void{
    this._maximizeWindowSub?.unsubscribe();
    this._minimizeWindowSub?.unsubscribe();
  }

  captureComponentImg():void{ }

  getYear():number {
    return new Date().getFullYear();
  }
  
  getTerminalBanner():string{
    const banner = `Simple Terminal, CheetahOS [Version ${this.versionNum}] \u00A9 ${this.getYear()}`
    return banner;
  }

  populateWelecomeMessageField():void{}

  onKeyDownOnWindow(evt:KeyboardEvent):void{
    this.focusOnInput();
    if (evt.key === "Tab") {
      // Prevent tab from moving focus
      evt.preventDefault();
    }
  }

  focusOnInput():void{
    const cmdTxtBoxElm= document.getElementById('cmdTxtBox') as HTMLInputElement;
    if(cmdTxtBoxElm){
      cmdTxtBoxElm?.focus();
    }
  }

  async onKeyDoublePressed(evt: KeyboardEvent): Promise<void> {
    console.log(`${evt.key} Key pressed  rapidly.`);
  }

  async onKeyDownInInputBox(evt:KeyboardEvent):Promise<void>{
   
    if(evt.key == "Enter"){
      //this.isInLoopState = false;
      this.numCntr = 0;

      const cmdInput = this.terminalForm.value.terminalCmd as string;
      const terminalCommand = new TerminalCommand(cmdInput, 0, '');

      if(cmdInput !== ''){
        this.processCommand(terminalCommand, "Enter");
        this.commandHistory.push(terminalCommand);
        this.terminalForm.reset();
      }
      evt.preventDefault();
    }
  }

  isInAllCommands(arg: string): boolean {
    if(this.allCommands.includes(arg))
      return true;
    else
    return  false
  }

  isValidCommand(arg: string): boolean{
    return this.isInAllCommands(arg)
  }

  async processCommand(terminalCmd:TerminalCommand, key=""):Promise<void>{
    const cmdStringArr = terminalCmd.getCommand.split(" ");
    const rootCmd = cmdStringArr[0].toLowerCase();
    if(this.isValidCommand(rootCmd)){

      if(rootCmd == "pwd"){
        const result = this._terminaCommandsImpl.pwd();
        terminalCmd.setResponseCode = this.Success;
        terminalCmd.setCommandOutput = result;
      } 

      if(rootCmd == "ls"){
        const str = 'string';
        const strArr = 'string[]';
        const result = await this._terminaCommandsImpl.ls(cmdStringArr[1]);
        terminalCmd.setResponseCode = this.Success;


        if(result.type === str){
          terminalCmd.setCommandOutput = result.result;
        }
        else if(result.type === strArr){
          console.log('ls result:', result)
          terminalCmd.setCommandOutput = result.result.join(' ');
          this.fetchedDirectoryList = [];
          this.fetchedDirectoryList = [...result.result];
        }
      } 


      if (rootCmd == "cp"){
        const source = cmdStringArr[1];
        const destination = cmdStringArr[2];
      
        const result = await this._terminaCommandsImpl.cp(source, destination);
        terminalCmd.setResponseCode = this.Success;
        terminalCmd.setCommandOutput = result;
      }
      
    }else{
      terminalCmd.setResponseCode = this.Fail;
      terminalCmd.setCommandOutput = `${terminalCmd.getCommand}: command not found. Type 'help', or 'help -verbose' to view a list of available commands.`;
    }
  }

  /***
   * arg0: what is being searched for
   * arg1: Where x is being search in
   */
  getAutoCompelete(arg0:string, arg1:string[]): string[]{
    // eslint-disable-next-line prefer-const
    let matchingCommand =  arg1.filter((x) => x.startsWith(arg0.trim()));
    return (matchingCommand.length > 0) ? matchingCommand : [];
  }

  maximizeWindow():void{
  }

  minimizeWindow(arg:number[]):void{
  }

  setTerminalWindowToFocus(pid:number):void{
    this._runningProcessService.focusOnCurrentProcessNotify.next(pid);
  }

  private getComponentDetail():Process{
    return new Process(this.processId, this.name, this.icon, this.hasWindow, this.type)
  }
}
