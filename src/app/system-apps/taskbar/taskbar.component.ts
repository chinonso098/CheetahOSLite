import { Component } from '@angular/core';
import { MenuService } from 'src/app/shared/system-service/menu.services';
import { ProcessIDService } from 'src/app/shared/system-service/process.id.service';
import { RunningProcessService } from 'src/app/shared/system-service/running.process.service';
import { ComponentType } from 'src/app/system-files/component.types';
import { Process } from 'src/app/system-files/process';

@Component({
  selector: 'cos-taskbar',
  templateUrl: './taskbar.component.html',
  styleUrls: ['./taskbar.component.css']
})
export class TaskbarComponent {

  private _processIdService:ProcessIDService;
  private _runningProcessService:RunningProcessService;
  private _menuService:MenuService;


  hasWindow = false;
  icon = 'osdrive/icons/generic-program.ico';
  name = 'taskbar';
  processId = 0;
  type = ComponentType.System
  displayName = ''

  constructor( processIdService:ProcessIDService,runningProcessService:RunningProcessService, menuService:MenuService) { 
    this._processIdService = processIdService;
    this._runningProcessService = runningProcessService;
    this._menuService = menuService;
    this.processId = this._processIdService.getNewProcessId()
    this._runningProcessService.addProcess(this.getComponentDetail());
  }

  
  hideContextMenus():void{
    this._menuService.hideContextMenus.next();
  }

  private getComponentDetail():Process{
    return new Process(this.processId, this.name, this.icon, this.hasWindow, this.type)
  }
}
