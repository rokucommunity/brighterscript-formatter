import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

/**
 * Formats `[...]` and `{...}` literals according to the `inlineArrayAndObject` option:
 *  - `'always'` collapses every multi-line literal that's safe to inline
 *  - `'never'` expands every single-line literal that has more than one item
 *  - `'fitsLine'` collapses only when the resulting line fits within `maxLineLength`
 *
 * Structural rejections apply to all collapse modes: literals containing line comments,
 * `bs:disable-line` directives, conditional-compile directives, or items whose value
 * spans multiple physical lines are never collapsed.
 */
export class InlineArrayAndObjectFormatter {
    public format(tokens: Token[], options: FormattingOptions): Token[] {
        const mode = options.inlineArrayAndObject;
        if (!mode || mode === 'original') {
            return tokens;
        }

        if (mode === 'never') {
            return this.expandAll(tokens);
        }
        return this.collapseAll(tokens, options);
    }

    private collapseAll(tokens: Token[], options: FormattingOptions): Token[] {
        const mode = options.inlineArrayAndObject;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const kinds = openCloseKinds(token);
            if (!kinds) {
                continue;
            }
            const closingToken = util.getClosingToken(tokens, i, kinds.open, kinds.close);
            if (!closingToken) {
                continue;
            }
            const closeIndex = tokens.indexOf(closingToken);
            if (!hasNewlineInRange(tokens, i + 1, closeIndex)) {
                continue;
            }
            if (!this.isInlineable(tokens, i + 1, closeIndex)) {
                continue;
            }
            if (mode === 'fitsLine' && options.maxLineLength !== undefined) {
                const tabWidth = options.indentSpaceCount ?? 4;
                const indent = visualLineLengthBeforeIndex(tokens, i, tabWidth);
                const inlinedLength = this.estimateInlinedLength(tokens, i + 1, closeIndex);
                if (indent + inlinedLength > options.maxLineLength) {
                    continue;
                }
            }
            this.collapseRange(tokens, i, kinds.close);
        }
        return tokens;
    }

    private expandAll(tokens: Token[]): Token[] {
        // Iterate in reverse so splices in earlier ranges do not invalidate later indices
        // we may have already noted. We re-resolve closing tokens via reference each time.
        const candidates: { openerIdx: number; closer: Token; closeKind: TokenKind }[] = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const kinds = openCloseKinds(token);
            if (!kinds) {
                continue;
            }
            const closingToken = util.getClosingToken(tokens, i, kinds.open, kinds.close);
            if (!closingToken) {
                continue;
            }
            const closeIndex = tokens.indexOf(closingToken);
            if (hasNewlineInRange(tokens, i + 1, closeIndex)) {
                continue;
            }
            const itemCount = this.countTopLevelItems(tokens, i + 1, closeIndex);
            if (itemCount < 2) {
                continue;
            }
            candidates.push({ openerIdx: i, closer: closingToken, closeKind: kinds.close });
        }
        for (let n = candidates.length - 1; n >= 0; n--) {
            const c = candidates[n];
            this.expandRange(tokens, c.openerIdx, c.closer);
        }
        return tokens;
    }

    /**
     * A literal is inlineable when its top-level (non-nested) contents:
     *   - contain no line comments or `bs:disable-line` directives,
     *   - contain no conditional-compile directives (`#if`/`#else if`/`#else`/`#end if`),
     *   - contain no nested literal that itself spans multiple lines, and
     *   - have no item whose value spans multiple physical lines (other than the line
     *     break that separates it from the next item).
     */
    private isInlineable(tokens: Token[], fromIdx: number, toIdx: number): boolean {
        let depth = 0;
        let prevNonWs: Token | undefined;
        for (let i = fromIdx; i < toIdx; i++) {
            const t = tokens[i];
            if (depth === 0) {
                if (t.kind === TokenKind.Comment) {
                    return false;
                }
                if (
                    t.kind === TokenKind.HashIf ||
                    t.kind === TokenKind.HashElseIf ||
                    t.kind === TokenKind.HashElse ||
                    t.kind === TokenKind.HashEndIf ||
                    t.kind === TokenKind.HashConst
                ) {
                    return false;
                }
                if (t.kind === TokenKind.RegexLiteral) {
                    // brighterscript's lexer does not include `,` in `PreceedingRegexTypes`,
                    // so a regex literal after a comma re-lexes as division. Inlining
                    // `[/regex/, /regex/]` would break re-parsing.
                    return false;
                }
                // A `function` / `sub` start at top level is a multi-line value (multi-line
                // function expressions). Even a `function()` followed by `end function` may
                // be on the same line, but the typical multi-line case is what we want to
                // reject. The hasNestedMultiLine check below also catches `function...\nend function`.
                if (t.kind === TokenKind.Function || t.kind === TokenKind.Sub) {
                    // Find the matching `end function`/`end sub` and check span. If multi-line, reject.
                    const endIdx = findMatchingFunctionEnd(tokens, i);
                    if (endIdx !== -1 && rangeContainsNewline(tokens, i + 1, endIdx)) {
                        return false;
                    }
                }
            }
            if (t.kind === TokenKind.LeftCurlyBrace || t.kind === TokenKind.LeftSquareBracket) {
                depth++;
            } else if (t.kind === TokenKind.RightCurlyBrace || t.kind === TokenKind.RightSquareBracket) {
                if (depth > 0) {
                    depth--;
                }
            }
            if (t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline) {
                prevNonWs = t;
            }
        }
        // Reject nested multi-line literals
        for (let i = fromIdx; i < toIdx; i++) {
            const t = tokens[i];
            const kinds = openCloseKinds(t);
            if (!kinds) {
                continue;
            }
            const closer = util.getClosingToken(tokens, i, kinds.open, kinds.close);
            if (!closer) {
                continue;
            }
            const closerIdx = tokens.indexOf(closer);
            if (closerIdx === -1) {
                continue;
            }
            if (rangeContainsNewline(tokens, i + 1, closerIdx)) {
                return false;
            }
            // Skip past nested literal so we don't re-enter it
            i = closerIdx;
        }
        // prevNonWs is unused beyond this point but suppresses linter "declared but unused"
        void prevNonWs;
        return true;
    }

    /**
     * Collapses tokens in (openerIdx, closingToken) from multi-line to single-line form,
     * inserting commas where missing between items.
     */
    private collapseRange(tokens: Token[], openerIdx: number, closeKind: TokenKind): void {
        const opener = tokens[openerIdx];
        // closeIndex is recomputed each iteration since tokens.length shrinks during splices.
        const closingToken = util.getClosingToken(tokens, openerIdx, opener.kind, closeKind);
        if (!closingToken) {
            return;
        }
        let closeIndex = tokens.indexOf(closingToken);
        let j = openerIdx + 1;
        while (j < closeIndex) {
            if (tokens[j].kind !== TokenKind.Newline) {
                j++;
                continue;
            }
            // Find previous meaningful token (skipping whitespace) within this literal
            let prevIdx = j - 1;
            while (prevIdx > openerIdx && tokens[prevIdx].kind === TokenKind.Whitespace) {
                prevIdx--;
            }
            const prev = tokens[prevIdx];
            const prevIsOpener = prevIdx === openerIdx;
            const prevIsComma = prev?.kind === TokenKind.Comma;

            // Find next meaningful token (skipping ws/newlines) up to closer
            let nextIdx = j + 1;
            while (
                nextIdx < closeIndex &&
                (tokens[nextIdx].kind === TokenKind.Whitespace || tokens[nextIdx].kind === TokenKind.Newline)
            ) {
                nextIdx++;
            }
            const nextIsCloser = nextIdx >= closeIndex;

            // Remove this newline
            tokens.splice(j, 1);
            closeIndex--;
            // Remove following indentation whitespace
            while (j < closeIndex && tokens[j].kind === TokenKind.Whitespace) {
                tokens.splice(j, 1);
                closeIndex--;
            }
            // If we're between items and there's no comma, insert ", "
            if (!prevIsOpener && !prevIsComma && !nextIsCloser) {
                tokens.splice(j, 0,
                    { kind: TokenKind.Comma, text: ',' } as TokenWithStartIndex,
                    { kind: TokenKind.Whitespace, text: ' ' } as TokenWithStartIndex
                );
                closeIndex += 2;
                j += 2;
            }
        }
    }

    /**
     * Expands a single-line literal (openerIdx ... closingToken) to multi-line form by
     * inserting newlines after the opener, after each top-level comma, and before the
     * closer. IndentFormatter restores correct indentation on the next pass.
     */
    private expandRange(tokens: Token[], openerIdx: number, closingToken: Token): void {
        const closeIdx = tokens.indexOf(closingToken);
        if (closeIdx === -1) {
            return;
        }
        // Collect comma indices within the top level of the literal (depth 0 relative to opener)
        const commaPositions: number[] = [];
        let depth = 0;
        for (let i = openerIdx + 1; i < closeIdx; i++) {
            const t = tokens[i];
            if (t.kind === TokenKind.LeftCurlyBrace || t.kind === TokenKind.LeftSquareBracket) {
                depth++;
            } else if (t.kind === TokenKind.RightCurlyBrace || t.kind === TokenKind.RightSquareBracket) {
                depth--;
            } else if (t.kind === TokenKind.Comma && depth === 0) {
                commaPositions.push(i);
            }
        }

        // Insert newline before the closer, after each top-level comma, and after the opener.
        // Process in descending index order to keep earlier indices stable.
        // 1. Newline before the closer (replace any preceding ws with a single newline).
        const beforeCloser = closeIdx;
        if (tokens[beforeCloser - 1]?.kind === TokenKind.Whitespace) {
            tokens.splice(beforeCloser - 1, 1, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
        } else {
            tokens.splice(beforeCloser, 0, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
        }
        // 2. Newline after each comma (replace following ws with newline).
        for (let n = commaPositions.length - 1; n >= 0; n--) {
            const commaIdx = commaPositions[n];
            const nextIdx = commaIdx + 1;
            if (tokens[nextIdx]?.kind === TokenKind.Whitespace) {
                tokens.splice(nextIdx, 1, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
            } else {
                tokens.splice(nextIdx, 0, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
            }
        }
        // 3. Newline after the opener (replace following ws with newline).
        const afterOpener = openerIdx + 1;
        if (tokens[afterOpener]?.kind === TokenKind.Whitespace) {
            tokens.splice(afterOpener, 1, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
        } else {
            tokens.splice(afterOpener, 0, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
        }
    }

    /**
     * Counts top-level items (commas + 1 if non-empty) inside a literal range.
     * Returns 0 for empty literals so the expand path can skip them.
     */
    private countTopLevelItems(tokens: Token[], fromIdx: number, toIdx: number): number {
        let hasContent = false;
        let commaCount = 0;
        let depth = 0;
        for (let i = fromIdx; i < toIdx; i++) {
            const t = tokens[i];
            if (t.kind === TokenKind.Whitespace || t.kind === TokenKind.Newline) {
                continue;
            }
            hasContent = true;
            if (t.kind === TokenKind.LeftCurlyBrace || t.kind === TokenKind.LeftSquareBracket) {
                depth++;
            } else if (t.kind === TokenKind.RightCurlyBrace || t.kind === TokenKind.RightSquareBracket) {
                depth--;
            } else if (t.kind === TokenKind.Comma && depth === 0) {
                commaCount++;
            }
        }
        if (!hasContent) {
            return 0;
        }
        return commaCount + 1;
    }

    /**
     * Estimates the inlined character length of the contents between brackets.
     * Skips newlines and indent whitespace; adds 2 for the surrounding brackets and
     * accounts for commas + spaces that the collapse pass would insert.
     */
    private estimateInlinedLength(tokens: Token[], fromIdx: number, toIdx: number): number {
        let length = 2; // surrounding brackets
        let prevWasNewline = false;
        let prevNonWsKind: TokenKind | undefined;
        for (let i = fromIdx; i < toIdx; i++) {
            const t = tokens[i];
            if (t.kind === TokenKind.Newline) {
                if (
                    prevNonWsKind !== undefined &&
                    prevNonWsKind !== TokenKind.Comma &&
                    prevNonWsKind !== TokenKind.LeftCurlyBrace &&
                    prevNonWsKind !== TokenKind.LeftSquareBracket
                ) {
                    // The collapse will insert ", " here
                    length += 2;
                }
                prevWasNewline = true;
                continue;
            }
            if (t.kind === TokenKind.Whitespace && prevWasNewline) {
                continue;
            }
            prevWasNewline = false;
            length += t.text.length;
            prevNonWsKind = t.kind;
        }
        return length;
    }
}

function openCloseKinds(token: Token): { open: TokenKind; close: TokenKind } | undefined {
    if (token.kind === TokenKind.LeftCurlyBrace) {
        return { open: TokenKind.LeftCurlyBrace, close: TokenKind.RightCurlyBrace };
    }
    if (token.kind === TokenKind.LeftSquareBracket) {
        return { open: TokenKind.LeftSquareBracket, close: TokenKind.RightSquareBracket };
    }
    return undefined;
}

function hasNewlineInRange(tokens: Token[], fromIdx: number, toIdx: number): boolean {
    for (let i = fromIdx; i < toIdx; i++) {
        if (tokens[i].kind === TokenKind.Newline) {
            return true;
        }
    }
    return false;
}

function rangeContainsNewline(tokens: Token[], fromIdx: number, toIdx: number): boolean {
    return hasNewlineInRange(tokens, fromIdx, toIdx);
}

/**
 * Returns the visual character count of everything on the current line up to (but not
 * including) tokens[idx]. Tabs are counted as `tabWidth` columns, matching the visual
 * width used by `maxLineLength` checks.
 */
function visualLineLengthBeforeIndex(tokens: Token[], idx: number, tabWidth: number): number {
    let lineStart = idx;
    while (lineStart > 0 && tokens[lineStart - 1].kind !== TokenKind.Newline) {
        lineStart--;
    }
    let length = 0;
    for (let i = lineStart; i < idx; i++) {
        const text = tokens[i].text;
        for (let c = 0; c < text.length; c++) {
            length += text[c] === '\t' ? tabWidth : 1;
        }
    }
    return length;
}

/**
 * Given an index pointing at a `function` or `sub` token, return the index of its
 * matching `end function` / `end sub`, or -1 if not found.
 */
function findMatchingFunctionEnd(tokens: Token[], startIdx: number): number {
    let depth = 0;
    for (let i = startIdx; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.kind === TokenKind.Function || t.kind === TokenKind.Sub) {
            depth++;
        } else if (t.kind === TokenKind.EndFunction || t.kind === TokenKind.EndSub) {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}
