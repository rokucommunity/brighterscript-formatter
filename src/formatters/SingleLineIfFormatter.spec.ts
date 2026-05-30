import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { SingleLineIfFormatter } from './SingleLineIfFormatter';

describe('SingleLineIfFormatter', () => {
    let formatter: SingleLineIfFormatter;
    beforeEach(() => {
        formatter = new SingleLineIfFormatter();
    });

    const fakeParser = {
        ast: {
            walk: (_visitor: any, _opts: any) => { /* no-op */ }
        }
    } as any;

    describe('format()', () => {
        it('returns tokens unchanged when mode is falsy', () => {
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            const result = formatter.format(tokens, { singleLineIf: undefined } as any, fakeParser);
            expect(result).to.equal(tokens);
        });

        it('returns tokens unchanged when mode is truthy but unrecognized', () => {
            // Covers the false branch of the inline-mode dispatch when mode is neither block nor an inline* variant
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            const result = formatter.format(tokens, { singleLineIf: 'bogus' as any } as any, fakeParser);
            expect(result).to.equal(tokens);
        });

        it('evaluates thenBranch?.statements when thenBranch is undefined', () => {
            // Covers the cond-expr branches for s.thenBranch?.statements?.length
            // by injecting a fake IfStatement (via constructor.name) into the walk
            const fakeStmt = Object.assign(
                Object.create({ constructor: { name: 'IfStatement' } }),
                { tokens: { endIf: {}, if: {} }, elseBranch: undefined, thenBranch: undefined }
            );
            const customParser = { ast: { walk: (v: any, _o: any) => v(fakeStmt) } };
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            const result = formatter.format(tokens, { singleLineIf: 'inlineNoElse' } as any, customParser as any);
            expect(result).to.equal(tokens);
        });
    });

    describe('isStandaloneIf()', () => {
        it('returns false when the if token is not found in the tokens array', () => {
            const ifToken = { kind: TokenKind.If, text: 'if' };
            const stmt = { tokens: { if: ifToken } } as any;
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[]; // ifToken not in tokens
            const result = (formatter as any).isStandaloneIf(tokens, stmt);
            expect(result).to.be.false;
        });
    });

    describe('expand()', () => {
        it('returns early when thenToken is undefined', () => {
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[];
            const stmt = { tokens: { then: undefined } } as any;
            // Should return without modifying tokens
            (formatter as any).expand(tokens, stmt, {} as any);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when thenToken is not found in tokens', () => {
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[]; // thenToken not in tokens
            const stmt = { tokens: { then: thenToken } } as any;
            (formatter as any).expand(tokens, stmt, {} as any);
            expect(tokens.length).to.equal(1);
        });

        it('inserts a Newline when the token after then is not Whitespace', () => {
            // then immediately followed by a body token (no whitespace)
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const bodyToken = { kind: TokenKind.Identifier, text: 'y' };
            const eofToken = { kind: TokenKind.Eof, text: '' };
            const tokens = [thenToken, bodyToken, eofToken] as any[];
            const stmt = { tokens: { then: thenToken } } as any;
            (formatter as any).expand(tokens, stmt, { compositeKeywords: 'split' } as any);
            // A Newline should be spliced in at index 1
            expect(tokens[1].kind).to.equal(TokenKind.Newline);
        });

        it('covers afterThen undefined and lineEnder undefined when thenToken is last token', () => {
            // afterThen?.kind: tokens[thenIdx+1] is undefined (afterThen is undefined)
            // lineEnder: tokens[lineEndIdx] is also undefined after exhausting the array
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const tokens = [thenToken] as any[];
            const stmt = { tokens: { then: thenToken } } as any;
            (formatter as any).expand(tokens, stmt, {} as any);
            // A Newline should be spliced at index 1 (afterThen was undefined → else branch)
            expect(tokens[1].kind).to.equal(TokenKind.Newline);
        });

        it('inserts a Newline before else when prev is not Whitespace', () => {
            // Synthetic chain: parent if with else where the else has no preceding ws.
            // Hits the `else` branch of the breakBefore prev?.kind check.
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const elseToken = { kind: TokenKind.Else, text: 'else' };
            const tokens = [thenToken, { kind: TokenKind.Identifier, text: 'a' }, elseToken, { kind: TokenKind.Identifier, text: 'b' }, { kind: TokenKind.Eof, text: '' }] as any[];
            const stmt = {
                tokens: { then: thenToken, else: elseToken },
                elseBranch: { constructor: { name: 'Block' } }
            } as any;
            (formatter as any).expand(tokens, stmt, {} as any);
            // The break-before insert should add a Newline at position 2 (before else).
            expect(tokens.some((t: any) => t.kind === TokenKind.Newline)).to.be.true;
        });

        it('uses "endif" text when compositeKeywords is combine', () => {
            // Covers the ternary true branch: compositeKeywords === 'combine' → 'endif'
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const bodyToken = { kind: TokenKind.Identifier, text: 'y' };
            const eofToken = { kind: TokenKind.Eof, text: '' };
            const tokens = [thenToken, bodyToken, eofToken] as any[];
            const stmt = { tokens: { then: thenToken } } as any;
            (formatter as any).expand(tokens, stmt, { compositeKeywords: 'combine' } as any);
            const endIfTok = tokens.find((t: any) => t.kind === TokenKind.EndIf);
            expect(endIfTok.text).to.equal('endif');
        });
    });

    describe('collapse()', () => {
        it('returns early when thenToken is undefined', () => {
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[];
            const stmt = { tokens: { then: undefined, endIf: {} } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when endIfToken is undefined', () => {
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[];
            const stmt = { tokens: { then: {}, endIf: undefined } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when thenToken is not found in tokens', () => {
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const endIfToken = { kind: TokenKind.EndIf, text: 'end if' };
            const tokens = [endIfToken] as any[]; // thenToken not in tokens
            const stmt = { tokens: { then: thenToken, endIf: endIfToken } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(1);
        });

    });
});
