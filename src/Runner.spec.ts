import * as fsExtra from 'fs-extra';
import { standardizePath as s } from 'brighterscript';
import { Runner, RunnerOptions } from './Runner';
import { expect } from 'chai';
import { createSandbox, SinonStub, SinonSandbox } from 'sinon';

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

    let consoleStub: SinonStub;
    let consoleOutput = '';
    beforeEach(() => {
        fsExtra.ensureDirSync(rootDir);
        fsExtra.emptyDirSync(rootDir);
        baseOptions = {
            cwd: rootDir,
            files: []
        };
        sinon.stub(console, 'log').callsFake((args) => {
            console.debug(args);
            //simple console output string. Probably won't handle every situation, but good enough for our tests
            consoleOutput += '\n' + args[0];
        });
    });
    afterEach(() => {
        fsExtra.emptyDirSync(rootDir);
    });

    describe.only('check', () => {
        it('catches unformatted files', () => {
            let filePath = s`${rootDir}/lib.brs`;
            let originalContents = `sub main()\nreturn1\nend sub`;
            fsExtra.writeFileSync(filePath, originalContents);
            run({
                check: true,
                files: [
                    s`${rootDir}/lib.brs`
                ]
            });

            //the check command should not overwrite the file
            expect(fsExtra.readFileSync(filePath).toString()).to.equal(originalContents);
            expect(consoleOutput).to.include('All matched files are formatted properly!');
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
