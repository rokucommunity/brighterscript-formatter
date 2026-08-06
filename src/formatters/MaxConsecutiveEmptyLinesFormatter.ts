import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { FormattingOptions } from '../FormattingOptions';

export class MaxConsecutiveEmptyLinesFormatter {
    public format(tokens: Token[], options: FormattingOptions): Token[] {
        const max = options.maxConsecutiveEmptyLines!;
        // A blank line = one extra newline. So "max blank lines" = max+1 consecutive Newline tokens.
        const allowedNewlines = max + 1;

        const result: Token[] = [];
        let consecutiveNewlines = 0;

        for (const token of tokens) {
            if (token.kind === TokenKind.Newline) {
                consecutiveNewlines++;
                if (consecutiveNewlines <= allowedNewlines) {
                    result.push(token);
                }
                // else: drop this extra newline
            } else {
                consecutiveNewlines = 0;
                result.push(token);
            }
        }
        return result;
    }
}
