import type { Token } from 'brighterscript';
import { AllowedLocalIdentifiers, TokenKind } from 'brighterscript';

export interface TokenWithStartIndex extends Token {
    startIndex: number;
}

export const DEFAULT_INDENT_SPACE_COUNT = 4;

export const CompositeKeywords = [
    TokenKind.EndFunction,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.ExitWhile,
    TokenKind.ExitFor,
    TokenKind.EndFor,
    TokenKind.HashElseIf,
    TokenKind.HashEndIf,
    TokenKind.EndClass,
    TokenKind.EndInterface,
    TokenKind.EndNamespace,
    TokenKind.EndTry,
    TokenKind.EndEnum
];

export const BasicKeywords = [
    TokenKind.And,
    TokenKind.Eval,
    TokenKind.If,
    TokenKind.Then,
    TokenKind.Else,
    TokenKind.For,
    TokenKind.To,
    TokenKind.Step,
    TokenKind.Exit,
    TokenKind.Each,
    TokenKind.While,
    TokenKind.Function,
    TokenKind.Sub,
    TokenKind.As,
    TokenKind.Mod,
    TokenKind.Return,
    TokenKind.Print,
    TokenKind.Goto,
    TokenKind.Dim,
    TokenKind.Stop,
    TokenKind.Void,
    TokenKind.Boolean,
    TokenKind.Integer,
    TokenKind.LongInteger,
    TokenKind.Float,
    TokenKind.Double,
    TokenKind.String,
    TokenKind.Object,
    TokenKind.Interface,
    TokenKind.Invalid,
    TokenKind.Dynamic,
    TokenKind.Or,
    TokenKind.Let,
    TokenKind.Next,
    TokenKind.Not,
    TokenKind.HashIf,
    TokenKind.HashElse,
    TokenKind.HashConst,
    TokenKind.Class,
    TokenKind.Namespace,
    TokenKind.Import,
    TokenKind.Try,
    TokenKind.Catch,
    TokenKind.Throw
];

export let Keywords: TokenKind[] = [];
Array.prototype.push.apply(Keywords, CompositeKeywords);
Array.prototype.push.apply(Keywords, BasicKeywords);

/**
 * The list of tokens that should cause an indent
 */
export let IndentSpacerTokenKinds = [
    TokenKind.Sub,
    TokenKind.For,
    TokenKind.ForEach,
    TokenKind.Function,
    TokenKind.If,
    TokenKind.LeftCurlyBrace,
    TokenKind.LeftSquareBracket,
    TokenKind.QuestionLeftSquare,
    TokenKind.While,
    TokenKind.HashIf,
    TokenKind.Class,
    TokenKind.Interface,
    TokenKind.Namespace,
    TokenKind.Try,
    TokenKind.Enum
];

/**
 * A map of tokenKinds that should not cause an indent keyed by the parent token kind
 * E.g. In 'interface', 'sub' and 'function' should not be indented
 */
export let IgnoreIndentSpacerByParentTokenKind = new Map<TokenKind, TokenKind[]>([
    [TokenKind.Interface, [
        TokenKind.Sub,
        TokenKind.Function,
        TokenKind.Enum,
        TokenKind.Class
    ]]
]);

/**
 * The list of tokens that should cause an outdent
 */
export let OutdentSpacerTokenKinds = [
    TokenKind.RightCurlyBrace,
    TokenKind.RightSquareBracket,
    TokenKind.EndFunction,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.EndFor,
    TokenKind.Next,
    TokenKind.HashEndIf,
    TokenKind.EndClass,
    TokenKind.EndInterface,
    TokenKind.EndNamespace,
    TokenKind.EndTry,
    TokenKind.EndEnum
];

/**
 * The list of tokens that should cause an outdent followed by an immediate indent
 */
export let InterumSpacingTokenKinds = [
    TokenKind.Else,
    TokenKind.HashElse,
    TokenKind.HashElseIf,
    TokenKind.Catch
];

export let CallableKeywordTokenKinds = [
    TokenKind.Function,
    TokenKind.Sub
];

export let NumericLiteralTokenKinds = [
    TokenKind.IntegerLiteral,
    TokenKind.FloatLiteral,
    TokenKind.DoubleLiteral,
    TokenKind.LongIntegerLiteral
];

/**
 * Anytime one of these tokens are found before a minus sign,
 * we can safely assume the minus sign is associated with a negative numeric literal
 */
export let TokensBeforeNegativeNumericLiteral = [
    TokenKind.Plus,
    TokenKind.Minus,
    TokenKind.Star,
    TokenKind.Forwardslash,
    TokenKind.Backslash,
    TokenKind.PlusEqual,
    TokenKind.ForwardslashEqual,
    TokenKind.MinusEqual,
    TokenKind.StarEqual,
    TokenKind.BackslashEqual,
    TokenKind.Equal,
    TokenKind.LessGreater,
    TokenKind.Greater,
    TokenKind.GreaterEqual,
    TokenKind.Less,
    TokenKind.LessEqual,
    TokenKind.LeftShift,
    TokenKind.RightShift,
    TokenKind.Return,
    TokenKind.To,
    TokenKind.Step,
    TokenKind.Colon,
    TokenKind.Semicolon,
    TokenKind.Comma,
    TokenKind.LeftSquareBracket,
    TokenKind.LeftParen,
    TokenKind.If,
    TokenKind.Print,
    TokenKind.While,
    TokenKind.Or,
    TokenKind.And,
    TokenKind.Not
];

export const TypeTokens = [
    TokenKind.Boolean,
    TokenKind.Double,
    TokenKind.Dynamic,
    TokenKind.Float,
    TokenKind.Function,
    TokenKind.Integer,
    TokenKind.Invalid,
    TokenKind.LongInteger,
    TokenKind.Object,
    TokenKind.String,
    TokenKind.Void
];

export const ConditionalCompileTokenKinds = [
    TokenKind.HashConst,
    TokenKind.HashElse,
    TokenKind.HashElseIf,
    TokenKind.HashEndIf,
    TokenKind.HashError,
    TokenKind.HashIf
];

export const CompositeKeywordStartingWords = ['end', 'exit', 'else', '#end', '#else'];

export const AllowedClassIdentifierKinds = [TokenKind.Identifier, ...AllowedLocalIdentifiers];
