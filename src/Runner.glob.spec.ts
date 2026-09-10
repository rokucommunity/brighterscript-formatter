import * as fsExtra from 'fs-extra';
import { standardizePath as s } from 'brighterscript';
import { Runner } from './Runner';
import { expect } from 'chai';

const cwd = process.cwd();
const rootDir = s`${process.cwd()}/testGlobRootDir`;

/**
 * Characterization tests for the globbing behavior of Runner.getFilePaths.
 * These were written against the original `glob-all` implementation to lock in its
 * observable semantics, then used to validate the `fast-glob` replacement.
 */
describe('Runner globbing', () => {
    beforeEach(() => {
        fsExtra.ensureDirSync(rootDir);
        fsExtra.emptyDirSync(rootDir);
    });
    afterEach(() => {
        process.chdir(cwd);
        fsExtra.removeSync(rootDir);
    });

    function write(...filePaths: string[]) {
        for (const filePath of filePaths) {
            fsExtra.outputFileSync(s`${rootDir}/${filePath}`, '');
        }
    }

    function getRawPaths(files: string[], dir = rootDir) {
        return (new Runner() as any).getFilePaths(files, dir) as string[];
    }

    /**
     * Run getFilePaths and normalize the results into sorted, rootDir-relative,
     * forward-slash paths so assertions are platform-agnostic.
     */
    function getRelativePaths(files: string[], dir = rootDir) {
        return getRawPaths(files, dir)
            .map(x => s(x).replace(s(rootDir), '').replace(/^[\\/]/, '').replace(/\\/g, '/'))
            .sort();
    }

    it('returns absolute paths', () => {
        write('source/main.brs');
        const paths = getRawPaths(['**/*.brs']);
        expect(paths).to.have.lengthOf(1);
        expect(s(paths[0])).to.equal(s`${rootDir}/source/main.brs`);
    });

    it('resolves patterns relative to the provided cwd instead of process.cwd()', () => {
        write('sub/dir/deep.brs', 'top.brs');
        const paths = getRawPaths(['**/*.brs'], s`${rootDir}/sub`);
        expect(paths).to.have.lengthOf(1);
        expect(s(paths[0])).to.equal(s`${rootDir}/sub/dir/deep.brs`);
    });

    it('excludes directories', () => {
        write('source/main.brs');
        fsExtra.ensureDirSync(s`${rootDir}/emptyDir`);
        expect(
            getRelativePaths(['**/*'])
        ).to.eql(['source/main.brs']);
    });

    it('matches a single literal relative file path', () => {
        write('lib.brs', 'other.brs');
        expect(
            getRelativePaths(['lib.brs'])
        ).to.eql(['lib.brs']);
    });

    it('matches a literal absolute file path with forward slashes', () => {
        write('lib.brs', 'other.brs');
        const absolute = s`${rootDir}/lib.brs`.replace(/\\/g, '/');
        expect(
            getRelativePaths([absolute])
        ).to.eql(['lib.brs']);
    });

    it('matches a literal absolute file path using native path separators', () => {
        write('lib.brs', 'other.brs');
        //`s` produces backslashes on windows, which is what callers of the CLI will pass in
        expect(
            getRelativePaths([s`${rootDir}/lib.brs`])
        ).to.eql(['lib.brs']);
    });

    it('matches an absolute glob pattern', () => {
        write('source/main.brs', 'source/lib.bs');
        expect(
            getRelativePaths([`${rootDir.replace(/\\/g, '/')}/**/*.brs`])
        ).to.eql(['source/main.brs']);
    });

    it('excludes files using an absolute negated pattern', () => {
        write('a.brs', 'b.brs');
        expect(
            getRelativePaths(['*.brs', `!${s`${rootDir}/b.brs`}`])
        ).to.eql(['a.brs']);
    });

    it('matches an absolute path that contains a directory with a space', () => {
        write('my dir/lib.brs');
        expect(
            getRelativePaths([s`${rootDir}/my dir/lib.brs`])
        ).to.eql(['my dir/lib.brs']);
    });

    it('returns empty array when no patterns are provided', () => {
        write('lib.brs');
        expect(getRelativePaths([])).to.eql([]);
    });

    it('returns empty array when nothing matches', () => {
        write('lib.brs');
        expect(getRelativePaths(['**/*.xml'])).to.eql([]);
    });

    it('combines results from multiple positive patterns', () => {
        write('source/main.brs', 'components/widget.xml', 'readme.md');
        expect(
            getRelativePaths(['**/*.brs', '**/*.xml'])
        ).to.eql(['components/widget.xml', 'source/main.brs']);
    });

    it('deduplicates paths matched by more than one pattern', () => {
        write('source/main.brs');
        expect(
            getRelativePaths(['**/*.brs', 'source/*.brs', '**/main.brs'])
        ).to.eql(['source/main.brs']);
    });

    it('excludes files via a negated pattern', () => {
        write('source/main.brs', 'source/roku_modules/lib.brs');
        expect(
            getRelativePaths(['**/*.brs', '!**/roku_modules/**/*'])
        ).to.eql(['source/main.brs']);
    });

    it('supports the negation pattern documented in the readme', () => {
        write('source/main.brs', 'source/roku_modules/lib.brs');
        expect(
            getRelativePaths(['source/**/*.brs', '!**/roku_modules/*.*'])
        ).to.eql(['source/main.brs']);
    });

    it('excludes an entire directory tree', () => {
        write('source/main.brs', 'node_modules/a/b.brs', 'node_modules/c.brs');
        expect(
            getRelativePaths(['**/*.brs', '!node_modules/**'])
        ).to.eql(['source/main.brs']);
    });

    it('excludes a single literal file', () => {
        write('a.brs', 'b.brs', 'c.brs');
        expect(
            getRelativePaths(['*.brs', '!b.brs'])
        ).to.eql(['a.brs', 'c.brs']);
    });

    it('applies multiple negated patterns', () => {
        write('a.brs', 'b.brs', 'c.brs', 'd.brs');
        expect(
            getRelativePaths(['*.brs', '!b.brs', '!d.brs'])
        ).to.eql(['a.brs', 'c.brs']);
    });

    it('ignores a negated pattern that matches nothing', () => {
        write('a.brs', 'b.brs');
        expect(
            getRelativePaths(['*.brs', '!**/*.xml'])
        ).to.eql(['a.brs', 'b.brs']);
    });

    it('returns empty when a negation excludes everything', () => {
        write('a.brs', 'b.brs');
        expect(
            getRelativePaths(['*.brs', '!*.brs'])
        ).to.eql([]);
    });

    it('does not match dotfiles by default', () => {
        write('.hidden.brs', 'visible.brs');
        expect(
            getRelativePaths(['*.brs'])
        ).to.eql(['visible.brs']);
    });

    it('does not descend into dot directories by default', () => {
        write('.git/config.brs', 'source/main.brs');
        expect(
            getRelativePaths(['**/*.brs'])
        ).to.eql(['source/main.brs']);
    });

    it('matches dotfiles when the pattern explicitly requests them', () => {
        write('.hidden.brs', 'visible.brs');
        expect(
            getRelativePaths(['.*.brs'])
        ).to.eql(['.hidden.brs']);
    });

    it('supports brace expansion', () => {
        write('a.brs', 'b.bs', 'c.xml');
        expect(
            getRelativePaths(['*.{brs,bs}'])
        ).to.eql(['a.brs', 'b.bs']);
    });

    it('supports single-character wildcards', () => {
        write('a.brs', 'ab.brs');
        expect(
            getRelativePaths(['?.brs'])
        ).to.eql(['a.brs']);
    });

    it('supports globstar across multiple directory levels', () => {
        write('a.brs', 'x/b.brs', 'x/y/c.brs', 'x/y/z/d.brs');
        expect(
            getRelativePaths(['**/*.brs'])
        ).to.eql(['a.brs', 'x/b.brs', 'x/y/c.brs', 'x/y/z/d.brs']);
    });

    it('supports a single-level wildcard that does not recurse', () => {
        write('a.brs', 'x/b.brs');
        expect(
            getRelativePaths(['*.brs'])
        ).to.eql(['a.brs']);
    });

    it('returns paths that exist on disk', () => {
        write('source/main.brs');
        const paths = getRawPaths(['**/*.brs']);
        expect(paths).to.have.lengthOf(1);
        for (const filePath of paths) {
            expect(fsExtra.pathExistsSync(filePath), `${filePath} should exist`).to.be.true;
        }
    });
});
