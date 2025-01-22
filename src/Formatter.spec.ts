import { expect } from 'chai';
import { Formatter } from './Formatter';
import type { FormattingOptions } from './FormattingOptions';
import type { Token } from 'brighterscript';
import { createToken, TokenKind } from 'brighterscript';
import { SourceMapConsumer } from 'source-map';
import { undent } from 'undent';

describe('Formatter', () => {
    let formatter: Formatter;

    beforeEach(() => {
        formatter = new Formatter();
    });

    describe('formatIndent', () => {
        it('formats conditional compile items with spaces around the keywords', () => {
            expect(formatter.format(undent`
                sub Main(inputArguments as object)
                            #if true
                        print" one"
                        #else if true
                        print "two"
                        #else
                        print "three"
                    #end if
                    print "done"
                end sub
            `)).to.equal(undent`
                sub Main(inputArguments as object)
                    #if true
                        print" one"
                    #else if true
                        print "two"
                    #else
                        print "three"
                    #end if
                    print "done"
                end sub
            `);
        });

        it('formats with optional chaining operators', () => {
            formatEqualTrim(`
                sub setPoster()
                    if m.arr?[1] <> invalid
                        print true
                    end if
                end sub
            `);
        });

        it('formats simple if statement', () => {
            formatEqualTrim(`
                if true then
                    print "if"
                end if
                if true then
                    print "if"
                else if false then
                    print "else if"
                else
                    print "else"
                end if
            `);
        });

        it('property indents try catch statements', () => {
            formatEqualTrim(`
                try
                    throw "message"
                catch e
                    print "thrown"
                end try
            `);
        });

        it('properly indents foreach loops', () => {
            formatEqual(
                `for each item in collection\n    name = true\nend for`
            );
        });

        it('properly indents continue for in foreach loops', () => {
            formatEqual(
                `for each item in collection\n    continue for\nend for`
            );
        });

        it('properly indents continue while in while loops', () => {
            formatEqual(
                `while true\n    continue while\nend while`
            );
        });

        it('handles calling function from indexed getter', () => {
            formatEqual(`if true then\n    obj[key]()\nelse\n    print true\nend if`);
        });

        it('does not de-indent on double closing squares', () => {
            formatEqual(`sub main()\n    if true then\n        stuff = [[1], [2], [3]]\n    end if\nend sub`);
        });

        it('properly indents arrays of objects', () => {
            formatEqual('sub main()\n    val = [{\n        alive: true\n    }, {\n        alive: true\n    }]\nend sub');
        });

        it('does not explode on unmatched pairs', () => {
            formatEqual(`sub main()\n    val = [\n        [ }]`);
        });
        it('supports "single-line" if statement with multiple lines', () => {
            formatEqual(`sub main()\n    if true content.Push({\n        someProp: true\n    })\nend sub`);
        });

        it('handles various multi-line if statement types', () => {
            formatEqualTrim(`
                sub main()
                    b = 1
                    if b = 1
                        print "1"
                    end if

                    if b = 1 then
                        print "1"
                    end if

                    if b = 1
                        print "1"
                    else
                        print "1"
                    end if

                    if b = 1 then
                        print "1"
                    else
                        print "1"
                    end if

                    if b = 1
                        print "1"
                    else if b = 1
                        print "1"
                    end if

                    if b = 1
                        print "1"
                    else if b = 1 then
                        print "1"
                    end if

                    if b = 1 then
                        print "1"
                    else if b = 1
                        print "1"
                    end if

                    if b = 1 then
                        print "1"
                    else if b = 1 then
                        print "1"
                    end if

                    if b = 1
                        print "1"
                    else if b = 1
                        print "1"
                    else
                        print "1"
                    end if

                    if b = 1 then
                        print "1"
                    else if b = 1
                        print "1"
                    else
                        print "1"
                    end if

                    if b = 1
                        print "1"
                    else if b = 1 then
                        print "1"
                    else
                        print "1"
                    end if

                    if b = 1 then
                        print "1"
                    else if b = 1 then
                        print "1"
                    else
                        print "1"
                    end if

                    if true then
                        return "hls"
                    else if url.instr(".mpd") >= 0
                        return "dash"
                    else
                        return "hls"
                    end if
                end sub
            `);
        });

        it('does not mess up triple array', () => {
            formatEqualTrim(`
                sub main()
                    stuff = [[[1]]]
                end sub
            `);
        });

        it('handles various single-line if statement types', () => {
            formatEqualTrim(`
                sub main()
                    if someFunc({ a: [[{ a: 1 }, b, 21, [42]]] }) then return [
                        1, 2, 3, 4, 5
                    ]
                    if b = 1 return b
                    if b = 1 then b = 2
                    if b = 1 then b = 4 ' but this one breaks indentation
                    if b = 1 then return 2 else return 1
                    if b = 1 then return 2 else if b = 2 return 1
                    if b = 1 then return 2 else if b = 2 then return 1
                    if b = 1 then return 2 else if b = 2 then return 1 else return 1
                    if true content.Push({
                        someProp: true
                    })
                    if true then content.push({
                        someProp: true
                    })
                end sub
           `);
        });

        it('handles array in ternary properly', () => {
            formatEqualTrim(`
                sub main()
                    a = true ? [] : true
                    print a
                end sub
           `);
        });

        it('handles wrapped anon function in ternary properly', () => {
            formatEqualTrim(`
                sub main()
                    a = true ? (sub() : print hello : end sub) : true
                    print a
                end sub
           `);
        });
    });

    describe('formatMultiLineObjectsAndArrays', () => {
        it('does nothing when option is disabled', () => {
            formatEqual(`person = { a: 1\n}`, undefined, {
                formatMultiLineObjectsAndArrays: false
            });
        });

        it('does not lose trailing line', () => {
            formatEqual(
                `function GetPerson()\n    person = { exists: true,\n    }\nend function`,
                `function GetPerson()\n    person = {\n        exists: true,\n    }\nend function`
            );
        });

        it('does not insert extra newline when no newline is found', () => {
            formatEqual(`person = { `);
        });

        describe('associative arrays', () => {
            it('does not affect single-line items', () => {
                formatEqual(`person = { a: 1, b: 2 }`);
            });

            it('moves items off of brace lines when spanning multiple lines', () => {
                formatEqual(`person = { a: 1,\n b: 2 }`, `person = {\n    a: 1,\n    b: 2\n}`);
            });

            it('removes spaces for single-line when non-empty', () => {
                formatEqual(`{ a: 1,\n b: 2 }`, `{\n    a: 1,\n    b: 2\n}`);
            });

            it('keeps multiple statements on same line', () => {
                formatEqual(`{ a: 1, b: 2\nc: 3, d: 4}`, `{\n    a: 1, b: 2\n    c: 3, d: 4\n}`);
            });

            it('supports same-line nested objects', () => {
                formatEqual(`{ a: 1, b: { c: 3, d: 4 } }`);
            });

            it('keeps same-line nested objects together', () => {
                formatEqual(`{ a: 1, b: { c: 3, d: 4}\n}`, `{\n    a: 1, b: { c: 3, d: 4 }\n}`);
            });

            it('standardizes nested objects', () => {
                formatEqual(`{ a: 1, b: { c: 3, d: 4\n}}`, `{\n    a: 1, b: {\n        c: 3, d: 4\n    }\n}`);
            });
        });

        describe('arrays', () => {
            it('does not affect single-line items', () => {
                formatEqual(`person = [1, 2]`);
            });

            it('moves items off of brace lines when spanning multiple lines', () => {
                formatEqual(`person = [ 1,\n2]`, `person = [\n    1,\n    2\n]`);
            });

            it('removes spaces for single-line when non-empty', () => {
                formatEqual(`[ 1,\n 2]`, `[\n    1,\n    2\n]`);
            });

            it('keeps multiple statements on same line', () => {
                formatEqual(`[ 1, 2,\n 3, 4]`, `[\n    1, 2,\n    3, 4\n]`);
            });

            it('supports same-line nested objects', () => {
                formatEqual(`[ 1, [ 3, 4 ] ]`, `[1, [3, 4]]`);
            });

            it('keeps same-line nested objects together', () => {
                formatEqual(`[1, [3, 4]\n]`, `[\n    1, [3, 4]\n]`);
            });

            it('standardizes nested arrays', () => {
                formatEqual(`[1, [3, 4\n]]`, `[\n    1, [\n        3, 4\n    ]\n]`);
            });
        });

        it('does not separate [{ when closed by }] ', () => {
            formatEqual(`[{\n    exists: true\n}]`);
        });

        it('does not separate [[ when closed by ]]', () => {
            formatEqual(`[[\n    true\n]]`);
        });

        it(`does not indent object properties called 'class'`, () => {
            formatEqualTrim(`
                sub main()
                    m.class = 123
                end sub
            `);
        });

        it(`does not outdent for object properties called 'endclass'`, () => {
            formatEqual(`sub main()\n    if m.endclass = 123\n        print true\n    end if\nend sub`);
        });

        it(`does not indent object properties called 'endnamespace'`, () => {
            formatEqual(`sub main()\n    if m.endnamespace = 123\n        print true\n    end if\nend sub`);
        });

        it(`does not indent object properties called 'endinterface'`, () => {
            formatEqual(`sub main()\n    if m.endinterface = 123\n        print true\n    end if\nend sub`);
        });
    });

    describe('formatInteriorWhitespace', () => {
        it('normalizes whitespace for const statements', () => {
            formatEqualTrim(`
                const TOKEN = '123'
                const    TOKEN    =    '123'
                const TOKEN='123'
            `, `
                const TOKEN = '123'
                const TOKEN = '123'
                const TOKEN = '123'
            `);
        });
        it('normalizes whitespace for import statements', () => {
            formatEqualTrim(`
                import"something"
                import "something"
                import   "something"
                import\t"something"
                import\t \t"something"
            `, `
                import "something"
                import "something"
                import "something"
                import "something"
                import "something"
            `);
        });

        it('does not separate optional chaining tokens', () => {
            formatEqualTrim(`
                print arr?[0]
                print arr ?[0]

                print arr?.[0]
                print arr ?.[ 0]

                print obj?()
                print obj ?( )

                print obj?@attr
                print obj ?@ attr

                print obj?.prop
                print obj ?. prop
            `, `
                print arr?[0]
                print arr ?[0]

                print arr?.[0]
                print arr ?.[0]

                print obj?()
                print obj ?()

                print obj?@attr
                print obj ?@ attr

                print obj?.prop
                print obj ?. prop
            `);
        });

        it('formats optional chaning and ternary properly', () => {
            formatEqualTrim(`
                print true ? [1] : val()
                print true ?[1] : val()
                print arr ?[0]
            `);
        });

        it('handles various optional chaining expressions', () => {
            formatEqualTrim(`
                print arr ?[0]
                print arr ?.["0"]
                print arr?.value
                print assocArray?.[0]
                print assocArray?.getName()?.first?.second
                print createObject("roByteArray")?.value
                print createObject("roByteArray")?["0"]
                print createObject("roList")?.value
                print createObject("roList")?["0"]
                print createObject("roXmlList")?["0"]
                print createObject("roDateTime")?.value
                print createObject("roDateTime")?.GetTimeZoneOffset
                print createObject("roSGNode", "Node")?[0]
                print pi?.first?.second
                print success?.first?.second
                print a.b.xmlThing?@someAttr
                print a.b.localFunc?()
            `);
        });

        it('inserts space around `as` token', () => {
            formatEqualTrim(`
                function GetBoolean(   as    as    string  )as boolean
                    return true
                end function
            `, `
                function GetBoolean(as as string) as boolean
                    return true
                end function
            `);
        });

        describe('insertSpaceBetweenAssociativeArrayLiteralKeyAndColon', () => {
            it('adds space for inline objects', () => {
                formatEqual(`def = { "key": "value" }`, `def = { "key" : "value" }`, {
                    insertSpaceBetweenAssociativeArrayLiteralKeyAndColon: true
                });
            });
            it('removes space for inline objects', () => {
                formatEqual(`def = { "key" : "value" }`, `def = { "key": "value" }`, {
                    insertSpaceBetweenAssociativeArrayLiteralKeyAndColon: false
                });
            });

            it('adds space for multi-line objects', () => {
                formatEqualTrim(`
                    def = {
                        "key": "value"
                    }
                `, `
                    def = {
                        "key" : "value"
                    }
                `, {
                    insertSpaceBetweenAssociativeArrayLiteralKeyAndColon: true
                });
            });

            it('removes space for multi-line objects', () => {
                formatEqualTrim(`
                    def = {
                        "key" : "value"
                    }
                `, `
                    def = {
                        "key": "value"
                    }
                `, {
                    insertSpaceBetweenAssociativeArrayLiteralKeyAndColon: false
                });
            });

            it('handles comment in AA', () => {
                formatEqualTrim(`
                    def = {
                        'comment
                        "key": "value"
                    }
                `);
            });
        });

        it('handles malformed function Whitespace', () => {
            expect(formatter.format(`function add`,
                { formatIndent: false }
            )).to.equal(`function add`);
        });

        it('dedupes extra spaces', () => {
            expect(formatter.format(`
                sub  add(name   as   string)
                    name   =   name   +   "bob"
                end sub`, { formatIndent: false })).to.equal(`
                sub add(name as string)
                    name = name + "bob"
                end sub`
            );
        });

        it('adds spaces between many known token types', () => {
            expect(formatter.format(`name=name+""`)).to.equal(`name = name + ""`);
            expect(formatter.format(`age+=1`)).to.equal(`age += 1`);
            expect(formatter.format(`age-=1`)).to.equal(`age -= 1`);
            expect(formatter.format(`age*=1`)).to.equal(`age *= 1`);
            expect(formatter.format(`age/=1`)).to.equal(`age /= 1`);
            expect(formatter.format(`age\\=1`)).to.equal(`age \\= 1`);
            expect(formatter.format(`age>>=1`)).to.equal(`age >>= 1`);
            expect(formatter.format(`age<<=1`)).to.equal(`age <<= 1`);
            expect(formatter.format(`age=1+1`)).to.equal(`age = 1 + 1`);
            expect(formatter.format(`age=1-1`)).to.equal(`age = 1 - 1`);
            expect(formatter.format(`age=1*1`)).to.equal(`age = 1 * 1`);
            expect(formatter.format(`age=1/1`)).to.equal(`age = 1 / 1`);
            expect(formatter.format(`age=1\\1`)).to.equal(`age = 1 \\ 1`);
            expect(formatter.format(`age=1^1`)).to.equal(`age = 1 ^ 1`);
            expect(formatter.format(`age=1>1`)).to.equal(`age = 1 > 1`);
            expect(formatter.format(`age=1<1`)).to.equal(`age = 1 < 1`);
            expect(formatter.format(`age=1=1`)).to.equal(`age = 1 = 1`);
            expect(formatter.format(`age=1<>1`)).to.equal(`age = 1 <> 1`);
            expect(formatter.format(`age=1<=1`)).to.equal(`age = 1 <= 1`);
            expect(formatter.format(`age=1>=1`)).to.equal(`age = 1 >= 1`);
            //spacing after comma
            expect(formatter.format(`sub main(a,b,c)\nend sub`)).to.equal(`sub main(a, b, c)\nend sub`);
            expect(formatter.format(`name=1:age=2`)).to.equal(`name = 1: age = 2`);
            expect(formatter.format(`x=5:print 25; " is equal to"; x^2`)).to.equal(`x = 5: print 25; " is equal to"; x ^ 2`);
        });

        it('removes leading space around increment and decrement operators', () => {
            formatEqual(`i ++`, `i++`);
            formatEqual(`i++`, `i++`);

            formatEqual(`i --`, `i--`);
            formatEqual(`i--`, `i--`);
        });

        it('correctly formats negative numbers compared to subtraction', () => {
            expect(formatter.format(`name=2-1`)).to.equal(`name = 2 - 1`);
            expect(formatter.format(`name=-1`)).to.equal(`name = -1`);
            expect(formatter.format(`name=1+-1`)).to.equal(`name = 1 + -1`);
            expect(formatter.format(`sub main(num=-1)\nend sub`)).to.equal(`sub main(num = -1)\nend sub`);
            //DOES remove the Whitespace between them when applicable
            expect(formatter.format(`num = - 1`)).to.equal(`num = -1`);
            expect(formatter.format(`call(a, -1)`)).to.equal(`call(a, -1)`);
            expect(formatter.format(`for   i=-1    to   10`)).to.equal(`for i = -1 to 10`);
            expect(formatter.format(`for   i=-1    to   -1    step   -1`)).to.equal(`for i = -1 to -1 step -1`);
            formatEqual(`a = [1, -24]`);
            formatEqual(`a = [-24]`);
            formatEqual(`a(-24)`);
            formatEqual(`if -1 = value\nend if`);
            formatEqual(`while -1 = value\nend while`);
            formatEqual(`print -1 + 2`);
            formatEqual(`print -1 + -1`);
            expect(formatter.format(`print - 1 + - 1`)).to.equal(`print -1 + -1`);
            formatEqual(`if condition and -1 <> value\nend if`);
            formatEqual(`if condition or -1 <> value\nend if`);
            formatEqual(`if condition and not -1 <> value\nend if`);
        });

        it('correctly formats negated variable identifier', () => {
            formatEqual(`value = -value`);
            expect(formatter.format(`value=1-value`)).to.equal(`value = 1 - value`);
            expect(formatter.format(`value=1- -value`)).to.equal(`value = 1 - -value`);
            expect(formatter.format(`value=1- -  value`)).to.equal(`value = 1 - -value`);
            expect(formatter.format(`value=-value- -value`)).to.equal(`value = -value - -value`);
            formatEqual(`while -value < 0\nend while`);
            formatEqual(`if condition and -value <> -1\nend if`);
            formatEqual(`if condition or -1 <> -value\nend if`);
            formatEqual(`if condition and not -1 <> -value\nend if`);
            expect(formatter.format(`if condition and not - 1 <> - value\nend if`)).to.equal(`if condition and not -1 <> -value\nend if`);
            expect(formatter.format(`for i = - buffer to buffer`)).to.equal(`for i = -buffer to buffer`);
            expect(formatter.format(`for   i    =    -    buffer    to    buffer`)).to.equal(`for i = -buffer to buffer`);
            expect(formatter.format(`for i = - buffer to buffer step - stepVal`)).to.equal(`for i = -buffer to buffer step -stepVal`);
            expect(formatter.format(`for i = -     buffer    to    buffer   step  -  stepVal`)).to.equal(`for i = -buffer to buffer step -stepVal`);
        });

        it('works for special cases', () => {
            let program = `
sub main()
    name = "cat"
    e = previousCuePoint.end
    if true then
        print "hello"
    end if
end sub`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('ensures Whitespace between numeric literal and `then` keyword', () => {
            expect(formatter.format(`if playlist.indexOf(songEntry) = -1 then`)).to.equal(`if playlist.indexOf(songEntry) = -1 then`);
        });

        it('does not add extra Whitespace to end of line', () => {
            formatEqual('name,', 'name,');
        });

        it('removes Whitespace after square brace and paren', () => {
            formatEqual(`[ 1, 2, 3 ]`, `[1, 2, 3]`);
            formatEqual(`[ 1,\n2,\n 3\n]`, `[\n    1,\n    2,\n    3\n]`);
            formatEqual(`{name: "john"}`, `{ name: "john" }`);
            formatEqual(`doSomething( 1, 2 )`, `doSomething(1, 2)`);
        });

        it('formats exactly 1 space between logical operators', () => {
            formatEqual(
                `if(true  or  false  and  1=1  and  2>1)`,
                `if(true or false and 1 = 1 and 2 > 1)`
            );
        });

        it('removes space between function name and opening curly brace', () => {
            formatEqual(`function main ()\nend function`, `function main()\nend function`);
        });

        it('adds space between function name and opening paren', () => {
            formatEqual(`function main ()\nend function`, `function main ()\nend function`, {
                insertSpaceBeforeFunctionParenthesis: true
            });
            formatEqual(`function main()\nend function`, `function main ()\nend function`, {
                insertSpaceBeforeFunctionParenthesis: true
            });
        });

        it('removes space between anon function keyword and opening paren', () => {
            formatEqual(`func = function()\nend function`, `func = function()\nend function`);
            formatEqual(`func = function()\nend function`, `func = function()\nend function`);
        });

        it('adds space between anon function keyword and opening paren', () => {
            formatEqual(`func = function ()\nend function`, `func = function ()\nend function`, {
                insertSpaceBeforeFunctionParenthesis: true
            });
            formatEqual(`func = function()\nend function`, `func = function ()\nend function`, {
                insertSpaceBeforeFunctionParenthesis: true
            });
        });

        it('removes space between empty curly braces', () => {
            formatEqual(`person = {  }`, `person = {}`);
            formatEqual(`person = {}`, `person = {}`);
        });

        it('adds space between empty curly braces', () => {
            formatEqual(`person = { }`, `person = { }`, {
                insertSpaceBetweenEmptyCurlyBraces: true
            });
            formatEqual(`person = {}`, `person = { }`, {
                insertSpaceBetweenEmptyCurlyBraces: true
            });
        });

        it('removes whitespace between conditional compile symbol and keyword', () => {
            expect(formatter.format(undent`
                sub Main(inputArguments as object)
                    #\t const SOME_CONST = true
                    #\t if true
                        print" one"
                    #\t else if true
                        print "two"
                    #\t else
                        print "three"
                        #\t error
                        #\t error message 123
                    #\t end if
                    print "done"
                end sub
            `, { insertSpaceAfterConditionalCompileSymbol: false })).to.equal(undent`
                sub Main(inputArguments as object)
                    #const SOME_CONST = true
                    #if true
                        print" one"
                    #else if true
                        print "two"
                    #else
                        print "three"
                        #error
                        #error message 123
                    #end if
                    print "done"
                end sub
            `);

        });

        it('reduces to single space between conditional compile symbol and keyword', () => {
            expect(formatter.format(undent`
                sub Main(inputArguments as object)
                    #\t const SOME_CONST = true
                    #\t if true
                        print" one"
                    #\t else if true
                        print "two"
                    #\t else
                        print "three"
                        #\t error
                        #\t error message 123
                    #\t end if
                    print "done"
                end sub
            `, { insertSpaceAfterConditionalCompileSymbol: true })).to.equal(undent`
                sub Main(inputArguments as object)
                    # const SOME_CONST = true
                    # if true
                        print" one"
                    # else if true
                        print "two"
                    # else
                        print "three"
                        # error
                        # error message 123
                    # end if
                    print "done"
                end sub
            `);
        });

        it('adds single space between conditional compile symbol and keyword', () => {
            expect(formatter.format(undent`
                sub Main(inputArguments as object)
                    #const SOME_CONST = true
                    #if true
                        print" one"
                    #else if true
                        print "two"
                    #else
                        print "three"
                        #error
                        #error message 123
                    #end if
                    print "done"
                end sub
            `, { insertSpaceAfterConditionalCompileSymbol: true })).to.equal(undent`
                sub Main(inputArguments as object)
                    # const SOME_CONST = true
                    # if true
                        print" one"
                    # else if true
                        print "two"
                    # else
                        print "three"
                        # error
                        # error message 123
                    # end if
                    print "done"
                end sub
            `);
        });

        it('removes space between empty parens', () => {
            formatEqual(`main( )`, `main()`);
            formatEqual(`main()`, `main()`);
        });

        it('removes leading space when comma appears next to an item', () => {
            formatEqual(`action("value" ,"otherValue")`, `action("value", "otherValue")`);
        });

        it('removes whitespace if present in component scope variable declaration', () => {
            expect(formatter.format(`m.a`)).to.equal(`m.a`);
            expect(formatter.format(`m.foo`)).to.equal(`m.foo`);
            expect(formatter.format(`m. a`)).to.equal(`m.a`);
            expect(formatter.format(`m. foo`)).to.equal(`m.foo`);
            expect(formatter.format(`m .a`)).to.equal(`m.a`);
            expect(formatter.format(`m .foo`)).to.equal(`m.foo`);
            expect(formatter.format(`m . a`)).to.equal(`m.a`);
            expect(formatter.format(`m . foo`)).to.equal(`m.foo`);
        });

        it('formats with optional chaining operators', () => {
            formatEqual(
                `m. alpha = m. alpha`,
                `m.alpha = m.alpha`
            );
            formatEqual(
                `m .beta = m .beta`,
                `m.beta = m.beta`
            );
            formatEqual(
                `m . charlie = m . charlie`,
                `m.charlie = m.charlie`
            );
            formatEqual(
                `print alpha . beta`,
                `print alpha.beta`
            );
            formatEqual(
                `doSomething(alpha . beta)`,
                `doSomething(alpha.beta)`
            );
            formatEqual(
                `doSomething(doSomethingElse( alpha . beta . charlie))`,
                `doSomething(doSomethingElse(alpha.beta.charlie))`
            );
            formatEqual(
                `value = alpha . beta + delta . charlie`,
                `value = alpha.beta + delta.charlie`
            );
            formatEqual(
                `value = 1 + (alpha . beta * (delta . charlie - 2) )`,
                `value = 1 + (alpha.beta * (delta.charlie - 2))`
            );
            formatEqual(
                `value = { alpha: beta . charlie }`,
                `value = { alpha: beta.charlie }`
            );
        });

        it('disabling the rule works', () => {
            expect(formatter.format(`a=1`)).to.equal('a = 1');
            //disabled
            expect(formatter.format(`a=1`, {
                formatInteriorWhitespace: false
            })).to.equal('a=1');
        });
    });

    describe('indentStyle', () => {
        it('indents enums', () => {
            expect(formatter.format(
                'enum Direction\nup="up"\ndown="down"\nendenum'
            )).to.equal(
                'enum Direction\n    up = "up"\n    down = "down"\nend enum'
            );
        });

        it('indents namespaced enums', () => {
            expect(formatter.format(
                'namespace stuff\nenum Direction\nup="up"\ndown="down"\nend enum\nend namespace'
            )).to.equal(
                'namespace stuff\n    enum Direction\n        up = "up"\n        down = "down"\n    end enum\nend namespace'
            );
        });

        it('correctly fixes indentation for namespace', () => {
            expect(formatter.format(
                'namespace A.B\nsub main()\nend sub\nend namespace'
            )).to.equal(
                'namespace A.B\n    sub main()\n    end sub\nend namespace'
            );
        });

        it('correctly indents class declarations', () => {
            expect(formatter.format(
                'class Person\nsub new()\nend sub\nend class'
            )).to.equal(
                'class Person\n    sub new()\n    end sub\nend class'
            );
        });

        it('correctly indents interface declarations', () => {
            expect(formatter.format(
                'interface Person\nname as string\nend interface'
            )).to.equal(
                'interface Person\n    name as string\nend interface'
            );
        });

        it('correctly indents interface declarations that contain functions or subs', () => {
            expect(formatter.format(
                'interface Person\nname as string\nsub talk(words as string)\nfunction getAge() as integer\nend interface'
            )).to.equal(
                'interface Person\n    name as string\n    sub talk(words as string)\n    function getAge() as integer\nend interface'
            );
        });

        it('correctly indents multiple interfaces', () => {
            expect(formatter.format(
                'interface IFaceA\na as string\nsub doA()\nend interface\ninterface IFaceB\nb as string\nsub doB()\nend interface'
            )).to.equal(
                'interface IFaceA\n    a as string\n    sub doA()\nend interface\ninterface IFaceB\n    b as string\n    sub doB()\nend interface'
            );
        });

        it('correctly indents class methods with access modifiers', () => {
            expect(formatter.format(
                'class Person\npublic sub a()\nend sub\nprotected sub b()\nend sub\nprivate sub c()\nend sub\nend class'
            )).to.equal(
                'class Person\n    public sub a()\n    end sub\n    protected sub b()\n    end sub\n    private sub c()\n    end sub\nend class'
            );
        });

        it('correctly indents class method body with access modifiers', () => {
            expect(formatter.format(
                'class Person\npublic sub a()\nprint "hello"\nend sub\nend class'
            )).to.equal(
                'class Person\n    public sub a()\n        print "hello"\n    end sub\nend class'
            );
        });

        it('correctly indents class method body with override keyword', () => {
            expect(formatter.format(
                'class Person\noverride sub a()\nprint "hello"\nend sub\nend class'
            )).to.equal(
                'class Person\n    override sub a()\n        print "hello"\n    end sub\nend class'
            );
        });

        it('correctly indents class method body with access modifier AND override keyword', () => {
            expect(formatter.format(
                'class Person\npublic override sub a()\nprint "hello"\nend sub\nend class'
            )).to.equal(
                'class Person\n    public override sub a()\n        print "hello"\n    end sub\nend class'
            );
        });

        it('correctly indents function class modifiers', () => {
            expect(formatter.format(
                'function class()\nend function'
            )).to.equal(
                'function class()\nend function'
            );
        });

        it('correctly indents function class modifiers with print statement', () => {
            expect(formatter.format(
                'function class()\nprint "hello"\nend function'
            )).to.equal(
                'function class()\n    print "hello"\nend function'
            );
        });

        it('correctly indents function enum modifiers', () => {
            expect(formatter.format(
                'function enum()\nend function'
            )).to.equal(
                'function enum()\nend function'
            );
        });

        it('correctly indents function enum modifiers with print statement', () => {
            expect(formatter.format(
                'function enum()\nprint "hello"\nend function'
            )).to.equal(
                'function enum()\n    print "hello"\nend function'
            );
        });

        it('correctly indents function with try having contents', () => {
            expect(formatter.format(`
                function try
                try
                print "hello"
                catch e
                print "world"
                end try
                print "done"
                end function
            `)).to.equal(undent`
                function try
                    try
                        print "hello"
                    catch e
                        print "world"
                    end try
                    print "done"
                end function
            `);
        });

        it('trims empty lines', () => {
            expect(formatter.format(`sub a()\n    \nend sub`)).to.equal(`sub a()\n\nend sub`);
        });
        it('does not fail with comments next to if statement', () => {
            let program = `sub a()\n    if true then 'comment\n        return true\n    end if\nend sub`;
            expect(formatter.format(program)).to.equal(program);
        });
        it('does not change correctly formatted programs', () => {
            let program = `sub add(a, b)\n    return a + b\nend sub`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('skips indentation when formatIndent === false', () => {
            let program = `    sub add(a, b)\nreturn a + b\n    end sub`;
            expect(formatter.format(program, { formatIndent: false })).to.equal(program);
        });

        it('formats single tabs', () => {
            let program = `sub add(a, b)\n\treturn a + b\nend sub`;
            expect(formatter.format(program, { indentStyle: 'tabs' })).to.equal(program);
        });

        it('formats improperly formatted programs', () => {
            expect(formatter.format(`sub add()\nreturn a+b\nend sub`)).to.equal(`sub add()\n    return a + b\nend sub`);
            expect(formatter.format(`    sub add()\n        return a+b\n    end sub`)).to.equal(`sub add()\n    return a + b\nend sub`);
        });

        it('handles intermediate elseif', () => {
            expect(formatter.format(
                `sub add()\nif true then\na=1\nelse if true then\na=1\nend if\nend sub`)
            ).to.equal(
                `sub add()\n    if true then\n        a = 1\n    else if true then\n        a = 1\n    end if\nend sub`
            );
        });

        it('handles return token properly', () => {
            expect(formatter.format(
                `sub main()\n if msg.isScreenClosed() then return\n end sub`)
            ).to.equal(
                `sub main()\n    if msg.isScreenClosed() then return\nend sub`
            );

            expect(formatter.format(
                `sub main()\n if msg.isScreenClosed() then\n return\nend if\n end sub`)
            ).to.equal(
                `sub main()\n    if msg.isScreenClosed() then\n        return\n    end if\nend sub`
            );
        });

        it('handles line comments', () => {
            expect(formatter.format(
                `sub main()\n'comment1\n'comment2\nend sub`)
            ).to.equal(
                `sub main()\n    'comment1\n    'comment2\nend sub`
            );
        });

        it('does not double-indent for function keyword used as type', () => {
            expect(formatter.format(
                `function work(callback as function) as function\n'comment\nend function`)
            ).to.equal(
                `function work(callback as function) as function\n    'comment\nend function`
            );
        });

        it('does not double-indent for sub keyword used as type', () => {
            expect(formatter.format(
                `sub work(callback as sub) as sub\n'comment\nend sub`)
            ).to.equal(
                `sub work(callback as sub) as sub\n    'comment\nend sub`
            );
        });

        it('does not double-indent curly square on same line', () => {
            formatEqual(`theVar = [{\n    name = "bob"\n}]`);
        });

        it('works for arrays with objects in them on separate lines', () => {
            formatEqual(`theVar = [\n    {\n        name = "bob"\n    }\n]`);
        });
    });

    describe('indentSpaceCount', () => {
        it('defaults to 4 spaces', () => {
            let formatted = formatter.format(`sub main()\n'comment1\n'comment2\nend sub`);
            expect(formatted.indexOf('    ')).to.equal(11);
        });

        it('allows overriding indentSpaceCount', () => {
            expect(formatter.format(
                `sub main()\n'comment1\n'comment2\nend sub`
                , { indentSpaceCount: 2 }
            )).to.equal(
                `sub main()\n  'comment1\n  'comment2\nend sub`
            );
        });

        it('handles default when invalid provided', () => {
            expect(formatter.format(
                `sub main()\n'comment1\n'comment2\nend sub`
                , { indentSpaceCount: undefined }
            )).to.equal(
                `sub main()\n    'comment1\n    'comment2\nend sub`
            );
        });
    });

    describe('special cases', () => {
        it('open close brace on same line', () => {
            let program = `function http_request()\n    scope = { request: request, port: port, url: url, immediatelyFailed: true }\nend function`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('nested if statements', () => {
            let program = `if (a) then\n    doSomething()\nelse\n    if (b) then\n        doSomething()\n    end if\nend if`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('does not de-indent for a method called "next"', () => {
            let program = `if true then\n    m.top.returnString = m.someArray.next()\nend if`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('does not de-indent when the word `next` is used as an object property', () => {
            formatEqual(`sub a()\n    m.next = true\n    m.t = true\nend sub`);
        });

        it('handles string multiple string literals on same line', () => {
            let program = `function test()\n    asdf = "asdf: " + anytostring(m.asdf["asdf"])\nend function`;
            expect(formatter.format(program)).to.equal(program);

            program = `if (m.externalAuth) then\n    jsonData["Access Type"] = "Accessible"\nelse\n    jsonData["Access Type"] = "Link Required"\nend if`;
            expect(formatter.format(program)).to.equal(program);

            program = `lineups_index["audio"] = CreateObject("roAssociativeArray")\nlineups_index["video"] = CreateObject("roAssociativeArray")\nci = 0`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('handles single-line if-then statements', () => {
            let program = `sub test()\n    if true then print "true"\nend sub`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('handles single-line if-then-else statements', () => {
            formatEqual(`sub test()\n    if true then print "true" else print "true"\nend sub`);
        });

        it('handles resetting outdent when gone into the negative', () => {
            formatEqual(undent`
                sub test()
                    if true then
                        doSomething()
                    end if
                end if 'out of place "end if" shouldn't kill lower formatting
                end sub
                sub test2()
                    doSomething()
                end sub
            `);
        });

        it('it works with identifiers that start with rem', () => {
            expect(formatter.format(
                `    if (removeFoo <> invalid) then\n        lineups["video"].push(invalid)`
            )).to.equal(
                `if (removeFoo <> invalid) then\n    lineups["video"].push(invalid)`
            );
        });

        it('works with if statements that do not have a "then" after them', () => {
            let program = `if (request.AsyncGetToString())\n    scope.immediatelyFailed = false\nelse\n    scope.immediatelyFailed = true\nend if`;
            expect(formatter.format(program)).to.equal(program);
        });
    });

    describe('typeCase', () => {
        it('uses keywordCase when not specified', () => {
            expect(formatter.format(
                `SUB a(name AS STRING, cb AS FUNCTION)`,
                {
                    keywordCase: 'lower'
                }
            )).to.equal(
                `sub a(name as string, cb as function)`
            );
        });

        it('only formats types', () => {
            formatEqual(
                `sub a(name as STRing, age as LIBRARY)`,
                `sub a(name as string, age as LIBRARY)`,
                {
                    typeCase: 'lower'
                }
            );
        });

        it('overrides keywordCase when specified', () => {
            expect(formatter.format(
                `SUB a(name AS STRING, cb AS FUNCTION)`,
                {
                    keywordCase: 'lower',
                    typeCase: 'title'
                }
            )).to.equal(
                `sub a(name as String, cb as Function)`
            );
        });

        it('overrides keywordCase even when keyword case is omitted', () => {
            expect(formatter.format(
                `SUB a(name AS STRING, cb AS FUNCTION)`,
                {
                    typeCase: 'title'
                }
            )).to.equal(
                `sub a(name as String, cb as Function)`
            );
        });

        it('works even when keywordCase is disabled', () => {
            expect(formatter.format(
                `SUB a(name AS STRING, cb AS FUNCTION)`,
                {
                    keywordCase: null,
                    typeCase: 'title'
                }
            )).to.equal(
                `SUB a(name AS String, cb AS Function)`
            );
        });

        it('does not work when both keywordCase and typeCase are disabled', () => {
            expect(formatter.format(
                `SUB a(name AS STRING, cb AS FUNCTION)`,
                {
                    keywordCase: undefined,
                    typeCase: undefined
                }
            )).to.equal(
                `SUB a(name AS STRING, cb AS FUNCTION)`
            );
        });

        it('does not format custom types', () => {
            expect(formatter.format(
                `sub a(person as SomePersonClass)`,
                {
                    typeCase: 'lower'
                }
            )).to.equal(
                `sub a(person as SomePersonClass)`
            );
        });
    });

    describe('compositeKeywords', () => {
        it(`works for 'combine'`, () => {
            expect(formatter.format(
                `elseif`,
                {
                    compositeKeywords: 'combine'
                }
            )).to.equal(
                `elseif`
            );
        });

        it(`works for 'combine'`, () => {
            expect(formatter.format(
                `function a()\nend function`,
                {
                    compositeKeywords: 'combine'
                }
            )).to.equal(
                `function a()\nendfunction`
            );
        });

        it(`works for 'split'`, () => {
            expect(formatter.format(
                `function a()\nendfunction`,
                {
                    compositeKeywords: 'split'
                }
            )).to.equal(
                `function a()\nend function`
            );
        });

        it(`works for 'original'`, () => {
            expect(formatter.format(
                `function a()\nend  function`,
                {
                    compositeKeywords: 'original'
                }
            )).to.equal(
                `function a()\nend  function`
            );
        });

        it(`works when not specified`, () => {
            expect(formatter.format(
                `function a()\nendfunction`,
                {
                }
            )).to.equal(
                `function a()\nend function`
            );
        });

        it(`leaves alone when provided and set to undefined`, () => {
            expect(formatter.format(
                `function a()\nend   function`,
                {
                    compositeKeywords: undefined
                }
            )).to.equal(
                `function a()\nend   function`
            );
        });

        it('handles endtry', () => {
            formatEqualTrim(`
                try
                catch
                endtry
            `, `
                try
                catch
                end try
            `, {
                compositeKeywords: 'split'
            });
        });
    });

    describe('keywordCase', () => {

        it('formats mod properly', () => {
            formatEqual(`value = 1 MoD 2`, `value = 1 mod 2`, { keywordCase: 'lower' });
            formatEqual(`value = 1 MoD 2`, `value = 1 Mod 2`, { keywordCase: 'title' });
            formatEqual(`value = 1 MoD 2`, `value = 1 MOD 2`, { keywordCase: 'upper' });
            formatEqual(`value = 1 MoD 2`, `value = 1 MoD 2`, { keywordCase: 'original' });
        });

        it('does not change aa prop keywords', () => {
            formatEqual(`a = { MoD: true, AnD: true }`, undefined, { keywordCase: 'lower' });
        });

        it('forces keywords to upper case', () => {
            expect(formatter.format(
                `sub add()\nif true then\na=1\nelseif true then\na=1\nendif\nendsub`,
                {
                    keywordCase: 'upper',
                    compositeKeywords: 'original'
                }
            )).to.equal(
                `SUB add()\n    IF true THEN\n        a = 1\n    ELSEIF true THEN\n        a = 1\n    ENDIF\nENDSUB`
            );
        });

        // it('does not format function or sub case when used as types', () => {
        //     expect(formatter.format(
        //         `FUNCTION add(cb1 as FUNCTION, cb2 as SUB)\nENDSUB`,
        //         {
        //             keywordCase: 'lower',
        //             compositeKeywords: 'original'
        //         }
        //     )).to.equal(
        //         `function add(cb1 as FUNCTION, cb2 as SUB)\n`
        //     );
        // });

        it('works with `as` keyword', () => {
            expect(formatter.format(
                `sub add(name AS string)\nend sub`,
                {
                    keywordCase: 'lower'
                }
            )).to.equal(
                `sub add(name as string)\nend sub`
            );
        });

        it('forces keywords to lower case', () => {
            expect(formatter.format(
                `SUB add()\n    IF true THEN\n        a=1\n    ELSEIF true THEN\n        a=1\n    ENDIF\nENDSUB`,
                {
                    keywordCase: 'lower',
                    compositeKeywords: 'original'
                }
            )).to.equal(
                `sub add()\n    if true then\n        a = 1\n    elseif true then\n        a = 1\n    endif\nendsub`
            );
        });

        it('formats try/catch/throw/endtry', () => {
            formatEqualTrim(`
                TRY
                    THROW "message"
                CATCH e
                    PRINT "thrown"
                END TRY
            `, `
                try
                    throw "message"
                catch e
                    print "thrown"
                end try
            `);
        });

        it('formats title case', () => {
            expect(formatter.format(
                `sub add()\n    IF true then\n        a=1\n    ELSEIF true THEN\n        a=1\n    end if\nENDSUB`,
                {
                    keywordCase: 'title',
                    compositeKeywords: 'original'
                }
            )).to.equal(
                `Sub add()\n    If true Then\n        a = 1\n    ElseIf true Then\n        a = 1\n    End If\nEndSub`
            );
        });

        it('leaves casing alone', () => {
            expect(formatter.format(
                `sub add()\n    IF true then\n        a=1\n    ELSEIF true THEN\n        a=1\n    endif\nENDSUB`,
                {
                    keywordCase: 'original',
                    compositeKeywords: 'original'
                }
            )).to.equal(
                `sub add()\n    IF true then\n        a = 1\n    ELSEIF true THEN\n        a = 1\n    endif\nENDSUB`
            );
        });

        it('formats conditional compile items', () => {
            expect(formatter.format(
                `#if true then\n#else if true then\n#else\n#end if`,
                {
                    keywordCase: 'title'
                }
            )).to.equal(
                `#If true Then\n#Else If true Then\n#Else\n#End If`
            );
        });

        it('formats upper case conditional compile items', () => {
            formatEqual(`#IF true\n    'true\n#ELSE IF true\n    'true\n#ELSE\n    'true\n#END IF`, undefined, {
                keywordCase: 'original'
            });
        });
    });

    describe('keywordCaseOverride', () => {
        it('overrides default casing and uses lower case', () => {
            expect(formatter.format(
                `Sub add()\n    If true Then\n        a=1\n    ElseIf true Then\n        a=1\n    EndIf\nEndSub`,
                {
                    keywordCase: 'upper',
                    compositeKeywords: 'original',
                    keywordCaseOverride: {
                        sub: 'lower',
                        endSub: 'lower'
                    }
                }
            )).to.equal(
                `sub add()\n    IF true THEN\n        a = 1\n    ELSEIF true THEN\n        a = 1\n    ENDIF\nendsub`
            );
        });
        it('overrides default casing and uses upper case', () => {
            expect(formatter.format(
                `Sub add()\n    IF true THEN\n        a=1\n    ELSEIF true THEN\n        a=1\n    ENDIF\nEndSub`,
                {
                    keywordCase: 'lower',
                    compositeKeywords: 'original',
                    keywordCaseOverride: {
                        sub: 'upper',
                        endSub: 'upper'
                    }
                }
            )).to.equal(
                `SUB add()\n    if true then\n        a = 1\n    elseif true then\n        a = 1\n    endif\nENDSUB`
            );
        });

        it('overrides default casing and uses title case', () => {
            expect(formatter.format(
                `sub add()\n    IF true then\n        a=1\n    ELSEIF true THEN\n        a=1\n    end if\nENDSUB`,
                {
                    keywordCase: 'lower',
                    compositeKeywords: 'original',
                    keywordCaseOverride: {
                        sub: 'title',
                        endSub: 'title'
                    }
                }
            )).to.equal(
                `Sub add()\n    if true then\n        a = 1\n    elseif true then\n        a = 1\n    end if\nEndSub`
            );
        });

        it('overrides default casing and leaves casing alone', () => {
            expect(formatter.format(
                `SuB add()\n    IF true then\n        a=1\n    ELSEIF true THEN\n        a=1\n    endif\nEnDSuB`,
                {
                    keywordCase: 'lower',
                    compositeKeywords: 'original',
                    keywordCaseOverride: {
                        sub: 'original',
                        endSub: 'original'
                    }
                }
            )).to.equal(
                `SuB add()\n    if true then\n        a = 1\n    elseif true then\n        a = 1\n    endif\nEnDSuB`
            );
        });

    });

    describe('composite keywords', () => {
        it('does not separate endfor when used as an object key', () => {
            formatEqual(`obj = {\n    endfor: true\n}\nobj.endfor = false\nval = obj.endfor`);
        });
        it('joins together when specified', () => {
            expect(formatter.format(
                `if true then\n    break\nelse if true then\n    break\nend if`,
                {
                    keywordCase: 'lower',
                    compositeKeywords: 'combine'
                }
            )).to.equal(
                `if true then\n    break\nelseif true then\n    break\nendif`
            );
        });
    });

    describe('removeTrailingWhitespace', () => {
        it('removes trailing spaces by default', () => {
            expect(formatter.format(`name = "bob" `)).to.equal(`name = "bob"`);
        });
        it('removes trailing tabs by default', () => {
            expect(formatter.format(`name = "bob"\t`)).to.equal(`name = "bob"`);
        });
        it('removes both tabs and spaces in same line', () => {
            expect(formatter.format(`name = "bob"\t `)).to.equal(`name = "bob"`);
            expect(formatter.format(`name = "bob" \t`)).to.equal(`name = "bob"`);
        });
        it('removes Whitespace from end of comment', () => {
            expect(formatter.format(`'comment `)).to.equal(`'comment`);
            expect(formatter.format(`'comment\t`)).to.equal(`'comment`);
            expect(formatter.format(`'comment \t`)).to.equal(`'comment`);
            expect(formatter.format(`'comment\t `)).to.equal(`'comment`);
        });
        it('handles multi-line prorgams', () => {
            expect(formatter.format(`name = "bob"\t \nage=22 `)).to.equal(`name = "bob"\nage = 22`);
        });
        it('leaves normal programs alone', () => {
            expect(formatter.format(`name = "bob"\nage=22 `)).to.equal(`name = "bob"\nage = 22`);
        });
        it('skips formatting when the option is set to false', () => {
            expect(formatter.format(`name = "bob" `, { removeTrailingWhiteSpace: false })).to.equal(`name = "bob" `);
        });
    });

    describe('formatKeywordCase', () => {
        describe('typeCaseOverride', () => {
            it('overrides specific types', () => {
                formatEqual(
                    `sub log(name as StRiNg, age as InTeGer)`,
                    `sub log(name as STRING, age as integer)`,
                    {
                        typeCase: 'upper',
                        typeCaseOverride: {
                            'integer': 'lower'
                        }
                    }
                );
            });
        });
    });

    describe('break composite keywords', () => {
        function format(...params: Array<[string, TokenKind]>) {
            let tokens = [] as Token[];
            for (let i = 0; i < params.length; i++) {
                tokens.push(createToken(params[i][1], params[i][0]));
            }
            tokens = formatter['formatters']['compositeKeyword'].format(tokens, { compositeKeywords: 'split' });
            //join all provided tokens together
            return tokens.map(x => x.text).join('');
        }

        it('handles edge cases', () => {
            let tokens = (formatter['formatters']['compositeKeyword'] as any).format([{
                text: 'endfunction',
                kind: TokenKind.EndFunction,
                startIndex: 0
            }, {
                text: 'BlaBla',
                kind: TokenKind.Identifier,
                startIndex: 0
            }], { compositeKeywords: 'split' });
            expect(tokens[0].text).to.equal('end function');
        });

        it('adds spaces at proper locations when supposed to', () => {
            expect(format(['else', TokenKind.Else], ['if', TokenKind.If])).to.equal('else if');
            expect(format(['endfunction', TokenKind.EndFunction])).to.equal('end function');
            expect(format(['endif', TokenKind.EndIf])).to.equal('end if');
            expect(format(['endsub', TokenKind.EndSub])).to.equal('end sub');
            expect(format(['endwhile', TokenKind.EndWhile])).to.equal('end while');
            expect(format(['exitwhile', TokenKind.ExitWhile])).to.equal('exit while');
            expect(format(['exitfor', TokenKind.ExitFor])).to.equal('exit for');
            expect(format(['endfor', TokenKind.EndFor])).to.equal('end for');

            expect(formatter.format(
                `sub add()\n    if true then\n        a=1\n    elseif true then\n        a=1\n    endif\nendsub`,
                {
                    compositeKeywords: 'split'
                }
            )).to.equal(
                `sub add()\n    if true then\n        a = 1\n    else if true then\n        a = 1\n    end if\nend sub`
            );
        });

        it('honors case', () => {
            expect(format(['endFUNCTION', TokenKind.EndFunction])).to.equal('end FUNCTION');
        });

        it('handles multi-line arrays', () => {
            let program = `function DoSomething()\ndata=[\n1,\n2\n]\nend function`;
            expect(formatter.format(program)).to.equal(`function DoSomething()\n    data = [\n        1,\n        2\n    ]\nend function`);
        });
    });

    describe('insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces', () => {
        it('adds spaces for single-line when non-empty', () => {
            formatEqual(`{a:1,b:2}`, `{ a: 1, b: 2 }`, {
                insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true
            });
        });

        it('removes spaces for single-line when non-empty', () => {
            formatEqual(`{ a: 1, b: 2 }`, `{a: 1, b: 2}`, {
                insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false
            });
        });

        it('adds spaces for multi-line when non-empty', () => {
            formatEqual(`{a: 1,\nb: 2}`, `{\n    a: 1,\n    b: 2\n}`, {
                insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true
            });
        });

        it('removes spaces for single-line when non-empty', () => {
            formatEqual(`{ a: 1,\n b: 2 }`, `{\n    a: 1,\n    b: 2\n}`, {
                insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false
            });
        });
    });

    describe('indentStyle', () => {
        it('ignores methods with the name `catch` when contained within a function using a custom param type', () => {
            formatEqual(undent`
                sub main()
                    doSomething(sub()
                        print 1
                    end sub).then(sub(a as Person)
                        print 2
                    end sub).catch()
                end sub
                class Person
                end class
            `);
        });

        it('ignores methods with the name `catch`', () => {
            formatEqual(undent`
                sub main()
                    doSomething(sub()
                        print 1
                    end sub).then(sub(a as boolean)
                        print 2
                    end sub).catch()
                end sub
            `);
        });

        describe('conditional block', () => {
            it('correctly fixes the indentation', () => {
                let expected = `#if isDebug\n    doSomething()\n#end if`;
                let current = `#if isDebug\n doSomething()\n#end if`;
                expect(formatter.format(current)).to.equal(expected);
            });

            it('skips indentation when formatIndent===false for conditional block', () => {
                let program = `#if isDebug\n    doSomething()\n#else\n doSomethingElse\n   #end if`;
                expect(formatter.format(program, { formatIndent: false })).to.equal(program);
            });

            it('correctly fixes the indentation', () => {
                let program = `#if isDebug\n    doSomething()\n#else if isPartialDebug\n    doSomethingElse()\n#else\n    doFinalThing()\n#end if`;
                expect(formatter.format(program)).to.equal(program);
            });

            it('correctly fixes the indentation nested if in conditional block', () => {
                let program = `#if isDebug\n    if true then\n        doSomething()\n    end if\n#end if`;
                expect(formatter.format(program)).to.equal(program);
            });

            it('correctly fixes the indentation nested #if in if block', () => {
                let program = `if true then\n    #if isDebug\n        doSomething()\n    #end if\nend if`;
                expect(formatter.format(program)).to.equal(program);
            });
        });
    });

    describe('formatWithCodeAndMap', () => {
        it('generates valid sourcemap', async () => {
            let result = formatter.formatWithSourceMap(`sub main()\nprint    "hello"   \nendsub`, 'file.brs');
            expect(result.code).to.equal(`sub main()\n    print "hello"\nend sub`);
            let consumer = await SourceMapConsumer.fromSourceMap(result.map);

            expect(consumer.generatedPositionFor({
                line: 2,
                column: 0,
                source: 'file.brs'
            })).to.include({
                line: 2,
                column: 4
            });

            expect(consumer.originalPositionFor({
                line: 2,
                column: 4
            })).to.include({
                line: 2,
                column: 0
            });
        });
    });

    describe('sortImports', () => {
        it('sorts consecutive imports', () => {
            formatEqual(`import "a"\nimport "c"\nimport "b"\n\n`, `import "a"\nimport "b"\nimport "c"\n\n`, {
                sortImports: true
            });
        });

        it('sorts consecutive imports with comments', () => {
            formatEqual(`import "d"\nimport "c"\n'comment\nimport "b"\nimport "a"\n\n`, `import "c"\nimport "d"\n'comment\nimport "a"\nimport "b"\n\n`, {
                sortImports: true
            });
        });
    });

    describe('template string', () => {
        it('leaves template string unchanged', () => {
            let expected = `function getItemXML(item)
    return \`<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
      <title>smithsonian</title>
      <item>
      <title>\${item.title}</title>
      <guid>\${item.vamsId}</guid>
      <media:rating scheme="urn:v-chip">\${item.ratings.first.code.name}</media:rating>
      </item>
      </channel>
      </rss>\`
end function`;

            let current = `    function getItemXML(item)
            return \`<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
      <channel>
      <title>smithsonian</title>
      <item>
      <title>\${item.title}</title>
      <guid>\${item.vamsId}</guid>
      <media:rating scheme="urn:v-chip">\${item.ratings.first.code.name}</media:rating>
      </item>
      </channel>
      </rss>\`
     end function`;
            expect(formatter.format(current)).to.equal(expected);
        });
    });

    function formatEqual(incoming: string, expected?: string, options?: FormattingOptions) {
        expected = expected ?? incoming;
        let formatted = formatter.format(incoming, options);
        expect(formatted).to.equal(expected);
    }

    /**
     * Same as formatEqual, but smart trims leading whitespace to the indent level of the first character found
     */
    function formatEqualTrim(incoming: string, expected?: string, options?: FormattingOptions) {
        let sources = [
            incoming,
            expected ?? incoming
        ];
        for (let i = 0; i < sources.length; i++) {
            let lines = sources[i].split('\n');
            //throw out leading newlines
            while (lines[0].length === 0) {
                lines.splice(0, 1);
            }
            let trimStartIndex = null as number | null;
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                //if we don't have a starting trim count, compute it
                if (!trimStartIndex) {
                    trimStartIndex = lines[lineIndex].length - lines[lineIndex].trim().length;
                }

                if (lines[lineIndex].length > 0) {
                    lines[lineIndex] = lines[lineIndex].substring(trimStartIndex);
                }
            }
            //trim trailing newlines
            while (lines[lines.length - 1].length === 0) {
                lines.splice(lines.length - 1);
            }
            sources[i] = lines.join('\n');
        }
        formatEqual(sources[0], sources[1], options);
    }

});
