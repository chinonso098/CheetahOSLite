import { Injectable } from "@angular/core";
import { Subject } from "rxjs";


@Injectable({
    providedIn: 'root'
})

export class NotificationService{
    errorNotify: Subject<string> = new Subject<string>();
    InfoNotify: Subject<string> = new Subject<string>();
    warningNotify: Subject<string> = new Subject<string>();
    closeDialogBoxNotify: Subject<number> = new Subject<number>();
}