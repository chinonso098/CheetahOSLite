import { AfterViewInit, OnInit, OnDestroy, Component, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProcessIDService } from 'src/app/shared/system-service/process.id.service';
import { RunningProcessService } from 'src/app/shared/system-service/running.process.service';
import { ComponentType } from 'src/app/system-files/component.types';
import { Process } from 'src/app/system-files/process';

import { IconsSizes, SortBys } from './desktop.enums';
import { FileManagerService } from 'src/app/shared/system-service/file.manager.services';
import { Colors } from './colorutil/colors';
import { FileInfo } from 'src/app/system-files/fileinfo';
import { TriggerProcessService } from 'src/app/shared/system-service/trigger.process.service';
import { ScriptService } from 'src/app/shared/system-service/script.services';
import { MenuService } from 'src/app/shared/system-service/menu.services';
import { NestedMenu, NestedMenuItem } from 'src/app/shared/system-component/menu/menu.item';
import * as files from 'src/app/shared/system-service/file.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
	selector: 'cos-desktop',
	templateUrl: './desktop.component.html',
	styleUrls: ['./desktop.component.css'],
	standalone: false,
	animations: [
		trigger('slideStatusAnimation', [
			state('slideOut', style({ right: '-200px' })),
			state('slideIn', style({ right: '2px' })),

			transition('* => slideIn', [animate('1s ease-in')]),
			transition('slideIn => slideOut', [animate('2s ease-out')]),
		]),
	],
})
export class DesktopComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('desktopContainer', { static: true })
	desktopContainer!: ElementRef;

	private _processIdService: ProcessIDService;
	private _runningProcessService: RunningProcessService;
	private _fileManagerServices: FileManagerService;
	private _triggerProcessService: TriggerProcessService;
	private _scriptService: ScriptService;
	private _menuService: MenuService;

	private _timerSubscription!: Subscription;
	private _showTaskBarMenuSub!: Subscription;
	private _hideContextMenuSub!: Subscription;
	private _showTaskBarPreviewWindowSub!: Subscription;
	private _hideTaskBarPreviewWindowSub!: Subscription;
	private _keepTaskBarPreviewWindowSub!: Subscription;

	private _vantaEffect: any;

	readonly largeIcons = IconsSizes.LARGE_ICONS;
	readonly mediumIcons = IconsSizes.MEDIUM_ICONS;
	readonly smallIcons = IconsSizes.SMALL_ICONS;

	isLargeIcon = true;
	isMediumIcon = false;
	isSmallIcon = false;

	readonly sortByName = SortBys.NAME;
	readonly sortByItemType = SortBys.ITEM_TYPE;
	readonly sortBySize = SortBys.SIZE;
	readonly sortByDateModified = SortBys.DATE_MODIFIED;

	isSortByName = false;
	isSortByItemType = false;
	isSortBySize = false;
	isSortByDateModified = false;

	autoAlignIcons = true;
	autoArrangeIcons = true;
	showDesktopIcons = true;
	showDesktopScreenShotPreview = false;
	dsktpPrevImg = '';
	slideState = 'slideIn';

	dskTopCntxtMenuStyle: Record<string, unknown> = {};
	tskBarCntxtMenuStyle: Record<string, unknown> = {};
	tskBarPrevWindowStyle: Record<string, unknown> = {};
	deskTopMenuOption = 'nested-menu';
	showDesktopCntxtMenu = false;
	showTskBarCntxtMenu = false;
	showTskBarPreviewWindow = false;
	tskBarPreviewWindowState = 'in';
	tskBarMenuOption = 'taskbar-menu';
	selectedFileFromTaskBar!: FileInfo;
	appToPreview = '';
	appToPreviewIcon = '';
	previousDisplayedTaskbarPreview = '';
	removeTskBarPrevWindowFromDOMTimeoutId!: NodeJS.Timeout;
	hideTskBarPrevWindowTimeoutId!: NodeJS.Timeout;

	directory = '/Desktop';
	terminalApp = 'terminal';
	textEditorApp = 'texteditor';
	codeEditorApp = 'codeeditor';
	markDownViewerApp = 'markdownviewer';

	private MIN_DEG = 0;
	private MAX_DEG = 360;
	private CURRENT_DEG = 0;
	private defaultColor = 0x274c;
	private nextColor: Colors = new Colors();
	private animationId: any;

	taskBarMenuData = [
		{
			icon: '',
			label: '',
			action: this.openApplicationFromTaskBar.bind(this),
		},
		{ icon: '', label: '', action: () => console.log() },
	];

	deskTopMenu: NestedMenu[] = [];

	hasWindow = false;
	icon = 'osdrive/icons/generic-program.ico';
	name = 'desktop';
	processId = 0;
	type = ComponentType.System;
	displayName = '';

	constructor(
		processIdService: ProcessIDService,
		runningProcessService: RunningProcessService,
		fileManagerServices: FileManagerService,
		triggerProcessService: TriggerProcessService,
		scriptService: ScriptService,
		menuService: MenuService
	) {
		this._processIdService = processIdService;
		this._runningProcessService = runningProcessService;
		this._fileManagerServices = fileManagerServices;
		this._triggerProcessService = triggerProcessService;
		this._scriptService = scriptService;
		this._menuService = menuService;

		this._showTaskBarMenuSub = this._menuService.showTaskBarMenu.subscribe((p) => {
			this.onShowTaskBarContextMenu(p);
		});
		this._showTaskBarPreviewWindowSub =
			this._runningProcessService.showPreviewWindowNotify.subscribe((p) => {
				this.showTaskBarPreviewWindow(p);
			});
		this._hideContextMenuSub = this._menuService.hideContextMenus.subscribe(() => {
			this.hideContextMenu();
		});
		this._hideTaskBarPreviewWindowSub =
			this._runningProcessService.hidePreviewWindowNotify.subscribe(() => {
				this.hideTaskBarPreviewWindow();
			});
		this._keepTaskBarPreviewWindowSub =
			this._runningProcessService.keepPreviewWindowNotify.subscribe(() => {
				this.keepTaskBarPreviewWindow();
			});

		this.processId = this._processIdService.getNewProcessId();
		this._runningProcessService.addProcess(this.getComponentDetail());
		this.CURRENT_DEG = this.getRandomInt(0, 360);
	}

	ngOnInit(): void {
		this.getDesktopMenuData();
	}

	ngAfterViewInit(): void {
		//this.animationId = requestAnimationFrame(this.changeAnimationColor.bind(this));
		this.hideContextMenu();
	}

	changeAnimationColor(): void {
		this.CURRENT_DEG = this.CURRENT_DEG > this.MAX_DEG ? this.MIN_DEG : this.CURRENT_DEG + 1;

		console.log(
			'nextColor:',
			Number(this.nextColor.changeHue('#4f32c2', this.CURRENT_DEG)?.replace('#', '0x'))
		);
		this._vantaEffect.setOptions({
			color: Number(
				this.nextColor.changeHue('#4f32c2', this.CURRENT_DEG)?.replace('#', '0x')
			),
		});

		// this ain't working
		//this.animationId = requestAnimationFrame(this.changeAnimationColor.bind(this));
	}

	ngOnDestroy(): void {
		this._timerSubscription?.unsubscribe();
		this._showTaskBarMenuSub?.unsubscribe();
		this._hideContextMenuSub?.unsubscribe();
		this._showTaskBarPreviewWindowSub?.unsubscribe();
		this._hideTaskBarPreviewWindowSub?.unsubscribe();
		this._keepTaskBarPreviewWindowSub?.unsubscribe();

		cancelAnimationFrame(this.animationId);
		this._vantaEffect?.destroy();
	}

	getRandomInt(min: number, max: number): number {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min) + min);
	}

	showDesktopContextMenu(evt: MouseEvent): void {
		/**
		 * There is a doubling of responses to certain events that exist on the
		 * desktop compoonent and any other component running at the time the event was triggered.
		 * The desktop will always respond to the event, but other components will only respond when they are in focus.
		 * If there is a count of 2 or more(highly unlikely) reponses for a given event, then, ignore the desktop's response
		 */

		const evtOriginator = this._runningProcessService.getEventOrginator();

		if (evtOriginator == '') {
			this._menuService.hideContextMenus.next();
			this.showDesktopCntxtMenu = true;
			this.dskTopCntxtMenuStyle = {
				position: 'absolute',
				width: '210px',
				transform: `translate(${String(evt.clientX + 2)}px, ${String(evt.clientY)}px)`,
				'z-index': 2,
				opacity: 1,
			};
			evt.preventDefault();
		} else {
			this._runningProcessService.removeEventOriginator();
		}
	}

	async createFolder(): Promise<void> {}

	hideContextMenu(caller?: string): void {
		this.showDesktopCntxtMenu = false;
		this.showTskBarCntxtMenu = false;

		// to prevent an endless loop of calls,
		if (caller !== undefined && caller === this.name) {
			this._menuService.hideContextMenus.next();
		}
	}

	viewByLargeIcon(): void {
		this.viewBy(this.largeIcons);
	}

	viewByMediumIcon(): void {
		this.viewBy(this.mediumIcons);
	}

	viewBySmallIcon(): void {
		this.viewBy(this.smallIcons);
	}

	viewBy(viewBy: string): void {
		if (viewBy === IconsSizes.LARGE_ICONS) {
			this.isLargeIcon = true;
			this.isMediumIcon = false;
			this.isSmallIcon = false;
		}

		if (viewBy === IconsSizes.MEDIUM_ICONS) {
			this.isMediumIcon = true;
			this.isLargeIcon = false;
			this.isSmallIcon = false;
		}

		if (viewBy === IconsSizes.SMALL_ICONS) {
			this.isSmallIcon = true;
			this.isMediumIcon = false;
			this.isLargeIcon = false;
		}

		this._fileManagerServices.viewByNotify.next(viewBy);
		this.getDesktopMenuData();
	}

	sortByNameM(): void {
		this.sortBy(this.sortByName);
	}

	sortBySizeM(): void {
		this.sortBy(this.sortBySize);
	}
	sortByItemTypeM(): void {
		this.sortBy(this.sortByItemType);
	}
	sortByDateModifiedM(): void {
		this.sortBy(this.sortByDateModified);
	}

	sortBy(sortBy: string): void {
		if (sortBy === SortBys.DATE_MODIFIED) {
			this.isSortByDateModified = true;
			this.isSortByItemType = false;
			this.isSortByName = false;
			this.isSortBySize = false;
		}

		if (sortBy === SortBys.ITEM_TYPE) {
			this.isSortByItemType = true;
			this.isSortByDateModified = false;
			this.isSortByName = false;
			this.isSortBySize = false;
		}

		if (sortBy === SortBys.SIZE) {
			this.isSortBySize = true;
			this.isSortByItemType = false;
			this.isSortByName = false;
			this.isSortByDateModified = false;
		}

		if (sortBy === SortBys.NAME) {
			this.isSortByName = true;
			this.isSortByItemType = false;
			this.isSortByDateModified = false;
			this.isSortBySize = false;
		}

		this._fileManagerServices.sortByNotify.next(sortBy);
		this.getDesktopMenuData();
	}

	autoArrangeIcon(): void {
		this.autoArrangeIcons = !this.autoArrangeIcons;
		this._fileManagerServices.autoArrangeIconsNotify.next(this.autoArrangeIcons);
		this.getDesktopMenuData();
	}

	autoAlignIcon(): void {
		this.autoAlignIcons = !this.autoAlignIcons;
		this._fileManagerServices.alignIconsToGridNotify.next(this.autoAlignIcons);
		this.getDesktopMenuData();
	}

	refresh(): void {
		this._fileManagerServices.refreshNotify.next();
	}

	showDesktopIcon(): void {
		this.showDesktopIcons = !this.showDesktopIcons;
		this._fileManagerServices.showDesktopIconsNotify.next(this.showDesktopIcons);
		this.getDesktopMenuData();
	}

	previousBackground(): void {
		this.hideContextMenu();
	}

	nextBackground(): void {
		this.hideContextMenu();
	}

	openTerminal(): void {
		this.openApplication(this.terminalApp);
	}

	openTextEditor(): void {
		this.openApplication(this.textEditorApp);
	}

	openCodeEditor(): void {
		this.openApplication(this.codeEditorApp);
	}

	openMarkDownViewer(): void {
		this.openApplication(this.markDownViewerApp);
	}

	async onPaste(): Promise<void> {
		const cntntPath = this._menuService.path;
		const action = this._menuService.actions;

		console.log(`path: ${cntntPath}`);
		console.log(`action: ${action}`);

		try {
			switch (action) {
				case 'copy':
					await files.copy(cntntPath, this.directory);
					this.refresh();
					break;
				case 'cut':
			}
		} catch (err) {
			console.error(err);
		}
	}

	openApplication(arg0: string): void {
		const file = new FileInfo();

		file.opensWith = arg0;

		if (arg0 == this.markDownViewerApp) {
			file.path = '/Desktop';
			file.contentPath = '/Documents/Credits.md';
		}

		this._triggerProcessService.startApplication(file);
	}

	buildViewByMenu(): NestedMenuItem[] {
		const smallIcon: NestedMenuItem = {
			icon: 'osdrive/icons/circle.png',
			label: 'Small icons',
			action: this.viewBySmallIcon.bind(this),
			variables: this.isSmallIcon,
			emptyline: false,
			styleOption: 'A',
		};

		const mediumIcon: NestedMenuItem = {
			icon: 'osdrive/icons/circle.png',
			label: 'Medium icons',
			action: this.viewByMediumIcon.bind(this),
			variables: this.isMediumIcon,
			emptyline: false,
			styleOption: 'A',
		};

		const largeIcon: NestedMenuItem = {
			icon: 'osdrive/icons/circle.png',
			label: 'Large icons',
			action: this.viewByLargeIcon.bind(this),
			variables: this.isLargeIcon,
			emptyline: true,
			styleOption: 'A',
		};

		const autoArrageIcon: NestedMenuItem = {
			icon: 'osdrive/icons/chkmark32.png',
			label: 'Auto arrange icons',
			action: this.autoArrangeIcon.bind(this),
			variables: this.autoArrangeIcons,
			emptyline: false,
			styleOption: 'B',
		};

		const autoAlign: NestedMenuItem = {
			icon: 'osdrive/icons/chkmark32.png',
			label: 'Align icons to grid',
			action: this.autoAlignIcon.bind(this),
			variables: this.autoAlignIcons,
			emptyline: true,
			styleOption: 'B',
		};

		const showDesktopIcons: NestedMenuItem = {
			icon: 'osdrive/icons/chkmark32.png',
			label: 'Show desktop icons',
			action: this.showDesktopIcon.bind(this),
			variables: this.showDesktopIcons,
			emptyline: false,
			styleOption: 'B',
		};

		const viewByMenu = [
			smallIcon,
			mediumIcon,
			largeIcon,
			autoArrageIcon,
			autoAlign,
			showDesktopIcons,
		];

		return viewByMenu;
	}

	buildSortByMenu(): NestedMenuItem[] {
		const sortByName: NestedMenuItem = {
			icon: 'osdrive/icons/circle.png',
			label: 'Name',
			action: this.sortByNameM.bind(this),
			variables: this.isSortByName,
			emptyline: false,
			styleOption: 'A',
		};

		const sortBySize: NestedMenuItem = {
			icon: 'osdrive/icons/circle.png',
			label: 'Size',
			action: this.sortBySizeM.bind(this),
			variables: this.isSortBySize,
			emptyline: false,
			styleOption: 'A',
		};

		const sortByItemType: NestedMenuItem = {
			icon: 'osdrive/icons/circle.png',
			label: 'Item type',
			action: this.sortByItemTypeM.bind(this),
			variables: this.isSortByItemType,
			emptyline: false,
			styleOption: 'A',
		};

		const sortByDateModified: NestedMenuItem = {
			icon: 'osdrive/icons/circle.png',
			label: 'Date modified',
			action: this.sortByDateModifiedM.bind(this),
			variables: this.isSortByDateModified,
			emptyline: false,
			styleOption: 'A',
		};

		const sortByMenu = [sortByName, sortBySize, sortByItemType, sortByDateModified];

		return sortByMenu;
	}

	buildNewMenu(): NestedMenuItem[] {
		const newFolder: NestedMenuItem = {
			icon: 'osdrive/icons/empty_folder.ico',
			label: 'Folder',
			action: () => '',
			variables: true,
			emptyline: false,
			styleOption: 'C',
		};

		const textEditor: NestedMenuItem = {
			icon: 'osdrive/icons/text-editor_48.png',
			label: 'Rich Text',
			action: this.openTextEditor.bind(this),
			variables: true,
			emptyline: false,
			styleOption: 'C',
		};

		const codeEditor: NestedMenuItem = {
			icon: 'osdrive/icons/vs-code_48.png',
			label: 'Code Editor',
			action: this.openCodeEditor.bind(this),
			variables: true,
			emptyline: false,
			styleOption: 'C',
		};

		const sortByMenu = [newFolder, textEditor, codeEditor];

		return sortByMenu;
	}

	getDesktopMenuData(): void {
		this.deskTopMenu = [
			{
				icon1: '',
				icon2: 'osdrive/icons/arrow_next_1.png',
				label: 'View',
				nest: this.buildViewByMenu(),
				action: () => '',
				action1: () => '',
				emptyline: false,
			},
			{
				icon1: '',
				icon2: 'osdrive/icons/arrow_next_1.png',
				label: 'Sort by',
				nest: this.buildSortByMenu(),
				action: () => '',
				action1: () => '',
				emptyline: false,
			},
			{
				icon1: '',
				icon2: '',
				label: 'Refresh',
				nest: [],
				action: this.refresh.bind(this),
				action1: () => '',
				emptyline: true,
			},
			{
				icon1: '',
				icon2: '',
				label: 'Paste',
				nest: [],
				action: this.onPaste.bind(this),
				action1: () => '',
				emptyline: false,
			},
			{
				icon1: '/osdrive/icons/terminal_48.png',
				icon2: '',
				label: 'Open in Terminal',
				nest: [],
				action: this.openTerminal.bind(this),
				action1: () => '',
				emptyline: false,
			},
			{
				icon1: '/osdrive/icons/camera_48.png',
				icon2: '',
				label: 'Screen Shot',
				nest: [],
				action: () => '',
				action1: () => '',
				emptyline: false,
			},
			{
				icon1: '',
				icon2: '',
				label: 'Next Background',
				nest: [],
				action: this.nextBackground.bind(this),
				action1: () => '',
				emptyline: false,
			},
			{
				icon1: '',
				icon2: '',
				label: 'Previous Background',
				nest: [],
				action: this.previousBackground.bind(this),
				action1: () => '',
				emptyline: true,
			},
			{
				icon1: '',
				icon2: 'osdrive/icons/arrow_next_1.png',
				label: 'New',
				nest: this.buildNewMenu(),
				action: () => '',
				action1: () => '',
				emptyline: true,
			},
			{
				icon1: '',
				icon2: '',
				label: 'Many Thanks',
				nest: [],
				action: this.openMarkDownViewer.bind(this),
				action1: () => '',
				emptyline: false,
			},
		];
	}

	private buildVantaEffect(n: number) {}

	onShowTaskBarContextMenu(data: unknown[]): void {
		const rect = data[0] as DOMRect;
		const file = data[1] as FileInfo;
		const isPinned = data[2] as boolean;
		this.selectedFileFromTaskBar = file;

		this.switchBetweenPinAndUnpin(isPinned);
		// first count, then show the cntxt menu
		const processCount = this.countInstaceAndSetMenu();

		this.removeOldTaskBarPreviewWindowNow();
		this.showTskBarCntxtMenu = true;

		if (processCount == 0) {
			this.tskBarCntxtMenuStyle = {
				position: 'absolute',
				transform: `translate(${String(rect.x - 60)}px, ${String(rect.y - 68.5)}px)`,
				'z-index': 2,
			};
		} else {
			this.tskBarCntxtMenuStyle = {
				position: 'absolute',
				transform: `translate(${String(rect.x - 60)}px, ${String(rect.y - 97.5)}px)`,
				'z-index': 2,
			};
		}
	}

	hideTaskBarContextMenu(): void {
		this.showTskBarCntxtMenu = false;
	}

	showTaskBarContextMenu(): void {
		this.showTskBarCntxtMenu = true;
	}

	switchBetweenPinAndUnpin(isAppPinned: boolean): void {
		if (isAppPinned) {
			const menuEntry = {
				icon: 'osdrive/icons/unpin_24.png',
				label: 'Unpin from taskbar',
				action: this.unPinApplicationFromTaskBar.bind(this),
			};
			const rowOne = this.taskBarMenuData[1];
			rowOne.icon = menuEntry.icon;
			rowOne.label = menuEntry.label;
			rowOne.action = menuEntry.action;
			this.taskBarMenuData[1] = rowOne;
		} else if (!isAppPinned) {
			const menuEntry = {
				icon: 'osdrive/icons/pin_24.png',
				label: 'Pin to taskbar',
				action: this.pinApplicationFromTaskBar.bind(this),
			};
			const rowOne = this.taskBarMenuData[1];
			rowOne.icon = menuEntry.icon;
			rowOne.label = menuEntry.label;
			rowOne.action = menuEntry.action;
			this.taskBarMenuData[1] = rowOne;
		}
	}

	countInstaceAndSetMenu(): number {
		const file = this.selectedFileFromTaskBar;
		const processCount = this._runningProcessService
			.getProcesses()
			.filter((p) => p.getProcessName === file.opensWith).length;

		const rowZero = this.taskBarMenuData[0];
		rowZero.icon = file.iconPath;
		rowZero.label = file.opensWith;
		this.taskBarMenuData[0] = rowZero;

		if (processCount == 1) {
			if (this.taskBarMenuData.length == 2) {
				const menuEntry = {
					icon: 'osdrive/icons/x_32.png',
					label: 'Close window',
					action: this.closeApplicationFromTaskBar.bind(this),
				};
				this.taskBarMenuData.push(menuEntry);
			} else {
				const rowTwo = this.taskBarMenuData[2];
				rowTwo.label = 'Close window';
				this.taskBarMenuData[2] = rowTwo;
			}
		} else if (processCount > 1) {
			const rowTwo = this.taskBarMenuData[2];
			rowTwo.label = 'Close all windows';
			this.taskBarMenuData[2] = rowTwo;
		}

		return processCount;
	}

	openApplicationFromTaskBar(): void {
		this.showTskBarCntxtMenu = false;
		const file = this.selectedFileFromTaskBar;
		this._triggerProcessService.startApplication(file);
	}

	closeApplicationFromTaskBar(): void {
		this.showTskBarCntxtMenu = false;
		const file = this.selectedFileFromTaskBar;
		const proccesses = this._runningProcessService
			.getProcesses()
			.filter((p) => p.getProcessName === file.opensWith);

		this._menuService.closeApplicationFromTaskBar.next(proccesses);
	}

	pinApplicationFromTaskBar(): void {
		this.showTskBarCntxtMenu = false;
		const file = this.selectedFileFromTaskBar;
		this._menuService.pinToTaskBar.next(file);
	}

	unPinApplicationFromTaskBar(): void {
		this.showTskBarCntxtMenu = false;
		const file = this.selectedFileFromTaskBar;
		this._menuService.unPinFromTaskBar.next(file);
	}

	showTaskBarPreviewWindow(data: unknown[]): void {
		const rect = data[0] as DOMRect;
		const appName = data[1] as string;
		const iconPath = data[2] as string;

		this.appToPreview = appName;
		this.appToPreviewIcon = iconPath;
		this.hideTaskBarContextMenu();

		if (this.previousDisplayedTaskbarPreview !== appName) {
			this.showTskBarPreviewWindow = false;
			this.previousDisplayedTaskbarPreview = appName;

			setTimeout(() => {
				this.showTskBarPreviewWindow = true;
				this.tskBarPreviewWindowState = 'in';
			}, 400);
		} else {
			this.showTskBarPreviewWindow = true;
			this.tskBarPreviewWindowState = 'in';
			this.clearTimeout();
		}

		this.tskBarPrevWindowStyle = {
			position: 'absolute',
			transform: `translate(${String(rect.x - 59)}px, ${String(rect.y - 131)}px)`,
			'z-index': 2,
		};
	}

	hideTaskBarPreviewWindow(): void {
		this.hideTskBarPrevWindowTimeoutId = setTimeout(() => {
			this.tskBarPreviewWindowState = 'out';
		}, 100);

		this.removeTskBarPrevWindowFromDOMTimeoutId = setTimeout(() => {
			this.showTskBarPreviewWindow = false;
			//this.hideTaskBarContextMenu();
		}, 300);
	}

	keepTaskBarPreviewWindow(): void {
		this.clearTimeout();
	}

	removeOldTaskBarPreviewWindowNow(): void {
		this.showTskBarPreviewWindow = false;
	}

	clearTimeout(): void {
		clearTimeout(this.hideTskBarPrevWindowTimeoutId);
		clearTimeout(this.removeTskBarPrevWindowFromDOMTimeoutId);
	}

	private getComponentDetail(): Process {
		return new Process(this.processId, this.name, this.icon, this.hasWindow, this.type);
	}
}
