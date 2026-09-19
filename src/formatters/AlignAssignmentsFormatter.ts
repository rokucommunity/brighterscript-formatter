import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { FormattingOptions } from '../FormattingOptions';

export class AlignAssignmentsFormatter {
    public format(tokens: Token[], options: FormattingOptions): Token[] {
        // Split into lines for analysis
        const lines = this.splitByLine(tokens);

        // Find groups of consecutive simple-assignment lines and align them
        let groupStart = 0;
        while (groupStart < lines.length) {
            if (!this.isSimpleAssignment(lines[groupStart])) {
                groupStart++;
                continue;
            }
            let groupEnd = groupStart;
            while (groupEnd + 1 < lines.length && this.isSimpleAssignment(lines[groupEnd + 1])) {
                groupEnd++;
            }
            if (groupEnd > groupStart) {
                this.alignGroup(lines.slice(groupStart, groupEnd + 1));
            }
            groupStart = groupEnd + 1;
        }

        return tokens;
    }

    /**
     * Returns true if this line is a simple `identifier = value` assignment.
     * The line tokens must have: [Whitespace?] Identifier [Whitespace] Equal ...
     */
    private isSimpleAssignment(lineTokens: Token[]): boolean {
        const nonWs = lineTokens.filter(t => t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline && t.kind !== TokenKind.Eof);
        return nonWs.length >= 3 && nonWs[0].kind === TokenKind.Identifier && nonWs[1].kind === TokenKind.Equal;
    }

    /**
     * Pads the whitespace before `=` in each line so all `=` signs are column-aligned.
     * The `lines` array is a group of consecutive simple-assignment lines.
     */
    private alignGroup(lines: Token[][]): void {
        // Find the index of the Equal token in each line's non-whitespace token sequence
        // and the text length of everything before the Equal (the LHS identifier)
        const lhsLengths = lines.map(lineTokens => {
            let length = 0;
            for (const t of lineTokens) {
                if (t.kind === TokenKind.Whitespace) {
                    continue; // skip leading indent
                }
                if (t.kind === TokenKind.Equal) {
                    break;
                }
                length += t.text.length;
            }
            return length;
        });

        const maxLhs = Math.max(...lhsLengths);

        for (let i = 0; i < lines.length; i++) {
            const lineTokens = lines[i];
            // Find the whitespace token immediately before the Equal
            for (let j = 0; j < lineTokens.length; j++) {
                if (lineTokens[j].kind === TokenKind.Equal) {
                    const prevToken = lineTokens[j - 1];
                    if (prevToken && prevToken.kind === TokenKind.Whitespace) {
                        const padding = maxLhs - lhsLengths[i];
                        prevToken.text = ' '.repeat(1 + padding);
                    }
                    break;
                }
            }
        }
    }

    private splitByLine(tokens: Token[]): Token[][] {
        const lines: Token[][] = [];
        let current: Token[] = [];
        for (const token of tokens) {
            current.push(token);
            if (token.kind === TokenKind.Newline || token.kind === TokenKind.Eof) {
                lines.push(current);
                current = [];
            }
        }
        if (current.length > 0) {
            lines.push(current);
        }
        return lines;
    }
}
