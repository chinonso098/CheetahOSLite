import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { NestedMenu, GeneralMenu } from './menu.item';
import { MenuService } from '../../system-service/menu.services';
import { Subscription } from 'rxjs';

@Component({
	selector: 'cos-menu',
	templateUrl: './menu.component.html',
	styleUrls: ['./menu.component.css'],
	standalone: false,
})
export class MenuComponent implements OnChanges, OnDestroy {
	@Input() generalMenu: GeneralMenu[] = [];
	@Input() nestedMenu: NestedMenu[] = [];
	@Input() fileExplorerMenu: NestedMenu[] = [];
	@Input() menuType = '';

	private _menuService: MenuService;
	private _storeDataSub!: Subscription;
	isPasteActive!: boolean;

	menuOption = '';
	tskBarMenuOption = 'taskbar-menu';
	nestedMenuOption = 'nested-menu';
	fileExplrMngrMenuOption = 'file-explorer-file-manager-menu';

	keys: string[] = [];
	readonly paste = 'Paste';

	constructor(menuService: MenuService) {
		this._menuService = menuService;
		this.isPasteActive = this._menuService.pasteActive;
		this._storeDataSub = this._menuService.storeData.subscribe((p) => {
			const path = p[0];
			const actions = p[1];

			this._menuService.path = path;
			this._menuService.actions = actions;
			this._menuService.pasteActive = true;
		});
	}

	ngOnDestroy(): void {
		this._storeDataSub?.unsubscribe();
	}

	ngOnChanges(changes: SimpleChanges): void {
		this.menuOption = this.menuType;
	}

	onMenuItemClick(action: () => void): void {
		action();
	}

	onMenuItemHover(action1: () => void): void {
		action1();
	}

	getKeys(obj: any): void {
		this.keys = Object.keys(obj);
	}
}
