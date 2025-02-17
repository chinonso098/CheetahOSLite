import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AngularDraggableModule } from 'angular2-draggable';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { TitleComponent } from './user-apps/title/title.component';
import { DesktopComponent } from './system-apps/desktop/desktop.component';
import { TaskbarComponent } from './system-apps/taskbar/taskbar.component';
import { ClockComponent } from './system-apps/clock/clock.component';
import { StartButtonComponent } from './system-apps/startbutton/startbutton.component';
import { TaskBarPreviewComponent } from './system-apps/taskbarpreview/taskbarpreview.component';
import { TaskBarEntriesComponent } from './system-apps/taskbarentries/taskbarentries.component';
import { TaskBarEntryComponent } from './system-apps/taskbarentry/taskbarentry.component';
import { FileExplorerComponent } from './system-apps/fileexplorer/fileexplorer.component';
import { WindowComponent } from './system-apps/window/window.component';
import { FileManagerComponent } from './system-apps/filemanager/filemanager.component';
import { TerminalComponent } from './system-apps/terminal/terminal.component';
import { MenuComponent } from './shared/system-component/menu/menu.component';
import { DialogComponent } from './shared/system-component/dialog/dialog.component';
import { PropertiesComponent } from './shared/system-component/properties/properties.component'; 

import { SafeUrlPipe } from './shared/system-pipes/safe.resource.url.pipe';
import { TruncatePipe } from './shared/system-pipes/string.shorten.pipe';

import { HighlightDirective } from './system-apps/window/window.btn.highlight.directives';
import { TaskBarEntryHighlightDirective } from './system-apps/taskbarentries/taskbar.entry.highlight.directives';
import { KeyPressCaptureDirective } from './system-apps/terminal/key.press.capture.directive';


@NgModule({
  declarations: [
    TitleComponent,
    AppComponent,
    DesktopComponent,
    TaskbarComponent,
    ClockComponent,
    StartButtonComponent,
    TaskBarPreviewComponent,
    TaskBarEntriesComponent,
    TaskBarEntryComponent,
    FileExplorerComponent,
    WindowComponent,
    FileManagerComponent,
    TerminalComponent,
    MenuComponent,
    PropertiesComponent,
    DialogComponent,
 

    HighlightDirective,
    TaskBarEntryHighlightDirective,
    KeyPressCaptureDirective,

    SafeUrlPipe,
    TruncatePipe
    
  ],
  imports: [
    BrowserModule,
    AngularDraggableModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
