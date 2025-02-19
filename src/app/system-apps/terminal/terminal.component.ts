import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProcessIDService } from 'src/app/shared/system-service/process.id.service';
import { RunningProcessService } from 'src/app/shared/system-service/running.process.service';
import { BaseComponent } from 'src/app/system-base/base/base.component';
import { ComponentType } from 'src/app/system-files/component.types';
import { Process } from 'src/app/system-files/process';
import * as commands from './commands';

interface HistoryEntry {
	input: string;
	output: string;
	status: number;
}

@Component({
	selector: 'cos-terminal',
	templateUrl: './terminal.component.html',
	styleUrls: ['./terminal.component.css'],
	standalone: false,
})
export class TerminalComponent implements BaseComponent, OnInit, AfterViewInit, OnDestroy {
	@ViewChild('terminalCntnr', { static: true }) terminalCntnr!: ElementRef;
	@ViewChild('terminalOutputCntnr', { static: true })
	terminalOutputCntnr!: ElementRef;
	@ViewChild('terminalHistoryOutput', { static: true })
	terminalHistoryOutput!: ElementRef;

	private _maximizeWindowSub!: Subscription;
	private _minimizeWindowSub!: Subscription;

	private versionNum = '1.0.4';

	isBannerVisible = true;
	isWelcomeVisible = true;

	banner = '';
	welcomeMessage = "Type 'help', or 'help -verbose' to view a list of available commands.";
	terminalPrompt = '$ ';
	history: HistoryEntry[] = [];
	echoCommands: string[] = [
		'close',
		'curl',
		'date',
		'echo',
		'help',
		'hostname',
		'list',
		'open',
		'version',
		'whoami',
		'weather',
		'pwd',
	];
	utilityCommands: string[] = [
		'all',
		'cat',
		'cd',
		'clear',
		'cp',
		'dir',
		'download',
		'exit',
		'ls',
		'mkdir',
		'mv',
		'rm',
		'touch',
	];
	fetchedDirectoryList: string[] = [];
	generatedArguments: string[] = [];
	allCommands: string[] = [];
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

	constructor(
		processIdService: ProcessIDService,
		private runningProcessService: RunningProcessService,
		private formBuilder: FormBuilder
	) {
		this.processId = processIdService.getNewProcessId();
		runningProcessService.addProcess(this.getComponentDetail());
		this._maximizeWindowSub = runningProcessService.maximizeWindowNotify.subscribe(() => {
			this.maximizeWindow();
		});
		this._minimizeWindowSub = runningProcessService.minimizeWindowNotify.subscribe((p) => {
			this.minimizeWindow(p);
		});
	}

	ngOnInit(): void {
		this.terminalForm = this.formBuilder.nonNullable.group({
			terminalCmd: '',
		});

		this.banner = this.getTerminalBanner();
		this.allCommands = [...this.echoCommands, ...this.utilityCommands];
	}

	ngAfterViewInit(): void {
		this.setTerminalWindowToFocus(this.processId);
		this.populateWelecomeMessageField();
	}

	ngOnDestroy(): void {
		this._maximizeWindowSub?.unsubscribe();
		this._minimizeWindowSub?.unsubscribe();
	}

	captureComponentImg(): void {}

	getYear(): number {
		return new Date().getFullYear();
	}

	getTerminalBanner(): string {
		const banner = `Simple Terminal, CheetahOS [Version ${this.versionNum}] \u00A9 ${this.getYear()}`;
		return banner;
	}

	populateWelecomeMessageField(): void {}

	onKeyDownOnWindow(evt: KeyboardEvent): void {
		this.focusOnInput();
		if (evt.key === 'Tab') {
			// Prevent tab from moving focus
			evt.preventDefault();
		}
	}

	focusOnInput(): void {
		const cmdTxtBoxElm = document.getElementById('cmdTxtBox') as HTMLInputElement;
		cmdTxtBoxElm?.focus();
	}

	async onKeyDoublePressed(evt: KeyboardEvent): Promise<void> {
		console.log(`${evt.key} Key pressed  rapidly.`);
	}

	async onKeyDownInInputBox(evt: KeyboardEvent): Promise<void> {
		if (evt.key != 'Enter') return;
		//this.isInLoopState = false;
		this.numCntr = 0;

		const input: string = this.terminalForm.value.terminalCmd.trim();

		if (!input) return;

		evt.preventDefault();

		let output = '',
			status = 0;

		for await (const data of this.processCommand(input.split(' '))) {
			if (typeof data == 'number') {
				status = data;
			} else {
				output += data;
			}
		}

		this.history.push({ input, output, status });
		this.terminalForm.reset();
	}

	async *processCommand(args: string[]): AsyncIterableIterator<number | string> {
		if (!args.length) {
			return 1;
		}

		const command = args.shift()!.toLowerCase();

		if (!(command in commands) || command.startsWith('_')) {
			yield `${args}: command not found. Type 'help', or 'help -verbose' to view a list of available commands.`;
			return 1;
		}

		try {
			// @ts-expect-error 2556
			const result = commands[command as keyof typeof commands](...args);
			// if is an async iterator
			if (result && typeof result == 'object' && Symbol.asyncIterator in result)
				yield* result;
			else yield result;
			return 0;
		} catch (err: any) {
			yield err.toString();
			return 1;
		}
	}

	/***
	 * arg0: what is being searched for
	 * arg1: Where x is being search in
	 */
	getAutoComplete(arg0: string, arg1: string[]): string[] {
		// eslint-disable-next-line prefer-const
		let matchingCommand = arg1.filter((x) => x.startsWith(arg0.trim()));
		return matchingCommand.length > 0 ? matchingCommand : [];
	}

	maximizeWindow(): void {}

	minimizeWindow(arg: number[]): void {}

	setTerminalWindowToFocus(pid: number): void {
		this.runningProcessService.focusOnCurrentProcessNotify.next(pid);
	}

	private getComponentDetail(): Process {
		return new Process(this.processId, this.name, this.icon, this.hasWindow, this.type);
	}
}
