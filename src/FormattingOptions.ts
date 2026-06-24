import { Formatter } from './Formatter';
import { TokenKind } from 'brighterscript';

export type BlockSpacing = 'before' | 'after' | 'between' | 'always' | 'original';

/**
 * Per-construct overrides for `blockSpacing`. Any construct not listed here falls back
 * to `default`, and if `default` is also omitted that construct uses `'original'`.
 *
 * `if` covers the entire if/else if/else chain (only the outer chain — inner branches
 * don't get individual spacing).
 * `for` covers both `for` and `for each` loops.
 * `try` covers the entire try/catch construct.
 */
export interface BlockSpacingOptions {
    default?: BlockSpacing;
    function?: BlockSpacing;
    sub?: BlockSpacing;
    if?: BlockSpacing;
    for?: BlockSpacing;
    while?: BlockSpacing;
    try?: BlockSpacing;
}

/**
 * A set of formatting options used to determine how the file should be formatted.
 */
export interface FormattingOptions {
    /**
     * The type of whitespace to use when indenting the beginning of lines.
     * Has no effect if `formatIndent` is false
     */
    indentStyle?: 'tabs' | 'spaces';
    /**
     * The number of spaces to use when indentStyle is 'spaces'. Default is 4.
     * Has no effect if `formatIndent` is false
     */
    indentSpaceCount?: number;
    /**
     * If true, the code is indented. If false, the existing indentation is left intact.
     */
    formatIndent?: boolean;
    /**
     * Replaces all keywords with the upper or lower case settings specified (excluding types...see `typeCase`).
     * If set to `'original'`, they are not modified at all.
     */
    keywordCase?: 'lower' | 'upper' | 'title' | 'original' | null;
    /**
     * Replaces all type keywords (`function`, `integer`, `string`, etc...) with the upper or lower case settings specified.
     * If set to `'original'`, they are not modified at all.
     * If falsey (or omitted), it defaults to the value in `keywordCase`
     */
    typeCase?: 'lower' | 'upper' | 'title' | 'original';
    /**
     * Forces all composite keywords (i.e. "elseif", "endwhile", etc...) to be consistent.
     * If 'split', they are split into their alternatives ("else if", "end while").
     * If 'combine', they are combined ("elseif", "endwhile").
     * If 'original' or falsey, they are not modified.
     */
    compositeKeywords?: 'split' | 'combine' | 'original' | null;
    /**
     * If true (the default), trailing white space is removed
     * If false, trailing white space is left intact
     */
    removeTrailingWhiteSpace?: boolean;
    /**
     * Provides a way to override keyword case at the individual TokenType level
     */
    keywordCaseOverride?: Record<string, FormattingOptions['keywordCase']>;
    /**
     * Provides a way to override type keyword case at the individual TokenType level.
     * Types are defined as keywords that are preceeded by an `as` token.
     */
    typeCaseOverride?: Record<string, FormattingOptions['keywordCase']>;
    /**
     * If true (the default), all whitespace between items are reduced to exactly 1 space character,
     * and certain keywords and operators are padded with whitespace (i.e. `1+1` becomes `1 + 1`).
     * This is a catchall property that will also disable the following rules:
     * - insertSpaceBeforeFunctionParenthesis
     * - insertSpaceBetweenEmptyCurlyBraces
     * - insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces
     * - insertSpaceAfterConditionalCompileSymbol
     * - insertSpaceBetweenAssociativeArrayLiteralKeyAndColon
     */
    formatInteriorWhitespace?: boolean;
    /**
     * If true, a space is inserted to the left of an opening function declaration parenthesis. (i.e. `function main ()` or `function ()`).
     * If false, all spacing is removed (i.e. `function main()` or `function()`).
     * @default false
     */
    insertSpaceBeforeFunctionParenthesis?: boolean;
    /**
     * if true, empty curly braces will contain exactly 1 whitespace char (i.e. `{ }`)
     * If false, there will be zero whitespace chars between empty curly braces (i.e. `{}`)
     * @default false
     */
    insertSpaceBetweenEmptyCurlyBraces?: boolean;
    /**
     * if true, conditional compile symbols will contain exactly 1 whitespace char (i.e. `# if true`)
     * if false, ensure there is no whitespace between the `#` and the keyword (i.e. `#if true`)
     * @default false
     */
    insertSpaceAfterConditionalCompileSymbol?: boolean;
    /**
     * If true, ensure exactly 1 space after leading and before trailing curly braces
     * If false, REMOVE all whitespace after leading and before trailing curly braces (excluding beginning-of-line indentation spacing)
     * @default true
     */
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces?: boolean;
    /**
     * If true, ensure exactly 1 space between an associative array literal key and its colon.
     * If false, all space between the key and its colon will be removed
     * @default false
     */
    insertSpaceBetweenAssociativeArrayLiteralKeyAndColon?: boolean;
    /**
     * Forces all single-line comments to use the same style.
     * If 'singlequote' or falsey, all comments are preceeded by a single quote. This is the default.
     * If 'rem', all comments are preceeded by `rem`
     * If 'original', the comment type is unchanged
     * @default "original"
     */
    formatSingleLineCommentType?: 'singlequote' | 'rem' | 'original';
    /**
     * For multi-line objects and arrays, move everything after the `{` or `[` and everything before
     * the `}` or `]` onto a new line.
     */
    formatMultiLineObjectsAndArrays?: boolean;
    /**
     * Sort import statements alphabetically.
     */
    sortImports?: boolean;
    /**
     * Collapse runs of consecutive blank lines down to at most this many blank lines.
     * For example, `maxConsecutiveEmptyLines: 1` collapses three blank lines in a row into one.
     * When undefined (the default), blank lines are not modified.
     */
    maxConsecutiveEmptyLines?: number;
    /**
     * Controls commas on items of multi-line arrays and associative arrays.
     * - `'always'`: ensure every item has a trailing comma (including the last)
     * - `'allButLast'`: ensure every item except the last has a trailing comma
     * - `'never'`: remove all item commas
     * - `'original'` or omitted: leave commas unchanged
     * Has no effect on single-line arrays or AAs.
     */
    trailingComma?: 'always' | 'allButLast' | 'never' | 'original';
    /**
     * Controls how `if` statements are formatted. Values are listed top-to-bottom in
     * order of increasing strictness about when block (multi-line) form is required.
     * - `'inline'`: collapse to inline form whenever the body fits on one line, including
     *   ifs with `else` and `else if` chains
     * - `'inlineNoElseIf'`: collapse to inline form, but ifs with an `else if` chain
     *   stay in block form (a single `else` is still allowed inline)
     * - `'inlineNoElse'`: only collapse simple `if/then` ifs that have no `else` at all
     * - `'block'`: always use multi-line block form (expand inline ifs to `if/then/end if`)
     * - `'original'` or omitted: leave each if as written
     */
    singleLineIf?: 'inline' | 'inlineNoElseIf' | 'inlineNoElse' | 'block' | 'original';
    /**
     * Controls how arrays and associative arrays are formatted across lines.
     * - `'always'`: collapse multi-line literals to one line (regardless of length)
     * - `'never'`: expand single-line literals to multi-line
     * - `'fitsLine'`: collapse multi-line literals only when the resulting line fits
     *   within `maxLineLength`. Falls back to `'always'` when `maxLineLength` is unset.
     * - `'original'` or omitted: leave each literal as written.
     *
     * Structural rejections apply to all collapse modes: literals containing line
     * comments, `bs:disable-line` directives, conditional-compile directives (`#if` /
     * `#else`), or items whose value spans multiple physical lines are never collapsed.
     */
    inlineArrayAndObject?: 'always' | 'never' | 'fitsLine' | 'original';
    /**
     * Target maximum line length, in characters. Currently consumed by
     * `inlineArrayAndObject: 'fitsLine'` to decide whether collapsing keeps a line
     * within budget. Reserved for future length-aware rules.
     */
    maxLineLength?: number;
    /**
     * Controls blank-line spacing around block constructs (function/sub, if/else chain,
     * for/for each, while, try/catch). Inline ifs (and inline else branches) are not
     * blocks and are skipped.
     *
     * Leading line comments immediately above a block opener are treated as part of the
     * block — `'before'` puts the blank line above the comment, not between the comment
     * and the opener. Trailing comments immediately after a closer attach to the closer.
     *
     * String form applies the same policy to every supported block type:
     * - `'before'`: ensure a blank line above the block (above any leading comment)
     * - `'after'`: ensure a blank line below the block (below any trailing comment)
     * - `'between'`: both `'before'` and `'after'`
     * - `'always'`: `'between'` plus a blank line at the start and end of the block body
     * - `'original'` (or omitted): leave spacing as written
     *
     * Object form allows per-construct overrides. `default` is the fallback for any
     * supported construct that isn't explicitly set; if `default` is also omitted, that
     * construct uses `'original'`. Setting `if` covers the entire if/else if/else chain.
     * `for` covers `for` and `for each`. `try` covers the entire try/catch construct.
     * Example:
     *
     *   { default: 'between', function: 'always', if: 'before' }
     */
    blockSpacing?: BlockSpacing | BlockSpacingOptions;
    /**
     * If true, align the `=` sign in consecutive simple assignment statements by
     * padding the left-hand side with spaces.
     * Alignment resets after a blank line or a non-assignment statement.
     * @default false
     */
    alignAssignments?: boolean;
}

export function normalizeOptions(options: FormattingOptions) {
    let fullOptions: FormattingOptions = {
        indentStyle: 'spaces',
        indentSpaceCount: Formatter.DEFAULT_INDENT_SPACE_COUNT,
        formatIndent: true,
        keywordCase: 'lower',
        compositeKeywords: 'split',
        removeTrailingWhiteSpace: true,
        keywordCaseOverride: {},
        formatInteriorWhitespace: true,
        insertSpaceBeforeFunctionParenthesis: false,
        insertSpaceBetweenEmptyCurlyBraces: false,
        insertSpaceAfterConditionalCompileSymbol: false,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
        insertSpaceBetweenAssociativeArrayLiteralKeyAndColon: false,
        formatMultiLineObjectsAndArrays: true,
        sortImports: false,
        trailingComma: 'original',
        singleLineIf: 'original',
        inlineArrayAndObject: 'original',
        blockSpacing: 'original',
        alignAssignments: false,

        //override defaults with the provided values
        ...options
    };

    if (!fullOptions.typeCase) {
        fullOptions.typeCase = fullOptions.keywordCase as any;
    }

    fullOptions.keywordCaseOverride = normalizeKeywordCaseOverride(fullOptions.keywordCaseOverride);
    fullOptions.typeCaseOverride = normalizeKeywordCaseOverride(fullOptions.typeCaseOverride);

    return fullOptions;
}

export function normalizeKeywordCaseOverride(obj: FormattingOptions['keywordCaseOverride']) {
    let result = {};

    //quit now if the object is not iterable
    if (!obj) {
        return result;
    }

    for (let key in obj) {
        let value = obj[key]
            ? obj[key]!.toLowerCase()
            : 'disabled';

        if (value === 'original') {
            value = 'disabled';
        }

        key = key
            //remove any whitespace
            .replace(/\s+/gi, '')
            //force key to lower case
            .toLowerCase();

        //replace some of the hash tokens with their corresponding TokenKind
        if (key === '#const') {
            key = TokenKind.HashConst.toLowerCase();

        } else if (key === '#else') {
            key = TokenKind.HashElse.toLowerCase();

        } else if (key === '#elseif') {
            key = TokenKind.HashElseIf.toLowerCase();

        } else if (key === '#endif') {
            key = TokenKind.HashEndIf.toLowerCase();

        } else if (key === '#error') {
            key = TokenKind.HashError.toLowerCase();

        } else if (key === '#if') {
            key = TokenKind.HashIf.toLowerCase();
        }
        result[key] = value;
    }
    return result;
}
