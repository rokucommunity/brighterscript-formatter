import * as fsExtra from 'fs-extra';
import { standardizePath as s } from 'brighterscript';
import { Runner, RunnerOptions } from './Runner';
import { expect } from 'chai';
import { createSandbox, SinonSandbox } from 'sinon';
import { FormattingOptions } from './FormattingOptions';

let cwd = process.cwd();
let rootDir = s`${process.cwd()}/testRootDir`;
let baseOptions: RunnerOptions;

describe('Runner', () => {
    let sinon: SinonSandbox;
    beforeEach(() => {
        sinon = createSandbox();
    });
    afterEach(() => {
        sinon.restore();
        process.chdir(cwd);
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

    it('skips directories', async () => {
        fsExtra.mkdirSync(s`${rootDir}/source`);
        fsExtra.writeFileSync(s`${rootDir}/source/main.brs`, ``);
        const runner = new Runner();
        const spy = sinon.spy((runner as any), 'getFilePaths');
        await runner.run({
            cwd: rootDir,
            files: [
                '**/*'
            ]
        });
        expect(spy.callCount).to.equal(1);
        expect(
            spy.getCalls()[0].returnValue.map(x => s(x))
        ).to.eql([
            s`${rootDir}/source/main.brs`
        ]);
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

    describe('normalizeArgs', () => {
        it('applies default values', () => {
            let runner = new Runner();
            expect(runner.normalizeArgs({} as RunnerOptions)).to.deep.equal({
                files: [],
                cwd: process.cwd()
            });
        });
    });

    describe('bsfmt.json', () => {
        it('gets loaded from default cwd during run', async () => {
            process.chdir(rootDir);
            fsExtra.writeFileSync(s`${rootDir}/bsfmt.json`, JSON.stringify({
                formatIndent: false,
                keywordCaseOverride: {
                    'not-real-key': 'lower'
                }
            } as FormattingOptions));
            //delete cwd so the runner uses the one from process
            delete baseOptions.cwd;
            let runner = await run();
            let options = runner.formatter!.formattingOptions;
            expect(options?.formatIndent).to.be.false;
            expect(options?.keywordCaseOverride).to.have.key('not-real-key');
        });

        it('gets loaded from parameter cwd during run', async () => {
            fsExtra.ensureDirSync(s`${rootDir}/testFolder`);
            fsExtra.writeFileSync(s`${rootDir}/testFolder/bsfmt.json`, JSON.stringify({
                formatIndent: false,
                keywordCaseOverride: {
                    'not-real-key': 'lower'
                }
            } as FormattingOptions));
            let runner = await run({
                cwd: s`${rootDir}/testFolder`,
                files: []
            });
            let options = runner.formatter!.formattingOptions;
            expect(options?.formatIndent).to.be.false;
            expect(options?.keywordCaseOverride).to.have.key('not-real-key');
        });

        it('throws exception when parsing invalid json', async () => {
            fsExtra.writeFileSync(s`${rootDir}/bsfmt.json`, `{asdf`);
            let threw: boolean;
            try {
                await run();
                threw = false;
            } catch (e) {
                threw = true;
            }
            expect(threw).to.be.true;
        });
    });

    async function run(options?: RunnerOptions) {
        const runner = new Runner();
        await runner.run({
            ...baseOptions,
            ...(options ?? {})
        });
        return runner;
    }
});
