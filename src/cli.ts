#!/usr/bin/env node
import * as yargs from 'yargs';
import { Runner } from './Runner';

let args = yargs
    .usage('Usage: $0 <command> [options]')
    .help('h')
    .alias('h', 'help')
    .command('$0 [files..]', '', () => { }, (argv) => {
        let runner = new Runner();
        runner.run(argv as any);
    })
    .boolean('check')
    .argv;
