import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root',
})
export class SessionManagmentService {
	private _sessionName = 'main-session';
	public readonly _pickUpKey = 'temp-session-retrieval-key';
	private _sessionDataDict: Map<string, unknown>;
	static instance: SessionManagmentService;
	private _sessionRetrievalCounter = 0;

	constructor() {
		if (sessionStorage.getItem(this._sessionName)) {
			const sessData = sessionStorage.getItem(this._sessionName) as string;
			this._sessionDataDict = new Map(JSON.parse(sessData));
			SessionManagmentService.instance = this;
		} else {
			this._sessionDataDict = new Map<string, unknown>();
			SessionManagmentService.instance = this;
		}
	}

	addSession(key: string, dataToAdd: unknown): void {
		if (key === this._pickUpKey) {
			this.addTempSession(dataToAdd);
		} else {
			this._sessionDataDict.set(key, dataToAdd);
			this.saveSession(this._sessionDataDict);
		}
	}

	getSession(key: string): unknown {
		const stateData = this._sessionDataDict.get(key);
		return stateData;
	}

	getTempSession(key: string): string {
		let result = '';
		if (this._sessionRetrievalCounter <= 1) {
			// console.log(`counter:${this._sessionRetrievalCounter} -----  retrievedSess:${this._sessionRetrievalCounter}`);

			result = sessionStorage.getItem(key) || '';
			if (this._sessionRetrievalCounter === 1) {
				sessionStorage.removeItem(key);
				this._sessionRetrievalCounter = 0;
				return result;
			}
			this._sessionRetrievalCounter++;
			return result;
		}
		return result;
	}

	getKeys(): string[] {
		const keys: string[] = [];

		for (const key of this._sessionDataDict.keys()) {
			keys.push(key);
		}
		return keys;
	}

	hasTempSession(key: string): boolean {
		return sessionStorage.getItem(key) !== null ? true : false;
	}

	removeSession(key: string): void {
		this._sessionDataDict.delete(key);
		this.saveSession(this._sessionDataDict);
	}

	resetSession(): void {
		this._sessionDataDict = new Map<string, unknown>();
		sessionStorage.clear();
	}

	private saveSession(sessionData: Map<string, unknown>) {
		const data = JSON.stringify(Array.from(sessionData.entries()));
		sessionStorage.setItem(this._sessionName, data);
	}

	private addTempSession(sessionData: unknown) {
		sessionStorage.setItem(this._pickUpKey, sessionData as string);
	}
}
