import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import type { BlockSpacing, BlockSpacingOptions, FormattingOptions } from '../FormattingOptions';

type Construct = 'function' | 'sub' | 'if' | 'for' | 'while' | 'try';

interface ConstructDef {
    construct: Construct;
    openerKinds: Set<TokenKind>;
    closerKinds: Set<TokenKind>;
}

/**
 * For each construct, the set of opener and closer token kinds. Used to walk forward
 * with a depth counter so the closer we find matches the opener we started at, even
 * when the same construct is nested.
 *
 * `for` and `for each` share `EndFor` so both openers contribute to the same depth.
 * `if` is special-cased — only multi-line ifs (not inline forms) count as openers.
 */
const ConstructDefs: ConstructDef[] = [
    { construct: 'function', openerKinds: new Set([TokenKind.Function]), closerKinds: new Set([TokenKind.EndFunction]) },
    { construct: 'sub', openerKinds: new Set([TokenKind.Sub]), closerKinds: new Set([TokenKind.EndSub]) },
    { construct: 'for', openerKinds: new Set([TokenKind.For, TokenKind.ForEach]), closerKinds: new Set([TokenKind.EndFor]) },
    { construct: 'while', openerKinds: new Set([TokenKind.While]), closerKinds: new Set([TokenKind.EndWhile]) },
    { construct: 'try', openerKinds: new Set([TokenKind.Try]), closerKinds: new Set([TokenKind.EndTry]) }
];

const IfOpenerKinds = new Set([TokenKind.If]);
const IfCloserKinds = new Set([TokenKind.EndIf]);

/**
 * Inserts blank lines around block constructs (and optionally inside their bodies)
 * according to the per-construct policy.
 */
export class BlockSpacingFormatter {
    public format(tokens: Token[], options: FormattingOptions): Token[] {
        const value = options.blockSpacing;
        if (!value || value === 'original') {
            return tokens;
        }
        const resolved = normalizeOptions(value);

        // Collect block ranges (opener + closer token references) so we can apply spacing
        // operations using stable token references. Process in reverse token order so
        // splices don't invalidate earlier indices we still have.
        interface Block {
            openerToken: Token;
            closerToken: Token;
            construct: Construct;
        }
        const blocks: Block[] = [];
        for (let i = 0; i < tokens.length; i++) {
            const block = this.identifyBlock(tokens, i);
            if (block) {
                blocks.push(block);
                // Skip past the closer so we don't re-enter nested constructs at this level
                // (nested ones are visited as their own iterations).
            }
        }

        for (let n = blocks.length - 1; n >= 0; n--) {
            const block = blocks[n];
            const mode = resolved[block.construct];
            if (mode === 'original') {
                continue;
            }
            this.applyMode(tokens, block.openerToken, block.closerToken, mode);
        }

        return tokens;
    }

    /**
     * If the token at `idx` opens a block, returns { opener, closer, construct }.
     * Multi-line if/else chains are reported once at the outermost `if` only — inner
     * else-if branches do not produce separate Blocks. The same applies to else-only
     * branches (closer is always the chain's final `end if`).
     */
    private identifyBlock(tokens: Token[], idx: number): { openerToken: Token; closerToken: Token; construct: Construct } | undefined {
        const t = tokens[idx];
        for (const def of ConstructDefs) {
            if (!def.openerKinds.has(t.kind)) {
                continue;
            }
            // Function/sub tokens that aren't at the start of a logical line are anonymous
            // function expressions (lambdas like `.catch(sub(e) ... end sub)`). They are
            // expressions, not declarations — they shouldn't trigger block-spacing rules.
            if ((t.kind === TokenKind.Function || t.kind === TokenKind.Sub) && !this.isTopLevelDeclaration(tokens, idx)) {
                return undefined;
            }
            const closer = findMatchingCloser(tokens, idx, def.openerKinds, def.closerKinds);
            if (!closer) {
                return undefined;
            }
            return { openerToken: t, closerToken: closer, construct: def.construct };
        }
        if (t.kind === TokenKind.If && this.isMultiLineIfOpener(tokens, idx) && !this.isElseIfBranch(tokens, idx)) {
            const closer = findMatchingCloser(tokens, idx, IfOpenerKinds, IfCloserKinds, (i) => this.isMultiLineIfOpener(tokens, i) && !this.isElseIfBranch(tokens, i));
            if (!closer) {
                return undefined;
            }
            return { openerToken: t, closerToken: closer, construct: 'if' };
        }
        return undefined;
    }

    /**
     * Returns true if the token at `idx` is the first non-whitespace token on its line
     * (i.e., a statement-level declaration). Anonymous function expressions (`x = sub() ...`,
     * `.catch(sub(e) ...)`) start partway through a line and return false.
     */
    private isTopLevelDeclaration(tokens: Token[], idx: number): boolean {
        for (let i = idx - 1; i >= 0; i--) {
            const k = tokens[i].kind;
            if (k === TokenKind.Whitespace) {
                continue;
            }
            return k === TokenKind.Newline || k === TokenKind.Eof;
        }
        return true;
    }

    /**
     * For an `if` token: returns true if its `then` is followed by a newline (multi-line).
     */
    private isMultiLineIfOpener(tokens: Token[], idx: number): boolean {
        let cursor = idx + 1;
        while (
            cursor < tokens.length &&
            tokens[cursor].kind !== TokenKind.Then &&
            tokens[cursor].kind !== TokenKind.Newline &&
            tokens[cursor].kind !== TokenKind.Eof
        ) {
            cursor++;
        }
        if (tokens[cursor]?.kind !== TokenKind.Then) {
            return false;
        }
        cursor++;
        while (cursor < tokens.length && tokens[cursor].kind === TokenKind.Whitespace) {
            cursor++;
        }
        return tokens[cursor]?.kind === TokenKind.Newline;
    }

    /**
     * Returns true if the `if` at `idx` is the inner `if` of an `else if` chain (the
     * token before it on the same line is `else`). Such ifs are part of an outer chain
     * and shouldn't get their own spacing.
     */
    private isElseIfBranch(tokens: Token[], idx: number): boolean {
        for (let i = idx - 1; i >= 0; i--) {
            const k = tokens[i].kind;
            if (k === TokenKind.Newline || k === TokenKind.Eof) {
                return false;
            }
            if (k === TokenKind.Else) {
                return true;
            }
        }
        return false;
    }

    private applyMode(tokens: Token[], opener: Token, closer: Token, mode: BlockSpacing): void {
        if (mode === 'before' || mode === 'between' || mode === 'always') {
            this.ensureBlankBefore(tokens, opener);
        }
        if (mode === 'after' || mode === 'between' || mode === 'always') {
            this.ensureBlankAfter(tokens, closer);
        }
        if (mode === 'always') {
            this.ensureInnerLeadingBlank(tokens, opener);
            this.ensureInnerTrailingBlank(tokens, closer);
        }
    }

    /**
     * Ensure a blank line above the line that contains `opener`, treating any leading
     * line comments (immediately above with no blank between) as part of the block.
     * No-op if the block is already preceded by a blank, or if the block is the first
     * meaningful content in the file.
     */
    private ensureBlankBefore(tokens: Token[], opener: Token): void {
        const openerIdx = tokens.indexOf(opener);
        if (openerIdx === -1) {
            return;
        }
        // Walk back to the start of the opener's line.
        let lineStart = openerIdx;
        while (lineStart > 0 && tokens[lineStart - 1].kind !== TokenKind.Newline) {
            lineStart--;
        }
        // Walk past any leading comment lines (comment + its terminating newline +
        // optional indent, repeating). lineStart will end up pointing at the first
        // token of the block opener's "logical line" — the topmost line of the comment
        // chain attached to it.
        let cursor = lineStart;
        while (cursor > 0) {
            const probe = this.tryWalkLeadingCommentLine(tokens, cursor);
            if (probe === undefined) {
                break;
            }
            cursor = probe;
        }
        const logicalLineStart = cursor;
        // Walk back from logicalLineStart, counting blank-line newlines.
        // logicalLineStart - 1 should be the Newline that ends the previous line.
        if (logicalLineStart === 0) {
            // Block is at the very start of the file — nothing to insert.
            return;
        }
        const previousNewlineIdx = logicalLineStart - 1;
        if (tokens[previousNewlineIdx].kind !== TokenKind.Newline) {
            return;
        }
        // Count consecutive Newlines before previousNewlineIdx (each extra is a blank line).
        let blankCount = 0;
        let probe = previousNewlineIdx - 1;
        while (probe >= 0 && tokens[probe].kind === TokenKind.Newline) {
            blankCount++;
            probe--;
        }
        // probe now points at the last non-newline token before the block. If that's
        // out of bounds (beginning of file) we have only blank lines above — nothing
        // meaningful to separate from, so skip.
        if (probe < 0) {
            return;
        }
        if (blankCount >= 1) {
            return;
        }
        // If the line directly above is itself a block-opener header (function/sub/if/...),
        // this construct is the first thing in its parent's body — don't insert a blank,
        // that's a different construct's "inner-leading" concern, not our "before" concern.
        if (this.isParentBlockOpenerLine(tokens, previousNewlineIdx)) {
            return;
        }
        // Insert one Newline before previousNewlineIdx so we get \n + \n separating
        // the previous line's content from the block's logical-line start.
        tokens.splice(previousNewlineIdx, 0, makeNewline());
    }

    /**
     * Ensure a blank line below the line that contains `closer`. A same-line trailing
     * comment (`end if ' note`) stays glued to the closer because the line-ending
     * newline naturally lives after it. Comments on subsequent lines are leading
     * comments for the next construct, not trailing for this one — they attach to
     * whatever they precede.
     */
    private ensureBlankAfter(tokens: Token[], closer: Token): void {
        const closerIdx = tokens.indexOf(closer);
        if (closerIdx === -1) {
            return;
        }
        // Walk forward to the newline that ends the closer's line (past any same-line
        // trailing comment).
        let lineEndIdx = closerIdx;
        while (lineEndIdx < tokens.length && tokens[lineEndIdx].kind !== TokenKind.Newline && tokens[lineEndIdx].kind !== TokenKind.Eof) {
            lineEndIdx++;
        }
        if (tokens[lineEndIdx]?.kind !== TokenKind.Newline) {
            return;
        }
        // Count blank lines after lineEndIdx, then skip past indent whitespace so probe
        // lands on the first content token of the next line.
        let blankCount = 0;
        let probe = lineEndIdx + 1;
        while (probe < tokens.length && tokens[probe].kind === TokenKind.Newline) {
            blankCount++;
            probe++;
        }
        while (probe < tokens.length && tokens[probe].kind === TokenKind.Whitespace) {
            probe++;
        }
        // If we hit EOF (or end of stream) immediately, don't bother inserting a blank.
        if (probe >= tokens.length || tokens[probe].kind === TokenKind.Eof) {
            return;
        }
        if (blankCount >= 1) {
            return;
        }
        // If the next non-blank line begins with a block-closer keyword (end function /
        // end if / else / catch / end namespace / etc.) this construct is the last thing
        // in its parent's body — don't insert.
        if (this.isParentBlockCloserLine(tokens, probe)) {
            return;
        }
        tokens.splice(lineEndIdx + 1, 0, makeNewline());
    }

    /**
     * Ensure a blank line at the start of the block body — after the opener's line-ending
     * newline, before the first body token. No-op if already a blank line.
     */
    private ensureInnerLeadingBlank(tokens: Token[], opener: Token): void {
        const openerIdx = tokens.indexOf(opener);
        if (openerIdx === -1) {
            return;
        }
        let lineEndIdx = openerIdx;
        while (lineEndIdx < tokens.length && tokens[lineEndIdx].kind !== TokenKind.Newline && tokens[lineEndIdx].kind !== TokenKind.Eof) {
            lineEndIdx++;
        }
        if (tokens[lineEndIdx]?.kind !== TokenKind.Newline) {
            return;
        }
        // Count consecutive Newlines after lineEndIdx.
        let blankCount = 0;
        let probe = lineEndIdx + 1;
        while (probe < tokens.length && tokens[probe].kind === TokenKind.Newline) {
            blankCount++;
            probe++;
        }
        if (blankCount >= 1) {
            return;
        }
        tokens.splice(lineEndIdx + 1, 0, makeNewline());
    }

    /**
     * Ensure a blank line at the end of the block body — before the closer's line-start,
     * after the last body token. No-op if already a blank line.
     */
    private ensureInnerTrailingBlank(tokens: Token[], closer: Token): void {
        const closerIdx = tokens.indexOf(closer);
        if (closerIdx === -1) {
            return;
        }
        // Walk back to the start of the closer's line (past any indent ws, then the newline).
        let cursor = closerIdx - 1;
        while (cursor >= 0 && tokens[cursor].kind === TokenKind.Whitespace) {
            cursor--;
        }
        if (cursor < 0 || tokens[cursor].kind !== TokenKind.Newline) {
            return;
        }
        // Count consecutive Newlines back from cursor.
        let blankCount = 0;
        let probe = cursor - 1;
        while (probe >= 0 && tokens[probe].kind === TokenKind.Newline) {
            blankCount++;
            probe--;
        }
        if (blankCount >= 1) {
            return;
        }
        tokens.splice(cursor, 0, makeNewline());
    }

    /**
     * Returns true if the line that ends at `previousNewlineIdx` starts with a token
     * that opens a block body (function/sub/if/for/while/try/else/catch). When this is
     * true, the construct we're considering is the FIRST thing inside its parent's body,
     * so a `'before'` blank would actually pad the inside of the parent — not our job.
     */
    private isParentBlockOpenerLine(tokens: Token[], previousNewlineIdx: number): boolean {
        const firstKind = firstNonWhitespaceOnLine(tokens, previousNewlineIdx);
        if (firstKind === undefined) {
            return false;
        }
        return (
            firstKind === TokenKind.Function ||
            firstKind === TokenKind.Sub ||
            firstKind === TokenKind.For ||
            firstKind === TokenKind.ForEach ||
            firstKind === TokenKind.While ||
            firstKind === TokenKind.Try ||
            firstKind === TokenKind.Catch ||
            firstKind === TokenKind.If ||
            firstKind === TokenKind.Else ||
            firstKind === TokenKind.HashIf ||
            firstKind === TokenKind.HashElse ||
            firstKind === TokenKind.HashElseIf ||
            firstKind === TokenKind.Namespace ||
            firstKind === TokenKind.Class ||
            firstKind === TokenKind.Interface ||
            firstKind === TokenKind.Enum
        );
    }

    /**
     * Returns true if the token at `nextLineFirstTokenIdx` (the first non-newline,
     * non-whitespace token of the next line) is a block-closer keyword. If yes, our
     * construct is the LAST thing in its parent's body — a `'after'` blank would pad
     * the inside of the parent.
     */
    private isParentBlockCloserLine(tokens: Token[], nextLineFirstTokenIdx: number): boolean {
        const t = tokens[nextLineFirstTokenIdx];
        if (!t) {
            return false;
        }
        return (
            t.kind === TokenKind.EndFunction ||
            t.kind === TokenKind.EndSub ||
            t.kind === TokenKind.EndIf ||
            t.kind === TokenKind.EndFor ||
            t.kind === TokenKind.EndWhile ||
            t.kind === TokenKind.EndTry ||
            t.kind === TokenKind.Else ||
            t.kind === TokenKind.Catch ||
            t.kind === TokenKind.HashEndIf ||
            t.kind === TokenKind.HashElse ||
            t.kind === TokenKind.HashElseIf ||
            t.kind === TokenKind.EndNamespace ||
            t.kind === TokenKind.EndClass ||
            t.kind === TokenKind.EndInterface ||
            t.kind === TokenKind.EndEnum
        );
    }

    /**
     * If the line directly above `lineStart` is a leading "attached preamble" line —
     * a comment (`' note`) or an annotation (`@deprecated`, `@hide`, etc.) — that's
     * part of the construct it precedes, return the index of the start of that line.
     * Otherwise return undefined. Used to walk past comment + annotation chains so a
     * `'before'` blank is inserted ABOVE the entire preamble, not between preamble and
     * the opener.
     */
    private tryWalkLeadingCommentLine(tokens: Token[], lineStart: number): number | undefined {
        if (lineStart === 0) {
            return undefined;
        }
        const newlineIdx = lineStart - 1;
        if (tokens[newlineIdx].kind !== TokenKind.Newline) {
            return undefined;
        }
        // Find the start of the line above (the line ending at newlineIdx).
        let prevLineStart = newlineIdx;
        while (prevLineStart > 0 && tokens[prevLineStart - 1].kind !== TokenKind.Newline) {
            prevLineStart--;
        }
        // Find the first non-whitespace token of that line.
        let cursor = prevLineStart;
        while (cursor < newlineIdx && tokens[cursor].kind === TokenKind.Whitespace) {
            cursor++;
        }
        if (cursor >= newlineIdx) {
            return undefined;
        }
        const firstKind = tokens[cursor].kind;
        if (firstKind !== TokenKind.Comment && firstKind !== TokenKind.At) {
            return undefined;
        }
        return prevLineStart;
    }

}

function normalizeOptions(value: BlockSpacing | BlockSpacingOptions): Record<Construct, BlockSpacing> {
    const fallback: BlockSpacing = typeof value === 'string'
        ? value
        : value.default ?? 'original';
    const obj: BlockSpacingOptions = typeof value === 'string' ? {} : value;
    return {
        function: obj.function ?? fallback,
        sub: obj.sub ?? fallback,
        if: obj.if ?? fallback,
        for: obj.for ?? fallback,
        while: obj.while ?? fallback,
        try: obj.try ?? fallback
    };
}

/**
 * Walk forward from `startIdx`, tracking a depth counter, and return the closer token
 * that matches the opener at `startIdx` (depth 1 → 0). `isOpener` filters which opener
 * tokens count toward depth — used to skip inline ifs that don't have an `EndIf`.
 */
function findMatchingCloser(
    tokens: Token[],
    startIdx: number,
    openerKinds: Set<TokenKind>,
    closerKinds: Set<TokenKind>,
    isOpener?: (i: number) => boolean
): Token | undefined {
    let depth = 1;
    for (let i = startIdx + 1; i < tokens.length; i++) {
        const t = tokens[i];
        if (openerKinds.has(t.kind) && (!isOpener || isOpener(i))) {
            depth++;
        } else if (closerKinds.has(t.kind)) {
            depth--;
            if (depth === 0) {
                return t;
            }
        }
    }
    return undefined;
}

function makeNewline(): TokenWithStartIndex {
    return { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex;
}

/**
 * Returns the kind of the first non-whitespace token on the line ending at `newlineIdx`,
 * or undefined if the line is empty.
 */
function firstNonWhitespaceOnLine(tokens: Token[], newlineIdx: number): TokenKind | undefined {
    let lineStart = newlineIdx;
    while (lineStart > 0 && tokens[lineStart - 1].kind !== TokenKind.Newline) {
        lineStart--;
    }
    let cursor = lineStart;
    while (cursor < newlineIdx && tokens[cursor].kind === TokenKind.Whitespace) {
        cursor++;
    }
    if (cursor >= newlineIdx) {
        return undefined;
    }
    return tokens[cursor].kind;
}
