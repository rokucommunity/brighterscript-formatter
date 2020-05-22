#!/usr/bin/env node
import * as yargs from 'yargs';
import { Runner } from './Runner';

yargs //eslint-disable-line
    .usage('Usage: $0 <command> [options]')
    .help('h')
    .alias('h', 'help')
    .command('$0 [files..]', '', () => { }, (argv: any) => {
        let runner = new Runner();
        runner.run(argv).catch((e) => {
            console.error(e);
            process.exit(-1);
        });
    })
    .boolean('check')
    .argv;
