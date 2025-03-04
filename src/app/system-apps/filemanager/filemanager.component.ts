import { AfterViewInit, Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import * as files from 'src/app/shared/system-service/file.service';
import { ProcessIDService } from 'src/app/shared/system-service/process.id.service';
import { RunningProcessService } from 'src/app/shared/system-service/running.process.service';
import { ComponentType } from 'src/app/system-files/component.types';
import { BaseComponent } from 'src/app/system-base/base/base.component';
import { Process } from 'src/app/system-files/process';
import { FileEntry } from 'src/app/system-files/fileentry';
import { FileInfo } from 'src/app/system-files/fileinfo';
import { Subscription } from 'rxjs';
import { TriggerProcessService } from 'src/app/shared/system-service/trigger.process.service';
import { FileManagerService } from 'src/app/shared/system-service/file.manager.services';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MenuService } from 'src/app/shared/system-service/menu.services';

@Component({
	selector: 'cos-filemanager',
	templateUrl: './filemanager.component.html',
	styleUrls: ['./filemanager.component.css'],
	standalone: false,
})
export class FileManagerComponent implements BaseComponent, OnInit, AfterViewInit, OnDestroy {
	@ViewChild('myBounds', { static: true }) myBounds!: ElementRef;

	private _viewByNotifySub!: Subscription;
	private _sortByNotifySub!: Subscription;
	private _refreshNotifySub!: Subscription;
	private _autoArrangeIconsNotifySub!: Subscription;
	private _autoAlignIconsNotifyBySub!: Subscription;
	private _showDesktopIconNotifySub!: Subscription;
	private _dirFilesUpdatedSub!: Subscription;
	private _hideContextMenuSub!: Subscription;

	private autoAlign = true;
	private autoArrange = false;
	private currentIconName = '';
	private showDesktopIcon = true;

	private isRenameActive = false;
	private isIconInFocusDueToPriorAction = false;
	private isBtnClickEvt = false;
	private isHideCntxtMenuEvt = false;

	private selectedFile!: FileInfo;
	private selectedElementId = -1;
	private prevSelectedElementId = -1;
	private hideCntxtMenuEvtCnt = 0;
	private btnClickCnt = 0;
	private renameFileTriggerCnt = 0;

	iconCntxtMenuStyle: Record<string, unknown> = {};
	iconSizeStyle: Record<string, unknown> = {};
	btnStyle: Record<string, unknown> = {};

	showCntxtMenu = false;
	gridSize = 90; //column size of grid = 90px
	SECONDS_DELAY = 6000;
	renameForm!: FormGroup;

	hasWindow = false;
	icon = 'osdrive/icons/generic-program.ico';
	name = 'filemanager';
	processId = 0;
	type = ComponentType.System;
	displayName = '';
	directory = '/Desktop';
	files: FileInfo[] = [];

	menuData = [
		{
			icon: '',
			label: 'Open',
			action: this.onTriggerRunProcess.bind(this),
		},
		{ icon: '', label: 'Pin to Start', action: this.doNothing.bind(this) },
		{
			icon: '',
			label: 'Pin to Taskbar',
			action: this.pinIconToTaskBar.bind(this),
		},
		{ icon: '', label: 'Cut', action: this.onCut.bind(this) },
		{ icon: '', label: 'Copy', action: this.onCopy.bind(this) },
		{ icon: '', label: 'Delete', action: this.onDeleteFile.bind(this) },
		{
			icon: '',
			label: 'Rename',
			action: this.onRenameFileTxtBoxShow.bind(this),
		},
		{ icon: '', label: 'Properties', action: this.doNothing.bind(this) },
	];

	fileExplrMngrMenuOption = 'file-explorer-file-manager-menu';

	constructor(
		private processIdService: ProcessIDService,
		private runningProcessService: RunningProcessService,
		private triggerProcessService: TriggerProcessService,
		private fileManagerService: FileManagerService,
		private formBuilder: FormBuilder,
		private menuService: MenuService
	) {
		this.processId = this.processIdService.getNewProcessId();
		this.runningProcessService.addProcess(this.getComponentDetail());

		this._dirFilesUpdatedSub = files.dirFilesUpdateNotify.subscribe(() => {
			if (files.eventOriginator === this.name) {
				this.loadFiles();
				files.setEventOriginator('');
			}
		});

		this._viewByNotifySub = fileManagerService.viewByNotify.subscribe((p) => {
			this.changeIconsSize(p);
		});
		this._sortByNotifySub = fileManagerService.sortByNotify.subscribe((p) => {
			this.sortIcons(p);
		});
		this._autoArrangeIconsNotifySub = fileManagerService.autoArrangeIconsNotify.subscribe(
			(p) => {
				this.toggleAutoArrangeIcons(p);
			}
		);
		this._autoAlignIconsNotifyBySub = fileManagerService.alignIconsToGridNotify.subscribe(
			(p) => {
				this.toggleAutoAlignIconsToGrid(p);
			}
		);
		this._refreshNotifySub = fileManagerService.refreshNotify.subscribe(() => {
			this.refreshIcons();
		});
		this._showDesktopIconNotifySub = fileManagerService.showDesktopIconsNotify.subscribe(
			(p) => {
				this.toggleDesktopIcons(p);
			}
		);
		this._hideContextMenuSub = this.menuService.hideContextMenus.subscribe(() => {
			this.onHideIconContextMenu();
		});
	}

	ngOnInit(): void {
		this.renameForm = this.formBuilder.nonNullable.group({
			renameInput: '',
		});
	}

	async ngAfterViewInit(): Promise<void> {
		await this.loadFiles();
	}

	ngOnDestroy(): void {
		this._viewByNotifySub?.unsubscribe();
		this._sortByNotifySub?.unsubscribe();
		this._refreshNotifySub?.unsubscribe();
		this._autoArrangeIconsNotifySub?.unsubscribe();
		this._autoAlignIconsNotifyBySub?.unsubscribe();
		this._showDesktopIconNotifySub?.unsubscribe();
		this._dirFilesUpdatedSub?.unsubscribe();
		this._hideContextMenuSub?.unsubscribe();
	}

	onDragOver(event: DragEvent): void {
		event.stopPropagation();
		event.preventDefault();
	}

	async onDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		let droppedFiles: File[] = [];

		if (event?.dataTransfer?.files) {
			// eslint-disable-next-line no-unsafe-optional-chaining
			droppedFiles = [...event?.dataTransfer?.files];
		}
	}

	protected async loadFiles(): Promise<void> {
		this.files = await Array.fromAsync(files.directoryInfo(this.directory));
	}

	async runProcess(file: FileInfo): Promise<void> {
		console.log('filemanager-runProcess:', file);
		this.triggerProcessService.startApplication(file);
		this.btnStyleAndValuesReset();

		// console.log('what was clicked:',file.getFileName +'-----' + file.getOpensWith +'---'+ file.getCurrentPath +'----'+ file.getIcon) TBD
		// if((file.getOpensWith === 'fileexplorer' && file.getFileName !== 'fileexplorer') && file.getFileType ==='folder'){
		//     //this.directory = file.getCurrentPath;
		//    // await this.loadFiles();

		//    this._triggerProcessService.startApplication(file);
		//    this.btnStyleAndValuesReset();

		// }else{
		//     this._triggerProcessService.startApplication(file);
		//     this.btnStyleAndValuesReset();
		// }
	}

	onBtnClick(id: number): void {
		this.doBtnClickThings(id);
		this.setBtnStyle(id, true);
	}

	onTriggerRunProcess(): void {
		this.runProcess(this.selectedFile);
	}

	onShowIconContextMenu(evt: MouseEvent, file: FileInfo, id: number): void {
		const uid = `${this.name}-${this.processId}`;
		this.runningProcessService.addEventOriginator(uid);
		this.menuService.hideContextMenus.next();

		this.selectedFile = file;
		this.showCntxtMenu = !this.showCntxtMenu;

		// show IconContexMenu is still a btn click, just a different type
		this.doBtnClickThings(id);

		this.iconCntxtMenuStyle = {
			position: 'absolute',
			transform: `translate(${String(evt.clientX)}px, ${String(evt.clientY)}px)`,
			'z-index': 2,
		};

		evt.preventDefault();
	}

	doNothing(): void {
		console.log('do nothing called');
	}

	onCopy(): void {
		const action = 'copy';
		const path = this.selectedFile.currentPath;
		this.menuService.storeData.next([path, action]);
	}

	onCut(): void {
		const action = 'cut';
		const path = this.selectedFile.currentPath;
		this.menuService.storeData.next([path, action]);
	}
	pinIconToTaskBar(): void {
		this.menuService.pinToTaskBar.next(this.selectedFile);
	}

	doBtnClickThings(id: number): void {
		this.prevSelectedElementId = this.selectedElementId;
		this.selectedElementId = id;

		this.isBtnClickEvt = true;
		this.btnClickCnt++;
		this.isHideCntxtMenuEvt = false;
		this.hideCntxtMenuEvtCnt = 0;

		if (this.prevSelectedElementId != id) {
			this.removeBtnStyle(this.prevSelectedElementId);
		}
	}

	onHideIconContextMenu(caller?: string): void {
		this.showCntxtMenu = false;

		//First case - I'm clicking only on the desktop icons
		if (
			this.isBtnClickEvt &&
			this.btnClickCnt >= 1 &&
			!this.isHideCntxtMenuEvt &&
			this.hideCntxtMenuEvtCnt == 0
		) {
			if (this.isRenameActive) {
				this.isFormDirty();
			}
			if (this.isIconInFocusDueToPriorAction) {
				if (this.hideCntxtMenuEvtCnt >= 0) this.setBtnStyle(this.selectedElementId, false);

				this.isIconInFocusDueToPriorAction = false;
			}
			if (!this.isRenameActive) {
				this.isBtnClickEvt = false;
				this.btnClickCnt = 0;
			}
		} else {
			this.hideCntxtMenuEvtCnt++;
			this.isHideCntxtMenuEvt = true;
			//Second case - I was only clicking on the desktop
			if (
				this.isHideCntxtMenuEvt &&
				this.hideCntxtMenuEvtCnt >= 1 &&
				!this.isBtnClickEvt &&
				this.btnClickCnt == 0
			)
				this.btnStyleAndValuesReset();

			//Third case - I was clicking on the desktop icons, then i click on the desktop.
			//clicking on the desktop triggers a hideContextMenuEvt
			if (
				this.isBtnClickEvt &&
				this.btnClickCnt >= 1 &&
				this.isHideCntxtMenuEvt &&
				this.hideCntxtMenuEvtCnt > 1
			)
				this.btnStyleAndValuesReset();
		}

		// to prevent an endless loop of calls,
		if (caller !== undefined && caller === this.name) {
			this.menuService.hideContextMenus.next();
		}
	}

	onDragEnd(evt: any): void {
		//console.log('event type:',evt.type);
		// const rect =  this.myBounds.nativeElement.getBoundingClientRect();

		const btnTransform = window.getComputedStyle(evt);
		const matrix = new DOMMatrixReadOnly(btnTransform.transform);

		const transform = {
			translateX: matrix.m41,
			translateY: matrix.m42,
		};

		// const transX = matrix.m41;
		// const transY = matrix.m42;

		console.log(
			'TODO:FileManagerComponent, Upgrade the basic state tracking/management logic:',
			transform
		);
	}

	onDragStart(evt: any): void {
		//
	}

	onMouseEnter(id: number): void {
		this.setBtnStyle(id, true);
	}

	onMouseLeave(id: number): void {
		if (id != this.selectedElementId) {
			this.removeBtnStyle(id);
		} else if (id == this.selectedElementId && !this.isIconInFocusDueToPriorAction) {
			this.setBtnStyle(id, false);
		}
	}

	btnStyleAndValuesReset(): void {
		this.isBtnClickEvt = false;
		this.btnClickCnt = 0;
		this.removeBtnStyle(this.selectedElementId);
		this.removeBtnStyle(this.prevSelectedElementId);
		this.selectedElementId = -1;
		this.prevSelectedElementId = -1;
		this.btnClickCnt = 0;
		this.isIconInFocusDueToPriorAction = false;
	}

	removeBtnStyle(id: number): void {
		const btnElement = document.getElementById(`iconBtn${id}`) as HTMLElement;
		if (btnElement) {
			btnElement.style.backgroundColor = 'transparent';
			btnElement.style.border = 'none';
		}
	}

	setBtnStyle(id: number, isMouseHover: boolean): void {
		const btnElement = document.getElementById(`iconBtn${id}`) as HTMLElement;
		if (btnElement) {
			btnElement.style.backgroundColor = 'hsl(206deg 77% 70%/20%)';
			btnElement.style.border = '2px solid hsla(0,0%,50%,25%)';

			if (this.selectedElementId == id) {
				isMouseHover
					? (btnElement.style.backgroundColor = '#607c9c')
					: (btnElement.style.backgroundColor = 'hsl(206deg 77% 70%/20%)');
			}
		}
	}

	sortIcons(sortBy: string): void {
		if (sortBy === 'Size') {
			this.files = this.files.sort((objA, objB) => objB.size - objA.size);
		} else if (sortBy === 'Date Modified') {
			this.files = this.files.sort(
				(objA, objB) => objB.mtime.getTime() - objA.mtime.getTime()
			);
		} else if (sortBy === 'Name') {
			this.files = this.files.sort((objA, objB) => {
				return objA.name < objB.name ? -1 : 1;
			});
		} else if (sortBy === 'Item Type') {
			this.files = this.files.sort((objA, objB) => {
				return objA.fileType < objB.fileType ? -1 : 1;
			});
		}
	}

	changeIconsSize(iconSize: string): void {
		if (iconSize === 'Large Icons') {
			this.iconSizeStyle = {
				width: '45px',
				height: '45px',
			};
		}

		if (iconSize === 'Medium Icons') {
			this.iconSizeStyle = {
				width: '35px',
				height: '35px',
			};
		}

		if (iconSize === 'Small Icons') {
			this.iconSizeStyle = {
				width: '30px',
				height: '30px',
			};
		}
	}

	toggleDesktopIcons(showIcons: boolean): void {
		this.showDesktopIcon = showIcons;
		if (!this.showDesktopIcon) {
			this.btnStyle = {
				display: 'none',
			};
		} else {
			this.btnStyle = {
				display: 'block',
			};
		}
	}

	toggleAutoAlignIconsToGrid(alignIcon: boolean): void {
		this.autoAlign = alignIcon;
		if (!this.autoAlign) {
			this.gridSize = 0;
		} else {
			this.gridSize = 90;
		}
	}

	toggleAutoArrangeIcons(arrangeIcon: boolean): void {
		this.autoArrange = arrangeIcon;

		if (this.autoArrange) {
			// clear (x,y) position of icons in memory
			this.refreshIcons();
		}
	}

	async refreshIcons(): Promise<void> {
		this.isIconInFocusDueToPriorAction = false;
		await this.loadFiles();
	}

	async onDeleteFile(): Promise<void> {
		let result = false;

		if (result) {
			await this.loadFiles();
		}
	}

	onInputChange(evt: KeyboardEvent): boolean {
		const regexStr = '^[a-zA-Z0-9_.]+$';
		const res = new RegExp(regexStr).test(evt.key);
		if (res) {
			this.hideInvalidCharsToolTip();
			return res;
		} else {
			this.showInvalidCharsToolTip();

			setTimeout(() => {
				// hide after 6 secs
				this.hideInvalidCharsToolTip();
			}, this.SECONDS_DELAY);

			return res;
		}
	}

	showInvalidCharsToolTip(): void {
		// get the position of the textbox
		const toolTipID = 'invalidChars';
		const invalidCharToolTipElement = document.getElementById(toolTipID) as HTMLElement;
		const renameContainerElement = document.getElementById(
			`renameContainer${this.selectedElementId}`
		) as HTMLElement;

		const rect = renameContainerElement.getBoundingClientRect();

		if (invalidCharToolTipElement) {
			invalidCharToolTipElement.style.transform = `translate(${rect.x + 2}px, ${rect.y + 2}px)`;
			invalidCharToolTipElement.style.zIndex = '3';
			invalidCharToolTipElement.style.opacity = '1';
			invalidCharToolTipElement.style.transition = 'opacity 0.5s ease';
		}
	}

	hideInvalidCharsToolTip(): void {
		const toolTipID = 'invalidChars';
		const invalidCharToolTipElement = document.getElementById(toolTipID) as HTMLElement;

		if (invalidCharToolTipElement) {
			invalidCharToolTipElement.style.transform = `translate(${-100000}px, ${100000}px)`;
			invalidCharToolTipElement.style.zIndex = '-1';
			invalidCharToolTipElement.style.opacity = '0';
			invalidCharToolTipElement.style.transition = 'opacity 0.5s ease 1';
		}
	}

	isFormDirty(): void {
		if (this.renameForm.dirty) {
			this.onRenameFileTxtBoxDataSave();
		} else if (!this.renameForm.dirty) {
			this.renameFileTriggerCnt++;
			if (this.renameFileTriggerCnt > 1) {
				this.onRenameFileTxtBoxHide();
				this.renameFileTriggerCnt = 0;
			}
		}
	}

	onRenameFileTxtBoxShow(): void {
		this.isRenameActive = !this.isRenameActive;

		const figCapElement = document.getElementById(
			`figCap${this.selectedElementId}`
		) as HTMLElement;
		const renameContainerElement = document.getElementById(
			`renameContainer${this.selectedElementId}`
		) as HTMLElement;
		const renameTxtBoxElement = document.getElementById(
			`renameTxtBox${this.selectedElementId}`
		) as HTMLInputElement;
		this.removeBtnStyle(this.selectedElementId);

		if (figCapElement) {
			figCapElement.style.display = 'none';
		}

		if (renameContainerElement) {
			renameContainerElement.style.display = 'block';
			this.currentIconName = this.selectedFile.name;
			this.renameForm.setValue({
				renameInput: this.currentIconName,
			});
			renameTxtBoxElement?.focus();
			renameTxtBoxElement?.select();
		}
	}

	async onRenameFileTxtBoxDataSave(): Promise<void> {
		this.isRenameActive = !this.isRenameActive;

		const figCapElement = document.getElementById(
			`figCap${this.selectedElementId}`
		) as HTMLElement;
		const renameContainerElement = document.getElementById(
			`renameContainer${this.selectedElementId}`
		) as HTMLElement;
		const renameText = this.renameForm.value.renameInput as string;

		this.setBtnStyle(this.selectedElementId, false);
		this.renameFileTriggerCnt = 0;

		if (figCapElement) {
			figCapElement.style.display = 'block';
		}

		if (renameContainerElement) {
			renameContainerElement.style.display = 'none';
		}
	}

	onRenameFileTxtBoxHide(): void {
		this.isRenameActive = !this.isRenameActive;

		const figCapElement = document.getElementById(
			`figCap${this.selectedElementId}`
		) as HTMLElement;
		const renameContainerElement = document.getElementById(
			`renameContainer${this.selectedElementId}`
		) as HTMLElement;

		if (figCapElement) {
			figCapElement.style.display = 'block';
		}

		if (renameContainerElement) {
			renameContainerElement.style.display = 'none';
		}

		this.isIconInFocusDueToPriorAction = true;
	}

	private getComponentDetail(): Process {
		return new Process(this.processId, this.name, this.icon, this.hasWindow, this.type);
	}
}
