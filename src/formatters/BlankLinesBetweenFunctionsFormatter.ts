import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';

const FunctionEndKinds = new Set([TokenKind.EndFunction, TokenKind.EndSub]);
const FunctionStartKinds = new Set([TokenKind.Function, TokenKind.Sub]);

export class BlankLinesBetweenFunctionsFormatter {
    public format(tokens: Token[], options: FormattingOptions): Token[] {
        const count = options.blankLinesBetweenFunctions!;

        for (let i = 0; i < tokens.length; i++) {
            // Look for end function / end sub
            if (!FunctionEndKinds.has(tokens[i].kind)) {
                continue;
            }

            // Find the Newline that ends the "end function" line
            let endLineNewlineIndex = i + 1;
            while (endLineNewlineIndex < tokens.length && tokens[endLineNewlineIndex].kind !== TokenKind.Newline && tokens[endLineNewlineIndex].kind !== TokenKind.Eof) {
                endLineNewlineIndex++;
            }
            if (tokens[endLineNewlineIndex]?.kind !== TokenKind.Newline) {
                continue;
            }

            // Scan forward over blank lines and whitespace to find the next meaningful token
            let scanIndex = endLineNewlineIndex + 1;
            const blankTokenIndexes: number[] = [];

            while (scanIndex < tokens.length) {
                const t = tokens[scanIndex];
                if (t.kind === TokenKind.Newline) {
                    blankTokenIndexes.push(scanIndex);
                    scanIndex++;
                } else if (t.kind === TokenKind.Whitespace && t.text.trim() === '') {
                    blankTokenIndexes.push(scanIndex);
                    scanIndex++;
                } else {
                    break;
                }
            }

            // Check if the next non-blank token is a function/sub start
            const nextToken = tokens[scanIndex];
            if (!nextToken || !FunctionStartKinds.has(nextToken.kind)) {
                continue;
            }

            // Remove all blank tokens between the two functions
            for (let j = blankTokenIndexes.length - 1; j >= 0; j--) {
                tokens.splice(blankTokenIndexes[j], 1);
            }

            // Insert exactly `count` blank lines (each blank line = one extra Newline)
            const insertAt = endLineNewlineIndex + 1;
            for (let j = 0; j < count; j++) {
                tokens.splice(insertAt + j, 0, {
                    kind: TokenKind.Newline,
                    text: '\n'
                } as TokenWithStartIndex);
            }

            // Advance past what we just inserted
            i = insertAt + count - 1;
        }

        return tokens;
    }
}
