import { Dirent, Stats } from '@zenfs/core';
import { join } from '@zenfs/core/vfs/path.js';

export class FileInfo extends Stats {
	public iconPath: string = '';
	public currentPath: string;
	public contentPath: string = '';
	public fileType: string = '';
	public opensWith: string = '';

	public path: string;
	public name: string;
	public prettySize: string;
	public lastModified: string;

	constructor(protected entry?: Dirent) {
		super(entry?.['stats']);
		this.path = entry?.path ?? '';
		this.name = entry?.name ?? '';
		this.currentPath = !entry ? '' : join(entry.parentPath, entry.path);

		this.prettySize =
			this.size.toLocaleString('en-US', {
				style: 'decimal',
				notation: 'compact',
				compactDisplay: 'short',
				maximumFractionDigits: 2,
			}) + 'B';

		this.lastModified = this.mtime
			.toLocaleString('en-US', {
				month: 'short',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false,
			})
			.replace(',', '');
	}
}
