import * as globAll from 'glob-all';
import { IOptions } from 'glob';
import * as fsExtra from 'fs-extra';
import { Formatter } from './Formatter';
import { FormattingOptions } from './FormattingOptions';
import * as path from 'path';
import { parse as parseJsonc, ParseError, printParseErrorCode } from 'jsonc-parser';

/**
 * Runs the formatter for an entire project.
 */
export class Runner {

    public formatter?: Formatter;

    public async run(runnerOptions: RunnerOptions) {
        let args = this.normalizeArgs({
            //load options from bsfmt.json
            ...this.getBsfmtOptions(runnerOptions) ?? {},
            //then override with the options from the parameter
            ...runnerOptions
        });

        const filePaths = this.getFilePaths(args.files, args.cwd!);

        this.formatter = new Formatter(args);

        //print the list of unformatted files if found (and enabled)
        if (args.check) {
            console.log('Checking formatting...');
        }

        let unformattedFiles = [] as string[];

        await Promise.all(filePaths.map(async filePath => {
            let text = (await fsExtra.readFile(filePath)).toString();
            let formattedText = this.formatter!.format(text);

            //overwrite the file with the formatted version
            if (args.write) {
                await fsExtra.writeFile(filePath, formattedText);
            } else if (!args.check) {
                //print the file to the console (only if the user didnt specify --write and didnt specify --check
                //This is what prettier's CLI does, so it makes sense. You can leverage this when running single files at a time
                //to pipe to a separate file
                console.log(formattedText);
            }

            //if configured, compare formatted file to unformatted file
            //TODO find a more efficient way to do this other than string comparisons (large files could cause performance issues)
            if (args.check && text !== formattedText) {
                unformattedFiles.push(filePath);
            }
        }));

        //print the list of unformatted files if found (and enabled)
        if (args.check) {
            if (unformattedFiles.length > 0) {
                for (let filePath of unformattedFiles) {
                    console.log(filePath);
                }
                throw new Error('Formatting issues found in the above file(s)');
            } else {
                console.log('All matched files are formatted properly!');
            }
        }
    }

    /**
     * Get the list of file paths for this run.
     */
    private getFilePaths(files: string[], cwd: string) {
        const filePaths = globAll.sync(files, {
            cwd: cwd,
            absolute: true,
            //skip all directories
            nodir: true
        } as IOptions);
        return filePaths;
    }

    /**
     * Load the options from bsfmt.json
     * @throws whenever a custom bsfmt path is provided and does not exist
     * @returns {FormattingOptions} when found, or null if not found
     */
    public getBsfmtOptions(runnerOptions: RunnerOptions): FormattingOptions | null {

        //if options says not to load bsfmt, then return an empty object
        if (runnerOptions.noBsfmt) {
            return null;
        }

        const cwd = runnerOptions.cwd ?? process.cwd();
        const bsfmtPath = runnerOptions.bsfmtPath
            //use custom path
            ? path.resolve(cwd, runnerOptions.bsfmtPath)
            //use default path
            : path.resolve(cwd, 'bsfmt.json');

        const configFileExists = fsExtra.pathExistsSync(bsfmtPath);

        //if using custom bsfmt.json path, then throw error if it doesn't exist.
        if (runnerOptions.bsfmtPath && configFileExists === false) {
            throw new Error(`bsfmt file does not exist at "${bsfmtPath}"`);

            //using the default bsfmt.json path, and it doesn't exist, so just return an empty object
        } else if (configFileExists === false) {
            return null;
        }

        const contents = fsExtra.readFileSync(bsfmtPath);
        const parseErrors = [] as ParseError[];
        const config = parseJsonc(contents.toString(), parseErrors);
        //if there were errors parsing the bsfmt.json, fail now
        if (parseErrors.length > 0) {
            throw new Error(`Error parsing "${bsfmtPath}": ${printParseErrorCode(parseErrors[0].error)}`);
        }
        return config;
    }

    public normalizeArgs(args: RunnerOptions): RunnerOptions {
        args.files = Array.isArray(args.files) ? args.files : [];
        args.cwd = args.cwd ?? process.cwd();
        return args;
    }
}

export interface RunnerOptions extends FormattingOptions {
    /**
     * A list of file paths or globs
     */
    files: string[];
    /**
     * The current working directory that should be used when running this runner
     */
    cwd?: string;
    /**
     * Rewrites all processed in place. It is recommended to commit your files before using this option
     */
    write?: boolean;
    /**
     * List any unformatted files and return a nonzero eror code if any were found
     */
    check?: boolean;
    /**
     * Print absolute file paths instead of relative paths
     */
    absolute?: boolean;
    /**
     * Don't read a bsfmt.json file
     */
    noBsfmt?: boolean;
    /**
     * Use a specified path to bsfmt.json insead of the default
     */
    bsfmtPath?: string;
}
