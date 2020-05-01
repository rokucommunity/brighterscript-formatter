/**
 * A set of formatting options used to determine how the file should be formatted.
 */
export interface FormattingOptions {
    /**
     * The type of indentation to use when indenting the beginning of lines.
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
    keywordCaseOverride?: { [id: string]: FormattingOptions['keywordCase'] };
    /**
     * Provides a way to override keyword case at the individual TokenType level
     */
    typeCaseOverride?: { [id: string]: FormattingOptions['keywordCase'] };
    /**
     * If true (the default), all whitespace between items is reduced to exactly 1 space character,
     * and certain keywords and operators are padded with whitespace (i.e. `1+1` becomes `1 + 1`)
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
     * Forces all single-line comments to use the same style.
     * If 'singlequote' or falsey, all comments are preceeded by a single quote. This is the default.
     * If 'rem', all comments are preceeded by `rem`
     * If 'original', the comment type is unchanged
     */
    formatSingleLineCommentType?: 'singlequote' | 'rem' | 'original';
}
