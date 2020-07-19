#!/usr/bin/env node
import * as yargs from 'yargs';
import { Runner, RunnerOptions } from './Runner';

yargs //eslint-disable-line
    .usage('Usage: $0 <command> [options]')
    .help('h')
    .alias('h', 'help')
    .command('$0 [files..]', '', () => { }, (argv: RunnerOptions) => {
        const runner = new Runner();
        runner.run(argv).catch((e) => {
            console.error(e?.message || e);
            process.exit(1);
        });
    })
    .option('cwd', { description: 'The current working directory that should be used when running this runner', type: 'string' })
    .option('write', { description: 'This rewrites all processed in place. It is recommended to commit your files before using this option', type: 'boolean', default: false })
    .option('check', { description: 'Will list any unformatted files and return a nonzero eror code if any were found', type: 'boolean', default: false })
    .option('absolute', { description: 'If true, absolute paths are printed instead of relative paths', type: 'boolean', default: false })
    .argv;

