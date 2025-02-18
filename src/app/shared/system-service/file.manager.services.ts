import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class FileManagerService {
	autoArrangeIconsNotify: Subject<boolean> = new Subject<boolean>();
	alignIconsToGridNotify: Subject<boolean> = new Subject<boolean>();
	viewByNotify: Subject<string> = new Subject<string>();
	sortByNotify: Subject<string> = new Subject<string>();
	refreshNotify: Subject<void> = new Subject<void>();
	showDesktopIconsNotify: Subject<boolean> = new Subject<boolean>();
}
