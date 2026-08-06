import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { BlockSpacingFormatter } from './BlockSpacingFormatter';
import { Formatter } from '../Formatter';

describe('BlockSpacingFormatter', () => {
    let formatter: BlockSpacingFormatter;
    beforeEach(() => {
        formatter = new BlockSpacingFormatter();
    });

    describe('format()', () => {
        it('returns tokens unchanged when mode is undefined', () => {
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            const result = formatter.format(tokens, {} as any);
            expect(result).to.equal(tokens);
        });

        it('returns tokens unchanged when mode is original', () => {
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            const result = formatter.format(tokens, { blockSpacing: 'original' } as any);
            expect(result).to.equal(tokens);
        });

        it('skips boundary when token has been removed (indexOf === -1)', () => {
            // A Function token whose reference doesn't exist in tokens — applyMode helpers
            // bail when indexOf returns -1.
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            const result = formatter.format(tokens, { blockSpacing: 'between' } as any);
            expect(result).to.equal(tokens);
        });

        it('skips function opener that has no matching end function (corrupt input)', () => {
            const tokens = [
                { kind: TokenKind.Function, text: 'function' },
                { kind: TokenKind.Newline, text: '\n' },
                { kind: TokenKind.Identifier, text: 'x' }
            ] as any[];
            const result = formatter.format(tokens, { blockSpacing: 'between' } as any);
            expect(result).to.be.an('array');
        });

        it('skips multi-line if opener that has no matching end if', () => {
            const tokens = [
                { kind: TokenKind.If, text: 'if' },
                { kind: TokenKind.Whitespace, text: ' ' },
                { kind: TokenKind.Identifier, text: 'x' },
                { kind: TokenKind.Whitespace, text: ' ' },
                { kind: TokenKind.Then, text: 'then' },
                { kind: TokenKind.Newline, text: '\n' },
                { kind: TokenKind.Identifier, text: 'y' }
            ] as any[];
            const result = formatter.format(tokens, { blockSpacing: 'between' } as any);
            expect(result).to.be.an('array');
        });
    });

    describe('isMultiLineIfOpener', () => {
        it('returns false when there is no `then` (e.g. corrupt input)', () => {
            const tokens = [
                { kind: TokenKind.If, text: 'if' },
                { kind: TokenKind.Newline, text: '\n' }
            ] as any[];
            expect((formatter as any).isMultiLineIfOpener(tokens, 0)).to.be.false;
        });
    });

    describe('isElseIfBranch', () => {
        it('returns true when the if is preceded by else on the same line', () => {
            const tokens = [
                { kind: TokenKind.Else, text: 'else' },
                { kind: TokenKind.Whitespace, text: ' ' },
                { kind: TokenKind.If, text: 'if' }
            ] as any[];
            expect((formatter as any).isElseIfBranch(tokens, 2)).to.be.true;
        });

        it('returns false when the if starts the line (no else above)', () => {
            const tokens = [
                { kind: TokenKind.Newline, text: '\n' },
                { kind: TokenKind.If, text: 'if' }
            ] as any[];
            expect((formatter as any).isElseIfBranch(tokens, 1)).to.be.false;
        });

        it('returns false when the if is the very first token of the stream', () => {
            const tokens = [
                { kind: TokenKind.If, text: 'if' }
            ] as any[];
            expect((formatter as any).isElseIfBranch(tokens, 0)).to.be.false;
        });
    });

    describe('ensureBlankBefore', () => {
        it('returns early when the opener token isn\'t in the stream', () => {
            const opener = { kind: TokenKind.Function, text: 'function' };
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            (formatter as any).ensureBlankBefore(tokens, opener);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when previousNewlineIdx token is not a Newline', () => {
            // A bizarre token sequence where lineStart - 1 isn't a Newline. Only
            // reachable if lineStart logic itself is wrong, but the guard exists.
            const opener = { kind: TokenKind.Function, text: 'function' };
            const tokens = [opener, { kind: TokenKind.Identifier, text: 'x' }] as any[];
            // lineStart is 0 here, so logicalLineStart === 0 returns first; this exercises
            // the L210 early return.
            (formatter as any).ensureBlankBefore(tokens, opener);
            expect(tokens.length).to.equal(2);
        });

        it('returns early when only blank lines exist above', () => {
            const opener = { kind: TokenKind.Function, text: 'function' };
            const tokens = [
                { kind: TokenKind.Newline, text: '\n' },
                { kind: TokenKind.Newline, text: '\n' },
                opener
            ] as any[];
            (formatter as any).ensureBlankBefore(tokens, opener);
            // probe < 0 path — no meaningful content above
            expect(tokens.length).to.equal(3);
        });
    });

    describe('ensureBlankAfter', () => {
        it('returns early when the closer token isn\'t in the stream', () => {
            const closer = { kind: TokenKind.EndFunction, text: 'end function' };
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            (formatter as any).ensureBlankAfter(tokens, closer);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when no Newline ends the closer\'s line', () => {
            const closer = { kind: TokenKind.EndFunction, text: 'end function' };
            const tokens = [closer] as any[];
            (formatter as any).ensureBlankAfter(tokens, closer);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when only EOF follows the closer\'s line', () => {
            const closer = { kind: TokenKind.EndFunction, text: 'end function' };
            const tokens = [
                closer,
                { kind: TokenKind.Newline, text: '\n' },
                { kind: TokenKind.Eof, text: '' }
            ] as any[];
            (formatter as any).ensureBlankAfter(tokens, closer);
            expect(tokens.length).to.equal(3);
        });
    });

    describe('ensureInnerLeadingBlank', () => {
        it('returns early when the opener token isn\'t in the stream', () => {
            const opener = { kind: TokenKind.Function, text: 'function' };
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            (formatter as any).ensureInnerLeadingBlank(tokens, opener);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when no Newline ends the opener\'s line', () => {
            const opener = { kind: TokenKind.Function, text: 'function' };
            const tokens = [opener] as any[];
            (formatter as any).ensureInnerLeadingBlank(tokens, opener);
            expect(tokens.length).to.equal(1);
        });
    });

    describe('ensureInnerTrailingBlank', () => {
        it('returns early when the closer token isn\'t in the stream', () => {
            const closer = { kind: TokenKind.EndFunction, text: 'end function' };
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            (formatter as any).ensureInnerTrailingBlank(tokens, closer);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when no Newline precedes the closer line', () => {
            const closer = { kind: TokenKind.EndFunction, text: 'end function' };
            const tokens = [closer] as any[];
            (formatter as any).ensureInnerTrailingBlank(tokens, closer);
            expect(tokens.length).to.equal(1);
        });
    });

    describe('isParentBlockOpenerLine', () => {
        it('returns false when the line is empty (no non-whitespace tokens)', () => {
            // newlineIdx 1 — line above is just whitespace
            const tokens = [
                { kind: TokenKind.Whitespace, text: '\t' },
                { kind: TokenKind.Newline, text: '\n' }
            ] as any[];
            expect((formatter as any).isParentBlockOpenerLine(tokens, 1)).to.be.false;
        });
    });

    describe('isParentBlockCloserLine', () => {
        it('returns false when given index points at nothing (out of bounds)', () => {
            const tokens = [] as any[];
            expect((formatter as any).isParentBlockCloserLine(tokens, 0)).to.be.false;
        });
    });

    describe('isMultiLineIfOpener whitespace handling', () => {
        it('skips trailing whitespace between then and newline', () => {
            const tokens = [
                { kind: TokenKind.If, text: 'if' },
                { kind: TokenKind.Whitespace, text: ' ' },
                { kind: TokenKind.Identifier, text: 'x' },
                { kind: TokenKind.Whitespace, text: ' ' },
                { kind: TokenKind.Then, text: 'then' },
                { kind: TokenKind.Whitespace, text: ' ' },
                { kind: TokenKind.Newline, text: '\n' }
            ] as any[];
            expect((formatter as any).isMultiLineIfOpener(tokens, 0)).to.be.true;
        });

        it('returns false when `if` is the very last token (cursor walks off the end)', () => {
            // No Then, no Newline, no Eof — `tokens[cursor]?.kind` returns undefined.
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[];
            expect((formatter as any).isMultiLineIfOpener(tokens, 0)).to.be.false;
        });

        it('returns false when `then` is the very last token (post-then walk runs off end)', () => {
            const tokens = [
                { kind: TokenKind.If, text: 'if' },
                { kind: TokenKind.Then, text: 'then' }
            ] as any[];
            expect((formatter as any).isMultiLineIfOpener(tokens, 0)).to.be.false;
        });
    });

    describe('findMatchingCloser depth handling', () => {
        it('matches nested same-kind closers correctly', () => {
            // Two nested multi-line ifs — the outer's EndIf must skip the inner's EndIf.
            const input =
                'sub m()\n' +
                '    print "before"\n' +
                '    if a then\n' +
                '        if b then\n' +
                '            x = 1\n' +
                '        end if\n' +
                '    end if\n' +
                '    print "after"\n' +
                'end sub\n';
            const output = new Formatter().format(input, { blockSpacing: { if: 'between' } } as any);
            expect(output).to.contain('"before"\n\n    if a then');
            expect(output).to.contain('end if\n\n    print "after"');
        });
    });

    describe('inner-padding existing blank handling', () => {
        it('leaves body alone when always mode finds existing blank at start', () => {
            const input =
                'function f()\n' +
                '\n' +
                '    return 1\n' +
                'end function\n';
            const output = new Formatter().format(input, { blockSpacing: { function: 'always' } } as any);
            expect(output).to.contain('function f()\n\n    return 1\n\nend function');
        });

        it('leaves body alone when always mode finds existing blank at end', () => {
            const input =
                'function f()\n' +
                '    return 1\n' +
                '\n' +
                'end function\n';
            const output = new Formatter().format(input, { blockSpacing: { function: 'always' } } as any);
            expect(output).to.contain('function f()\n\n    return 1\n\nend function');
        });
    });

    describe('tryWalkLeadingCommentLine', () => {
        it('returns undefined when lineStart is 0 (top of file)', () => {
            const tokens = [
                { kind: TokenKind.Identifier, text: 'x' }
            ] as any[];
            expect((formatter as any).tryWalkLeadingCommentLine(tokens, 0)).to.be.undefined;
        });

        it('returns undefined when token before lineStart is not a Newline', () => {
            const tokens = [
                { kind: TokenKind.Identifier, text: 'x' },
                { kind: TokenKind.Identifier, text: 'y' }
            ] as any[];
            expect((formatter as any).tryWalkLeadingCommentLine(tokens, 1)).to.be.undefined;
        });

        it('returns undefined when previous line is empty', () => {
            const tokens = [
                { kind: TokenKind.Newline, text: '\n' },
                { kind: TokenKind.Identifier, text: 'y' }
            ] as any[];
            expect((formatter as any).tryWalkLeadingCommentLine(tokens, 1)).to.be.undefined;
        });

        it('returns undefined when previous line is code, not a comment/annotation', () => {
            const tokens = [
                { kind: TokenKind.Identifier, text: 'x' },
                { kind: TokenKind.Newline, text: '\n' },
                { kind: TokenKind.Identifier, text: 'y' }
            ] as any[];
            expect((formatter as any).tryWalkLeadingCommentLine(tokens, 2)).to.be.undefined;
        });
    });
});
