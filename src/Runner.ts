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
        //load options from bsfmt.json if exists
        const bsfmtOptions = this.loadOptionsFromFile(runnerOptions.cwd ?? process.cwd());

        let args = this.normalizeArgs({
            //load any options from bsfmt.json
            ...bsfmtOptions,
            //then override with the options from the parameter
            ...runnerOptions
        });

        let filePaths = globAll.sync(args.files, {
            cwd: args.cwd,
            absolute: true
        } as IOptions);

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
     * Load the config from the `bsconfig.json` file in the cwd
     */
    public loadOptionsFromFile(cwd: string) {
        const configFilePath = path.join(cwd, 'bsfmt.json');
        if (fsExtra.pathExistsSync(configFilePath)) {
            const contents = fsExtra.readFileSync(configFilePath);
            const parseErrors = [] as ParseError[];
            const config = parseJsonc(contents.toString(), parseErrors);
            //if there were errors parsing the bsfmt.json, fail now
            if (parseErrors.length > 0) {
                throw new Error(`Error parsing "${configFilePath}": ${printParseErrorCode(parseErrors[0].error)}`);
            }
            return config;
        } else {
            return {} as FormattingOptions;
        }
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
     * This rewrites all processed in place. It is recommended to commit your files before using this option
     */
    write?: boolean;
    /**
     * Will list any unformatted files and return a nonzero eror code if any were found
     */
    check?: boolean;
    /**
     * If true, absolute paths are printed instead of relative paths
     */
    absolute?: boolean;
}
