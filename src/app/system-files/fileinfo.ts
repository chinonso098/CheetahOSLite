export class FileInfo {
	constructor(
		public iconPath: string = '',
		public currentPath: string = '',
		public contentPath: string = '',
		public fileType: string = '',
		public fileName: string = '',
		public opensWith: string = '',
		private _dateModified: Date = new Date('1990-01-01'),
		public size: number = 0,
		public isFile: boolean = true,
		private _fileSizeUnit: string = 'B',
		private _mode: number = 0
	) {}

	get dateModified() {
		return this._dateModified;
	}

	get dateModifiedUS() {
		return this._dateModified.toLocaleString('en-US');
	}

	get dateTimeModifiedUS() {
		const options: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true,
		};

		return this._dateModified
			.toLocaleString('en-US', options)
			.replace(',', '');
	}
	set dateModified(dateModified: any) {
		if (typeof dateModified === 'string')
			this._dateModified = new Date(dateModified);
		else {
			this._dateModified = dateModified;
		}
	}

	get size1() {
		let tmpSize = 0;

		if (this.size >= 0 && this.size <= 999) {
			tmpSize = this.size;
		}

		if (this.size >= 1000 && this.size <= 999999) {
			tmpSize = Math.round((this.size / 1000) * 100) / 100;
		}

		if (this.size >= 1000000 && this.size <= 999999999) {
			tmpSize = Math.round((this.size / 1000000) * 100) / 100;
		}

		return tmpSize;
	}

	get fileSizeUnit() {
		if (this.size >= 0 && this.size <= 999) {
			this._fileSizeUnit = 'B';
		}

		if (this.size >= 1000 && this.size <= 999999) {
			this._fileSizeUnit = 'KB';
		}

		if (this.size >= 1000000 && this.size <= 999999999) {
			this._fileSizeUnit = 'MB';
		}

		return this._fileSizeUnit;
	}

	get mode(): string {
		return '0' + (this._mode & parseInt('777', 8)).toString(8);
	}
	set mode(mode: number) {
		this._mode = mode;
	}
}
