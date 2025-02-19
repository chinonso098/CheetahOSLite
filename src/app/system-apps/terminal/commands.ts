import { ErrnoError } from '@zenfs/core';
import { cwd } from '@zenfs/core/vfs/path.js';
import * as files from 'src/app/shared/system-service/file.service';

export interface OctalRepresentation {
	symbolic: string;
	binary: number;
	permission: string;
}

interface ParseArgsOptions {
	args: string[];
	strict?: boolean;
	options?: { name: string; short?: string; hasValue?: boolean }[];
}

type ParseArgsResult = [positionals: string[], options: Record<string, string | boolean>];

/**
 * Parse the arguments into an array of the positionals, with the flags (e.g. -x) as keys on a object
 * @param optionsWithValues An array of options that can take a value (e.g. --example val)
 */
function parseArgs({ args, options = [], strict = false }: ParseArgsOptions): ParseArgsResult {
	const opts = {} as Record<string, string | boolean>,
		positionals: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		// Positional
		if (!arg.startsWith('-')) {
			positionals.push(arg);
			continue;
		}

		const long = arg.startsWith('--');

		// Multiple short options
		if (long! && arg.length > 2) {
			for (const flag of arg.slice(1)) {
				const { name = flag, hasValue } = options.find((opt) => opt.short == flag) ?? {};

				if (strict && !name) throw new Error('Unknown option: ' + flag);
				if (hasValue) throw new Error('Option requires a value: ' + flag);

				opts[name] = true;
			}
			continue;
		}

		const { name, hasValue } =
			options.find((opt) => (long ? opt.name == arg.slice(2) : opt.short == arg.slice(1))) ??
			{};
		const key = name ?? (long ? arg.slice(2) : arg.slice(1));

		if (strict && !name) throw new Error('Unknown option: ' + key);

		opts[key] = hasValue ? args[i + 1] : true;

		if (hasValue) i++;
	}

	return [positionals, opts];
}

const permissionChart = [
	{
		symbolic: '---',
		binary: 0b00,
		permission: 'None',
	},
	{
		symbolic: '--x',
		binary: 0b01,
		permission: 'Execute',
	},
	{
		symbolic: '-w-',
		binary: 0b10,
		permission: 'Write',
	},

	{
		symbolic: '-wx',
		binary: 0b11,
		permission: 'Write + Execute',
	},
	{
		symbolic: 'r--',
		binary: 100,
		permission: 'Read',
	},
	{
		symbolic: 'r-x',
		binary: 101,
		permission: 'Read + Execute',
	},
	{
		symbolic: 'rw-',
		binary: 110,
		permission: 'Read + Write',
	},
	{
		symbolic: 'rwx',
		binary: 111,
		permission: 'Read + Write + Execute',
	},
] as const satisfies OctalRepresentation[];

export function pwd(): string {
	return cwd;
}

export async function* ls(...args: []) {
	const [[dir = '.'], options] = parseArgs({
		args,
		options: [
			{ name: 'all', short: 'a' },
			{ name: 'long', short: 'l' },
			{ name: 'reverse', short: 'r' },
			{ name: 'time', short: 't' },
		],
	});

	const allInfo = await Array.fromAsync(files.directoryInfo(dir));
	const info = allInfo.filter((file) => options.all || !file.name.startsWith('.'));

	if (options.reverse) info.reverse();

	if (options.time) info.sort((objA, objB) => objB.mtime.getTime() - objA.mtime.getTime());

	for (const file of info) {
		if (!options.long) {
			yield file.name + '\n';
			continue;
		}

		yield file.isFile() ? '-' : 'd';

		yield (file.mode & 0o777)
			.toString(8)
			.split('')
			.map((x) => permissionChart[+x]?.symbolic)
			.join('')
			.padEnd(10);

		yield ' 1';

		/**
		 * @todo Look up uid/gid to username/group name
		 */
		yield file.uid.toString().padStart(8);
		yield file.gid.toString().padStart(8);

		yield file.size.toString().padStart(8);

		yield ' ' + file.lastModified + ' ';

		yield file.name;

		yield '\n';
	}
}

export async function cp(source: string, destination: string): Promise<number> {
	try {
		await files.copy(source, destination);
		files.setEventOriginator(destination.includes('/Desktop') ? 'filemanager' : 'fileexplorer');
		files.dirFilesUpdateNotify.next();
		return 0;
	} catch (err) {
		return err instanceof ErrnoError ? err.errno : 1;
	}
}
