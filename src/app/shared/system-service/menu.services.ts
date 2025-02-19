import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { FileInfo } from 'src/app/system-files/fileinfo';
import { Process } from 'src/app/system-files/process';

@Injectable({
	providedIn: 'root',
})
export class MenuService {
	public pasteActive = false;
	public path = 'NOPATH';
	public actions = '';

	pinToTaskBar: Subject<FileInfo> = new Subject<FileInfo>();
	unPinFromTaskBar: Subject<FileInfo> = new Subject<FileInfo>();
	// openApplication: Subject<FileInfo> = new Subject<FileInfo>();
	// closeApplication: Subject<FileInfo[]> = new Subject<FileInfo[]>();
	openApplicationFromTaskBar: Subject<FileInfo> = new Subject<FileInfo>();
	closeApplicationFromTaskBar: Subject<Process[]> = new Subject<Process[]>();
	showTaskBarMenu: Subject<unknown[]> = new Subject<unknown[]>();
	hideTaskBarMenu: Subject<void> = new Subject<void>();
	keepTaskBarMenu: Subject<void> = new Subject<void>();
	hideContextMenus: Subject<void> = new Subject<void>();
	storeData: Subject<string[]> = new Subject<string[]>();
}
