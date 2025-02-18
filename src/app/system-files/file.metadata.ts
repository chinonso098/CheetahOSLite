export class FileMetaData {
	constructor(
		private _createdDate: Date = new Date('1990-01-01'),
		private _modifiedDate: Date = new Date('1990-01-01'),
		public size: number = 0,
		public mode: number = 0
	) {}

	get createdDate(): Date {
		return this._createdDate;
	}

	set createdDate(date: string) {
		this._createdDate = new Date(date);
	}

	get modifiedDate(): Date {
		return this._modifiedDate;
	}

	set modifiedDate(date: string) {
		this._modifiedDate = new Date(date);
	}
}
