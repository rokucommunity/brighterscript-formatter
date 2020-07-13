import * as fsExtra from 'fs-extra';
import { standardizePath as s } from 'brighterscript';
import { Runner, RunnerOptions } from './Runner';
import { expect } from 'chai';
import { createSandbox, SinonSandbox } from 'sinon';

let rootDir = s`${process.cwd()}/testRootDir`;
let baseOptions: RunnerOptions;

describe('Runner', () => {
    let sinon: SinonSandbox;
    beforeEach(() => {
        sinon = createSandbox();
    });
    afterEach(() => {
        sinon.restore();
    });

    let consoleOutput = '';
    beforeEach(() => {
        fsExtra.ensureDirSync(rootDir);
        fsExtra.emptyDirSync(rootDir);
        baseOptions = {
            cwd: rootDir,
            files: []
        };
        sinon.stub(console, 'log').callsFake((...args) => {
            if (consoleOutput !== '') {
                consoleOutput += '\n';
            }
            //simple console output string. Probably won't handle every situation, but good enough for our tests
            consoleOutput += args.join(' ');
        });
    });
    afterEach(() => {
        fsExtra.emptyDirSync(rootDir);
    });

    describe('check', () => {
        it('catches unformatted files', async () => {
            let filePath = s`${rootDir}/lib.brs`;
            let originalContents = `sub main()\nreturn 1\nend sub`;
            fsExtra.writeFileSync(filePath, originalContents);
            let errorMessage = '';
            try {
                await run({
                    check: true,
                    files: [
                        s`${rootDir}/lib.brs`
                    ]
                });
            } catch (e) {
                errorMessage = e.message;
            }
            expect(errorMessage).to.include('Formatting issues found in the above file(s)');
        });

        it('passes for perfectly formatted files', async () => {
            let filePath = s`${rootDir}/lib.brs`;
            let originalContents = `sub main()\n    return 1\nend sub`;
            fsExtra.writeFileSync(filePath, originalContents);
            await run({
                check: true,
                files: [
                    s`${rootDir}/lib.brs`
                ]
            });

            expect(consoleOutput).to.include('All matched files are formatted properly!');
        });

        it('does not change the file on disk unless configured to do so', async () => {
            let filePath = s`${rootDir}/lib.brs`;
            let originalContents = `sub main()\nreturn1\nend sub`;
            fsExtra.writeFileSync(filePath, originalContents);
            try {
                await run({
                    check: true,
                    write: false,
                    files: [
                        s`${rootDir}/lib.brs`
                    ]
                });
            } catch (e) {

            }

            //the check command should not overwrite the file
            expect(fsExtra.readFileSync(filePath).toString()).to.equal(originalContents);
        });
    });

    describe('write', () => {
        it('overwerites the file when the --write flag is provided', async () => {
            let filePath = s`${rootDir}/lib.brs`;
            let originalContents = `sub main()\nreturn 1\nend sub`;
            fsExtra.writeFileSync(filePath, originalContents);
            await run({
                write: true,
                files: [
                    s`${rootDir}/lib.brs`
                ]
            });

            //the check command should not overwrite the file
            expect(fsExtra.readFileSync(filePath).toString()).to.equal(`sub main()\n    return 1\nend sub`);
        });
    });

    function run(options: RunnerOptions) {
        let runner = new Runner();
        return runner.run({
            ...baseOptions,
            ...options
        });
    }
});
