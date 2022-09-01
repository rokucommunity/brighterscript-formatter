import type { Token } from 'brighterscript';
import { Lexer, TokenKind } from 'brighterscript';
import { expect } from 'chai';

export function expectTokens(actual: Token[], expected: Array<Partial<Token> | string>) {
    //convert expected tokens into more usable format
    expected = expected.map(x => {
        if (typeof x === 'string') {
            return {
                text: x
            };
        } else {
            return x;
        }
    });

    //append an Eof token if we were not provided with one
    if ((expected[expected.length - 1] as Token)?.kind !== TokenKind.Eof) {
        expected.push({ kind: TokenKind.Eof });
    }

    const actualClones = [] as Token[];
    for (let i = 0; i < actual.length; i++) {
        const expectedDiagnostic = expected[i];
        const actualDiagnostic = cloneObject(
            actual[i],
            expectedDiagnostic,
            ['kind', 'text', 'range']
        );
        actualClones.push(actualDiagnostic as any);
    }

    expect(actualClones).to.eql(expected);
}


function cloneObject<TOriginal, TTemplate>(original: TOriginal, template: TTemplate, defaultKeys: Array<keyof TOriginal>) {
    const clone = {} as Partial<TOriginal>;
    let keys = Object.keys(template ?? {}) as Array<keyof TOriginal>;
    //if there were no keys provided, use some sane defaults
    keys = keys.length > 0 ? keys : defaultKeys;

    //only compare the specified keys from actualDiagnostic
    for (const key of keys) {
        clone[key] = original[key];
    }
    return clone;
}

/**
 * Shorthand for lexing a file and including whitespace
 */
export function lex(text: string): Token[] {
    return Lexer.scan(text, { includeWhitespace: true }).tokens;
}
