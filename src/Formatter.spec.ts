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

        it('handles wrapped anon function over multiple lines in ternary properly', () => {
            formatEqualTrim(`
                sub main()
                    a = true ? (sub()
                        print hello
                    end sub) : true
                    print a
                end sub
           `);
        });

        it('handles type statements with typed function types', () => {
            formatEqualTrim(`
                type myFunc = function(a as string) as integer

                sub useFunc(fn as myFunc)
                    print myFunc("test") + 3
                end sub
           `);
        });

        it('indents on anon functions assigned to "type"', () => {
            formatEqualTrim(`
                sub useFunc()
                    type = function(a as string) as integer
                        print a
                        return 123
                    end function
                    print type()
                end sub
           `);
        });

        it('does not indent on typed functions as types', () => {
            formatEqualTrim(`
                sub useFunc(myFunc as function(a as string) as integer)
                    myFunc("hello")
                end sub
           `);
        });

        it('does not crash on invalid type name', () => {
            let formatted = formatter.format(`
                type for = function(a as string) as integer

                sub useFunc(fn as for)
                    print for("test") + 3
                end sub
           `);
            expect(formatted).to.be.a('string');
        });

        it('does not crash on invalid type statement eg, with no "type <name>" before "="', () => {
            let formatted = formatter.format(`
                = function(a as string) as integer

                sub foo()
                    print "foo"
                end sub
           `);
            expect(formatted).to.be.a('string');
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
        it('property indents try catch statements', () => {
            formatEqualTrim(`
                function try()
                    try
                        print "hello"
                    catch e
                        print "caught"
                    end try
                    print "hello"
                end function
            `);
        });

        it('correctly indents function with try having contents', () => {
            expect(formatter.format(undent`
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
            expect(format(['endtry', TokenKind.EndTry])).to.equal('end try');

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
        it('handles anon functions as function args', () => {
            formatEqual(undent`
                sub main()
                    doSomething(sub()
                        print 1
                    end sub)
                end sub
            `);
        });

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

    describe('maxConsecutiveEmptyLines', () => {
        it('collapses multiple blank lines down to the specified max', () => {
            formatEqual(
                'x = 1\n\n\n\ny = 2\n',
                'x = 1\n\ny = 2\n',
                { maxConsecutiveEmptyLines: 1 }
            );
        });

        it('allows exactly the specified number of blank lines through', () => {
            formatEqual(
                'x = 1\n\n\ny = 2\n',
                'x = 1\n\n\ny = 2\n',
                { maxConsecutiveEmptyLines: 2 }
            );
        });

        it('removes all blank lines when set to 0', () => {
            formatEqual(
                'x = 1\n\n\ny = 2\n',
                'x = 1\ny = 2\n',
                { maxConsecutiveEmptyLines: 0 }
            );
        });

        it('does not affect blank lines when option is not set', () => {
            formatEqual(
                'x = 1\n\n\ny = 2\n'
            );
        });

        it('works inside function bodies', () => {
            formatEqualTrim(`
                sub main()
                    x = 1


                    y = 2
                end sub
            `, `
                sub main()
                    x = 1

                    y = 2
                end sub
            `, { maxConsecutiveEmptyLines: 1 });
        });

        it('handles more blank lines than the max at end of file', () => {
            formatEqual(
                'x = 1\n\n\n',
                'x = 1\n\n',
                { maxConsecutiveEmptyLines: 1 }
            );
        });
    });

    describe('trailingComma', () => {
        it('adds trailing comma to last item in a multi-line array', () => {
            formatEqualTrim(`
                x = [
                    1,
                    2,
                    3
                ]
            `, `
                x = [
                    1,
                    2,
                    3,
                ]
            `, { trailingComma: 'always' });
        });

        it('adds trailing comma to last item in a multi-line AA', () => {
            formatEqualTrim(`
                x = {
                    a: 1,
                    b: 2
                }
            `, `
                x = {
                    a: 1,
                    b: 2,
                }
            `, { trailingComma: 'always' });
        });

        it('removes all commas from items in a multi-line array', () => {
            formatEqualTrim(`
                x = [
                    1,
                    2,
                    3,
                ]
            `, `
                x = [
                    1
                    2
                    3
                ]
            `, { trailingComma: 'never' });
        });

        it('removes all commas from items in a multi-line AA', () => {
            formatEqualTrim(`
                x = {
                    a: 1,
                    b: 2,
                }
            `, `
                x = {
                    a: 1
                    b: 2
                }
            `, { trailingComma: 'never' });
        });

        it('does not change trailing commas when set to original', () => {
            formatEqualTrim(`
                x = [
                    1,
                    2,
                    3,
                ]
            `, undefined, { trailingComma: 'original' });
        });

        it('does not add trailing comma to single-line arrays', () => {
            formatEqual('x = [1, 2, 3]\n', undefined, { trailingComma: 'always' });
        });

        it('does not add trailing comma to single-line AAs', () => {
            formatEqual('x = { a: 1, b: 2 }\n', undefined, { trailingComma: 'always' });
        });

        it('does not affect blank arrays', () => {
            formatEqual('x = []\n', undefined, { trailingComma: 'always' });
        });

        it('does not affect blank AAs', () => {
            formatEqual('x = {}\n', undefined, { trailingComma: 'always' });
        });

        it('adds commas to all items in a comma-free multiline AA', () => {
            formatEqualTrim(`
                x = {
                    a: 1
                    b: 2
                    c: 3
                }
            `, `
                x = {
                    a: 1,
                    b: 2,
                    c: 3,
                }
            `, { trailingComma: 'always' });
        });

        it('removes commas from all items in a multiline AA', () => {
            formatEqualTrim(`
                x = {
                    a: 1,
                    b: 2,
                    c: 3,
                }
            `, `
                x = {
                    a: 1
                    b: 2
                    c: 3
                }
            `, { trailingComma: 'never' });
        });

        it('adds commas to all items in a multiline array', () => {
            formatEqualTrim(`
                x = [
                    1
                    2
                    3
                ]
            `, `
                x = [
                    1,
                    2,
                    3,
                ]
            `, { trailingComma: 'always' });
        });

        it('handles nested multiline AAs independently', () => {
            formatEqualTrim(`
                x = {
                    a: {
                        inner: 1
                        inner2: 2
                    }
                    b: 2
                }
            `, `
                x = {
                    a: {
                        inner: 1,
                        inner2: 2,
                    },
                    b: 2,
                }
            `, { trailingComma: 'always' });
        });

        it('removes commas from all levels of nested multiline AAs', () => {
            formatEqualTrim(`
                x = {
                    a: {
                        inner: 1,
                        inner2: 2,
                    },
                    b: 2,
                }
            `, `
                x = {
                    a: {
                        inner: 1
                        inner2: 2
                    }
                    b: 2
                }
            `, { trailingComma: 'never' });
        });

        it('does not add commas inside single-line nested values', () => {
            formatEqualTrim(`
                x = {
                    a: [1, 2, 3]
                    b: 2
                }
            `, `
                x = {
                    a: [1, 2, 3],
                    b: 2,
                }
            `, { trailingComma: 'always' });
        });

        it('allButLast adds commas to all items except the last in a multiline array', () => {
            formatEqualTrim(`
                x = [
                    1,
                    2,
                    3,
                ]
            `, `
                x = [
                    1,
                    2,
                    3
                ]
            `, { trailingComma: 'allButLast' });
        });

        it('allButLast adds commas to all items except the last in a comma-free multiline AA', () => {
            formatEqualTrim(`
                x = {
                    a: 1
                    b: 2
                    c: 3
                }
            `, `
                x = {
                    a: 1,
                    b: 2,
                    c: 3
                }
            `, { trailingComma: 'allButLast' });
        });

        it('allButLast removes trailing comma from last item when others already have commas', () => {
            formatEqualTrim(`
                x = {
                    a: 1,
                    b: 2,
                }
            `, `
                x = {
                    a: 1,
                    b: 2
                }
            `, { trailingComma: 'allButLast' });
        });

        it('does not touch blank lines inside multiline AA', () => {
            formatEqualTrim(`
                x = {
                    a: 1

                    b: 2
                }
            `, `
                x = {
                    a: 1,

                    b: 2,
                }
            `, { trailingComma: 'always' });
        });
    });

    describe('singleLineIf', () => {
        it('collapses a simple if block to a single line', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                end if
            `, `
                if x then y = 1
            `, { singleLineIf: 'inlineNoElse' });
        });

        it('expands an inline if to multi-line', () => {
            formatEqualTrim(`
                if x then y = 1
            `, `
                if x then
                    y = 1
                end if
            `, { singleLineIf: 'block' });
        });

        it('does not collapse an if block that has an else branch', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else
                    y = 2
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse an if block that has an else if branch', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = 2
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse an if block with multiple statements', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                    z = 2
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not modify if statements when set to original', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                end if
            `, undefined, { singleLineIf: 'original' });
        });

        it('does not expand an already-multi-line if when set to expand', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                end if
            `, undefined, { singleLineIf: 'block' });
        });

        it('collapses an if block that is preceded by other code', () => {
            formatEqualTrim(`
                x = 1
                if x then
                    y = 1
                end if
            `, `
                x = 1
                if x then y = 1
            `, { singleLineIf: 'inlineNoElse' });
        });

        it('expands an inline if that has a trailing newline', () => {
            formatEqual('if x then y = 1\n', 'if x then\n    y = 1\nend if\n', { singleLineIf: 'block' });
        });

        it('collapses an if with whitespace between then and the newline', () => {
            formatEqual('if x then   \n    y = 1\nend if\n', 'if x then  y = 1\n', { singleLineIf: 'inlineNoElse' });
        });

        it('collapses an if with indented end if', () => {
            formatEqual('if x then\n    y = 1\n    end if\n', 'if x then y = 1\n', { singleLineIf: 'inlineNoElse' });
        });

        it('expands an inline if that has an else branch into a multi-line block', () => {
            formatEqualTrim(`
                if x then y = 1 else y = 2
            `, `
                if x then
                    y = 1
                else
                    y = 2
                end if
            `, { singleLineIf: 'block' });
        });

        it('expands an inline if that has an else if branch into a multi-line block', () => {
            formatEqualTrim(`
                if x then y = 1 else if z then y = 2
            `, `
                if x then
                    y = 1
                else if z then
                    y = 2
                end if
            `, { singleLineIf: 'block' });
        });

        it('expands an inline if that has an else if/else chain into a multi-line block', () => {
            formatEqualTrim(`
                if x then y = 1 else if z then y = 2 else y = 3
            `, `
                if x then
                    y = 1
                else if z then
                    y = 2
                else
                    y = 3
                end if
            `, { singleLineIf: 'block' });
        });

        it('expands an inline if and preserves code that follows it', () => {
            formatEqualTrim(`
                if x then y = 1
                z = 2
            `, `
                if x then
                    y = 1
                end if
                z = 2
            `, { singleLineIf: 'block' });
        });

        it('does not re-expand a multi-line if/else if chain in block mode', () => {
            formatEqualTrim(`
                if a then
                    x = 1
                else if b then
                    x = 2
                end if
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not re-expand a multi-line if/else if/else chain in block mode', () => {
            formatEqualTrim(`
                if a then
                    x = 1
                else if b then
                    x = 2
                else
                    x = 3
                end if
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not re-expand a multi-line chain with multiple else if branches in block mode', () => {
            formatEqualTrim(`
                if a then
                    x = 1
                else if b then
                    x = 2
                else if c then
                    x = 3
                end if
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not re-expand a multi-line if with a comment-only body in block mode', () => {
            formatEqualTrim(`
                if a then
                    ' note
                else if b then
                    x = 2
                end if
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not re-expand nested multi-line if blocks in block mode', () => {
            formatEqualTrim(`
                if a then
                    if b then
                        x = 1
                    end if
                end if
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not expand an inline if whose body spans multiple lines (multi-line associative array literal)', () => {
            formatEqualTrim(`
                if url <> "" then return {
                    success: true
                    libraryUrl: url
                }
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not expand an inline if whose body spans multiple lines (multi-line array literal)', () => {
            formatEqualTrim(`
                if x then return [
                    1,
                    2
                ]
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not expand an inline if whose body spans multiple lines (multi-line function call)', () => {
            formatEqualTrim(`
                if x then foo(
                1,
                2
                )
            `, undefined, { singleLineIf: 'block' });
        });

        it('does not collapse an if whose only body statement is a comment', () => {
            formatEqualTrim(`
                if x then
                    ' note
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse an if whose only body statement is a bs:disable-line comment', () => {
            formatEqualTrim(`
                if x then
                    ' commentedOut() 'bs:disable-line LINT3012
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse an empty if body', () => {
            formatEqualTrim(`
                if x then
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse outer when the only inner statement is a multi-line if block (inner collapses independently)', () => {
            formatEqualTrim(`
                if x then
                    if y then
                        z = 1
                    end if
                end if
            `, `
                if x then
                    if y then z = 1
                end if
            `, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement is an if/else block', () => {
            formatEqualTrim(`
                if x then
                    if y then
                        z = 1
                    else
                        z = 2
                    end if
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement is a for loop', () => {
            formatEqualTrim(`
                if x then
                    for i = 0 to 5
                        y = i
                    end for
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement is a while loop', () => {
            formatEqualTrim(`
                if x then
                    while y < 5
                        y = y + 1
                    end while
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('collapses an if and preserves code that follows it', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                end if
                z = 2
            `, `
                if x then y = 1
                z = 2
            `, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement spans multiple lines (function expression rhs)', () => {
            formatEqualTrim(`
                if x then
                    y = (function()
                        return 1
                    end function)()
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement spans multiple lines (array literal rhs)', () => {
            formatEqualTrim(`
                if x then
                    y = [
                        1,
                        2
                    ]
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement spans multiple lines (associative array rhs)', () => {
            formatEqualTrim(`
                if x then
                    y = {
                        a: 1
                    }
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement spans multiple lines (multi-line function call)', () => {
            formatEqualTrim(`
                if x then
                    foo(
                    1,
                    2
                    )
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement is a for-each loop', () => {
            formatEqualTrim(`
                if x then
                    for each i in items
                        y = i
                    end for
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement is a try/catch block', () => {
            formatEqualTrim(`
                if x then
                    try
                        y = 1
                    catch e
                        y = 2
                    end try
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('does not collapse when the only inner statement is a single-line inline if', () => {
            formatEqualTrim(`
                if x then
                    if y then z = 1
                end if
            `, undefined, { singleLineIf: 'inlineNoElse' });
        });

        it('expands an inline if with else and colon-separated multi-statement bodies', () => {
            formatEqualTrim(`
                if x then y = 1: z = 2 else y = 3: z = 4
            `, `
                if x then
                    y = 1: z = 2
                else
                    y = 3: z = 4
                end if
            `, { singleLineIf: 'block' });
        });

        it('inlineNoElseIf collapses a simple if/then to inline', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                end if
            `, `
                if x then y = 1
            `, { singleLineIf: 'inlineNoElseIf' });
        });

        it('inlineNoElseIf collapses an if/else to inline', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else
                    y = 2
                end if
            `, `
                if x then y = 1 else y = 2
            `, { singleLineIf: 'inlineNoElseIf' });
        });

        it('inlineNoElseIf does not collapse if/else if chains', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = 2
                end if
            `, undefined, { singleLineIf: 'inlineNoElseIf' });
        });

        it('inlineNoElseIf does not collapse if/else if/else chains', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = 2
                else
                    y = 3
                end if
            `, undefined, { singleLineIf: 'inlineNoElseIf' });
        });

        it('inlineNoElseIf does not collapse when else body has multiple statements', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else
                    y = 2
                    z = 3
                end if
            `, undefined, { singleLineIf: 'inlineNoElseIf' });
        });

        it('inlineNoElseIf does not collapse when else body is comment-only', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else
                    ' note
                end if
            `, undefined, { singleLineIf: 'inlineNoElseIf' });
        });

        it('inlineNoElseIf does not collapse when else body is multi-line', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else
                    y = (function()
                        return 1
                    end function)()
                end if
            `, undefined, { singleLineIf: 'inlineNoElseIf' });
        });

        it('inline collapses a simple if/then to inline', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                end if
            `, `
                if x then y = 1
            `, { singleLineIf: 'inline' });
        });

        it('inline collapses an if/else to inline', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else
                    y = 2
                end if
            `, `
                if x then y = 1 else y = 2
            `, { singleLineIf: 'inline' });
        });

        it('inline collapses an if/else if chain to inline', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = 2
                end if
            `, `
                if x then y = 1 else if z then y = 2
            `, { singleLineIf: 'inline' });
        });

        it('inline collapses an if/else if/else chain to inline', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = 2
                else
                    y = 3
                end if
            `, `
                if x then y = 1 else if z then y = 2 else y = 3
            `, { singleLineIf: 'inline' });
        });

        it('inline collapses a long if/else if/else if/else chain', () => {
            formatEqualTrim(`
                if a then
                    x = 1
                else if b then
                    x = 2
                else if c then
                    x = 3
                else
                    x = 4
                end if
            `, `
                if a then x = 1 else if b then x = 2 else if c then x = 3 else x = 4
            `, { singleLineIf: 'inline' });
        });

        it('inline does not collapse when an else-if branch body is multi-line', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = (function()
                        return 1
                    end function)()
                end if
            `, undefined, { singleLineIf: 'inline' });
        });

        it('inline does not collapse when an else-if branch body is comment-only', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    ' note
                end if
            `, undefined, { singleLineIf: 'inline' });
        });

        it('inline does not collapse when an else-if branch has multiple statements', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = 2
                    w = 3
                end if
            `, undefined, { singleLineIf: 'inline' });
        });

        it('inline does not collapse when the final else has a multi-line body', () => {
            formatEqualTrim(`
                if x then
                    y = 1
                else if z then
                    y = 2
                else
                    y = (function()
                        return 1
                    end function)()
                end if
            `, undefined, { singleLineIf: 'inline' });
        });
    });

    describe('inlineArrayAndObject', () => {
        describe('always', () => {
            it('collapses a multi-line array', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2,
                        3
                    ]
                `, `
                    x = [1, 2, 3]
                `, { inlineArrayAndObject: 'always' });
            });

            it('collapses a multi-line AA', () => {
                formatEqualTrim(`
                    x = {
                        a: 1,
                        b: 2
                    }
                `, `
                    x = { a: 1, b: 2 }
                `, { inlineArrayAndObject: 'always' });
            });

            it('collapses regardless of resulting line length', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10
                    ]
                `, `
                    x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                `, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse already-single-line brackets', () => {
                formatEqual('x = [1, 2, 3]\n', undefined, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse the outer array when it contains nested multi-line arrays', () => {
                formatEqualTrim(`
                    x = [
                        [
                            1,
                            2
                        ],
                        3
                    ]
                `, `
                    x = [
                        [1, 2],
                        3
                    ]
                `, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse the outer array when it contains a nested multi-line AA', () => {
                formatEqualTrim(`
                    x = [
                        {
                            a: 1,
                            b: 2
                        },
                        3
                    ]
                `, `
                    x = [
                        { a: 1, b: 2 },
                        3
                    ]
                `, { inlineArrayAndObject: 'always' });
            });
        });

        describe('comma fix on collapse', () => {
            it('inserts commas between AA items separated only by newlines', () => {
                formatEqualTrim(`
                    x = {
                        a: 1
                        b: 2
                    }
                `, `
                    x = { a: 1, b: 2 }
                `, { inlineArrayAndObject: 'always' });
            });

            it('inserts commas between array items separated only by newlines', () => {
                formatEqualTrim(`
                    x = [
                        1
                        2
                        3
                    ]
                `, `
                    x = [1, 2, 3]
                `, { inlineArrayAndObject: 'always' });
            });

            it('inserts commas where missing in mixed comma/no-comma items', () => {
                formatEqualTrim(`
                    x = {
                        a: 1,
                        b: 2
                        c: 3
                    }
                `, `
                    x = { a: 1, b: 2, c: 3 }
                `, { inlineArrayAndObject: 'always' });
            });

            it('inserts a comma between a nested single-line literal and the next item', () => {
                formatEqualTrim(`
                    x = {
                        inner: { a: 1 }
                        other: 2
                    }
                `, `
                    x = { inner: { a: 1 }, other: 2 }
                `, { inlineArrayAndObject: 'always' });
            });

            it('preserves a trailing comma after collapse', () => {
                formatEqualTrim(`
                    x = {
                        a: 1,
                        b: 2,
                    }
                `, `
                    x = { a: 1, b: 2, }
                `, { inlineArrayAndObject: 'always' });
            });
        });

        describe('structural rejections', () => {
            it('does not collapse when an item has a trailing line comment', () => {
                formatEqualTrim(`
                    x = {
                        a: 1, ' note about a
                        b: 2
                    }
                `, undefined, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse when there is a comment-only line inside', () => {
                formatEqualTrim(`
                    x = {
                        ' header
                        a: 1
                        b: 2
                    }
                `, undefined, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse when an item has a bs:disable-line directive', () => {
                formatEqualTrim(`
                    x = {
                        a: 1 'bs:disable-line LINT3012
                        b: 2
                    }
                `, undefined, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse when contents include a #if conditional compile', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        #if production
                            2
                        #else
                            3
                        #end if
                    ]
                `, undefined, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse when an item value is itself a multi-line function expression', () => {
                formatEqualTrim(`
                    x = {
                        fn: function()
                            return 1
                        end function
                    }
                `, undefined, { inlineArrayAndObject: 'always' });
            });

            it('does not collapse an array of regex literals', () => {
                formatEqualTrim(`
                    domains = [
                        /^https?:\\/\\/foo\\.com\\/.+/
                        /^https?:\\/\\/bar\\.com\\/.+/
                    ]
                `, undefined, { inlineArrayAndObject: 'always' });
            });
        });

        describe('fitsLine', () => {
            it('collapses when the resulting line fits within maxLineLength', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2,
                        3
                    ]
                `, `
                    x = [1, 2, 3]
                `, { inlineArrayAndObject: 'fitsLine', maxLineLength: 80 });
            });

            it('does not collapse when the resulting line would exceed maxLineLength', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2,
                        3
                    ]
                `, undefined, { inlineArrayAndObject: 'fitsLine', maxLineLength: 5 });
            });

            it('factors indent into the length check', () => {
                formatEqualTrim(`
                    function deeplyNested()
                        if cond then
                            for i = 0 to 1
                                x = [
                                    1,
                                    2,
                                    3
                                ]
                            end for
                        end if
                    end function
                `, undefined, { inlineArrayAndObject: 'fitsLine', maxLineLength: 24 });
            });

            it('counts tab characters as indentSpaceCount columns when computing visual width', () => {
                // Tab indented source — visualLineLengthBeforeIndex expands tabs.
                formatEqual(
                    'if x then\n\tif y then\n\t\tz = [\n\t\t\t1,\n\t\t\t2,\n\t\t\t3\n\t\t]\n\tend if\nend if\n',
                    'if x then\n\tif y then\n\t\tz = [1, 2, 3]\n\tend if\nend if\n',
                    { inlineArrayAndObject: 'fitsLine', maxLineLength: 30, indentStyle: 'tabs', indentSpaceCount: 4 }
                );
            });

            it('uses indentSpaceCount when computing visual indent width', () => {
                // With indentSpaceCount=2, indent contribution per nesting is 2 chars.
                // The collapsed line `  x = [1, 2, 3]` at 2 levels deep = 4 + 13 = 17 chars,
                // which fits the budget of 30.
                formatEqual(
                    'if x then\n  if y then\n    x = [\n      1,\n      2,\n      3\n    ]\n  end if\nend if\n',
                    'if x then\n  if y then\n    x = [1, 2, 3]\n  end if\nend if\n',
                    { inlineArrayAndObject: 'fitsLine', maxLineLength: 30, indentSpaceCount: 2 }
                );
            });

            it('falls back to always-collapse when maxLineLength is unset', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2,
                        3,
                        4,
                        5
                    ]
                `, `
                    x = [1, 2, 3, 4, 5]
                `, { inlineArrayAndObject: 'fitsLine' });
            });
        });

        describe('never', () => {
            it('expands a single-line array to multi-line', () => {
                formatEqualTrim(`
                    x = [1, 2, 3]
                `, `
                    x = [
                        1,
                        2,
                        3
                    ]
                `, { inlineArrayAndObject: 'never' });
            });

            it('expands a single-line AA to multi-line', () => {
                formatEqualTrim(`
                    x = { a: 1, b: 2 }
                `, `
                    x = {
                        a: 1,
                        b: 2
                    }
                `, { inlineArrayAndObject: 'never' });
            });

            it('does not expand an empty array', () => {
                formatEqualTrim(`
                    x = []
                `, undefined, { inlineArrayAndObject: 'never' });
            });

            it('does not expand an empty AA', () => {
                formatEqualTrim(`
                    x = {}
                `, undefined, { inlineArrayAndObject: 'never' });
            });

            it('does not expand a single-element array', () => {
                formatEqualTrim(`
                    x = [1]
                `, undefined, { inlineArrayAndObject: 'never' });
            });

            it('does not expand an AA with a single property', () => {
                formatEqualTrim(`
                    x = { a: 1 }
                `, undefined, { inlineArrayAndObject: 'never' });
            });

            it('expands an outer array containing a single-line nested array (recursively)', () => {
                formatEqualTrim(`
                    x = [1, [2, 3], 4]
                `, `
                    x = [
                        1,
                        [
                            2,
                            3
                        ],
                        4
                    ]
                `, { inlineArrayAndObject: 'never' });
            });

            it('expands an outer AA containing a single-line nested AA (recursively)', () => {
                formatEqualTrim(`
                    x = { a: 1, inner: { b: 2, c: 3 }, d: 4 }
                `, `
                    x = {
                        a: 1,
                        inner: {
                            b: 2,
                            c: 3
                        },
                        d: 4
                    }
                `, { inlineArrayAndObject: 'never' });
            });

            it('leaves an already-multi-line array alone', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2
                    ]
                `, undefined, { inlineArrayAndObject: 'never' });
            });
        });

        describe('original', () => {
            it('leaves a multi-line array alone', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2,
                        3
                    ]
                `, undefined, { inlineArrayAndObject: 'original' });
            });

            it('leaves a single-line array alone', () => {
                formatEqual('x = [1, 2, 3]\n', undefined, { inlineArrayAndObject: 'original' });
            });

            it('leaves a multi-line array alone when option is omitted', () => {
                formatEqualTrim(`
                    x = [
                        1,
                        2,
                        3
                    ]
                `);
            });
        });
    });

    describe('blockSpacing', () => {
        describe('before', () => {
            it('inserts a blank line above a while when missing', () => {
                formatEqualTrim(`
                    sub m()
                        print "test"
                        while true
                        end while
                    end sub
                `, `
                    sub m()
                        print "test"

                        while true
                        end while
                    end sub
                `, { blockSpacing: { while: 'before' } });
            });

            it('places the blank line above a leading comment, not between comment and opener', () => {
                formatEqualTrim(`
                    sub m()
                        print "test"
                        ' do the loop work now
                        while true
                        end while
                    end sub
                `, `
                    sub m()
                        print "test"

                        ' do the loop work now
                        while true
                        end while
                    end sub
                `, { blockSpacing: { while: 'before' } });
            });

            it('places the blank line above an annotation, not between annotation and opener', () => {
                formatEqualTrim(`
                    namespace foo
                        sub a()
                            x = 1
                        end sub
                        @deprecated("use newSub")
                        sub b()
                            x = 1
                        end sub
                    end namespace
                `, `
                    namespace foo
                        sub a()
                            x = 1
                        end sub

                        @deprecated("use newSub")
                        sub b()
                            x = 1
                        end sub
                    end namespace
                `, { blockSpacing: { sub: 'before' } });
            });

            it('walks past mixed annotation and comment lines as a single preamble', () => {
                formatEqualTrim(`
                    namespace foo
                        sub a()
                            x = 1
                        end sub
                        ' explains why this is deprecated
                        @deprecated("use newSub")
                        sub b()
                            x = 1
                        end sub
                    end namespace
                `, `
                    namespace foo
                        sub a()
                            x = 1
                        end sub

                        ' explains why this is deprecated
                        @deprecated("use newSub")
                        sub b()
                            x = 1
                        end sub
                    end namespace
                `, { blockSpacing: { sub: 'before' } });
            });

            it('walks past multiple consecutive leading comment lines', () => {
                formatEqualTrim(`
                    sub m()
                        print "test"
                        ' first comment
                        ' second comment
                        while true
                        end while
                    end sub
                `, `
                    sub m()
                        print "test"

                        ' first comment
                        ' second comment
                        while true
                        end while
                    end sub
                `, { blockSpacing: { while: 'before' } });
            });

            it('does nothing when a blank line already exists above the block', () => {
                formatEqualTrim(`
                    sub m()
                        print "test"

                        while true
                        end while
                    end sub
                `, undefined, { blockSpacing: { while: 'before' } });
            });

            it('does not insert a blank when the block is the first content in its parent', () => {
                formatEqualTrim(`
                    sub m()
                        while true
                        end while
                    end sub
                `, undefined, { blockSpacing: { while: 'before' } });
            });
        });

        describe('after', () => {
            it('inserts a blank line below an if when missing', () => {
                formatEqualTrim(`
                    sub m()
                        if x then
                            a()
                        end if
                        b()
                    end sub
                `, `
                    sub m()
                        if x then
                            a()
                        end if

                        b()
                    end sub
                `, { blockSpacing: { if: 'after' } });
            });

            it('places the blank line below a trailing comment attached to the closer', () => {
                formatEqualTrim(`
                    sub m()
                        if x then
                            a()
                        end if ' end of conditional
                        b()
                    end sub
                `, `
                    sub m()
                        if x then
                            a()
                        end if ' end of conditional

                        b()
                    end sub
                `, { blockSpacing: { if: 'after' } });
            });

            it('does nothing when a blank line already exists below', () => {
                formatEqualTrim(`
                    sub m()
                        if x then
                            a()
                        end if

                        b()
                    end sub
                `, undefined, { blockSpacing: { if: 'after' } });
            });

            it('does not insert a blank when the block is the last content in its parent', () => {
                formatEqualTrim(`
                    sub m()
                        if x then
                            a()
                        end if
                    end sub
                `, undefined, { blockSpacing: { if: 'after' } });
            });
        });

        describe('between', () => {
            it('inserts blank lines both above and below', () => {
                formatEqualTrim(`
                    sub m()
                        print "before"
                        for each i in items
                            p(i)
                        end for
                        print "after"
                    end sub
                `, `
                    sub m()
                        print "before"

                        for each i in items
                            p(i)
                        end for

                        print "after"
                    end sub
                `, { blockSpacing: { for: 'between' } });
            });
        });

        describe('always', () => {
            it('adds blanks before, after, AND inside the body', () => {
                formatEqualTrim(`
                    sub m()
                        print "before"
                        function f()
                            return 1
                        end function
                        print "after"
                    end sub
                `, `
                    sub m()
                        print "before"

                        function f()

                            return 1

                        end function

                        print "after"
                    end sub
                `, { blockSpacing: { function: 'always' } });
            });
        });

        describe('object form', () => {
            it('mixes per-construct policies', () => {
                formatEqualTrim(`
                    sub m()
                        print "first"
                        if x then
                            a()
                        end if
                        while y
                            b()
                        end while
                        print "last"
                    end sub
                `, `
                    sub m()
                        print "first"
                        if x then
                            a()
                        end if

                        while y
                            b()
                        end while

                        print "last"
                    end sub
                `, { blockSpacing: { if: 'after', while: 'between' } });
            });

            it('falls back to default for unspecified constructs', () => {
                formatEqualTrim(`
                    sub m()
                        print "before"
                        for i = 0 to 3
                            p(i)
                        end for
                        while x
                            q()
                        end while
                        print "after"
                    end sub
                `, `
                    sub m()
                        print "before"

                        for i = 0 to 3
                            p(i)
                        end for

                        while x
                            q()
                        end while

                        print "after"
                    end sub
                `, { blockSpacing: { default: 'between' } });
            });

            it('respects original for omitted constructs when default is also omitted', () => {
                formatEqualTrim(`
                    sub m()
                        print "before"
                        if x then
                            a()
                        end if
                        print "after"
                    end sub
                `, undefined, { blockSpacing: { while: 'before' } });
            });
        });

        describe('string form', () => {
            it('always applies to every supported construct', () => {
                formatEqualTrim(`
                    sub m()
                        print "before"
                        if x then
                            a()
                        end if
                        for i = 0 to 3
                            p(i)
                        end for
                        print "after"
                    end sub
                `, `
                    sub m()
                        print "before"

                        if x then
                            a()
                        end if

                        for i = 0 to 3
                            p(i)
                        end for

                        print "after"
                    end sub
                `, { blockSpacing: 'between' });
            });
        });

        describe('original', () => {
            it('leaves spacing alone with original mode', () => {
                formatEqualTrim(`
                    sub m()
                        print "test"
                        if x then
                            a()
                        end if
                        b()
                    end sub
                `, undefined, { blockSpacing: 'original' });
            });

            it('leaves spacing alone when omitted', () => {
                formatEqualTrim(`
                    sub m()
                        print "test"
                        if x then
                            a()
                        end if
                        b()
                    end sub
                `);
            });
        });

        describe('parent boundary detection', () => {
            it('does not insert blank when block is first child of a namespace', () => {
                formatEqualTrim(`
                    namespace foo
                        sub m()
                            a()
                        end sub
                    end namespace
                `, undefined, { blockSpacing: 'between' });
            });

            it('does not insert blank when block is last child of a namespace', () => {
                formatEqualTrim(`
                    namespace foo
                        sub a()
                            x()
                        end sub

                        sub b()
                            y()
                        end sub
                    end namespace
                `, undefined, { blockSpacing: 'between' });
            });

            it('does not insert blank when nested for is the only thing in its parent if', () => {
                formatEqualTrim(`
                    sub m()
                        if x then
                            for each y in z
                                p(y)
                            end for
                        end if
                    end sub
                `, undefined, { blockSpacing: { for: 'between' } });
            });

            it('does not insert blank when nested for is the last thing in its parent if', () => {
                formatEqualTrim(`
                    sub m()
                        if x then
                            a()
                            for each y in z
                                p(y)
                            end for
                        end if
                    end sub
                `, `
                    sub m()
                        if x then
                            a()

                            for each y in z
                                p(y)
                            end for
                        end if
                    end sub
                `, { blockSpacing: { for: 'between' } });
            });

            it('does not insert blank when nested if is the only thing in a class method', () => {
                formatEqualTrim(`
                    class Foo
                        sub m()
                            if x then
                                a()
                            end if
                        end sub
                    end class
                `, undefined, { blockSpacing: { if: 'between' } });
            });

            it('applies try construct rule from object form', () => {
                formatEqualTrim(`
                    sub m()
                        print "before"
                        try
                            a()
                        catch e
                            b(e)
                        end try
                        print "after"
                    end sub
                `, `
                    sub m()
                        print "before"

                        try
                            a()
                        catch e
                            b(e)
                        end try

                        print "after"
                    end sub
                `, { blockSpacing: { try: 'between' } });
            });

            it('handles nested namespaces correctly', () => {
                formatEqualTrim(`
                    namespace a
                        namespace b
                            sub deeplyNested()
                                x = 1
                            end sub
                        end namespace
                    end namespace
                `, undefined, { blockSpacing: 'between' });
            });

            it('does not apply spacing to anonymous sub callbacks', () => {
                formatEqualTrim(`
                    function loadData()
                        return promise.chain(load).then(sub(result)
                            handle(result)
                        end sub).catch(sub(err)
                            throw err
                        end sub).finally(sub()
                            cleanup()
                        end sub).toPromise()
                    end function
                `, `
                    function loadData()

                        return promise.chain(load).then(sub(result)
                            handle(result)
                        end sub).catch(sub(err)
                            throw err
                        end sub).finally(sub()
                            cleanup()
                        end sub).toPromise()

                    end function
                `, { blockSpacing: { sub: 'always', function: 'always' } });
            });

            it('does not apply spacing to anonymous function expressions assigned to a variable', () => {
                formatEqualTrim(`
                    sub m()
                        x = function()
                            return 1
                        end function
                    end sub
                `, undefined, { blockSpacing: { function: 'always' } });
            });

            it('inserts blanks between siblings inside a namespace but not at boundaries', () => {
                formatEqualTrim(`
                    namespace c
                        sub first()
                            x = 1
                        end sub
                        namespace inner
                            sub middle()
                                x = 1
                            end sub
                        end namespace
                        sub last()
                            x = 1
                        end sub
                    end namespace
                `, `
                    namespace c
                        sub first()
                            x = 1
                        end sub

                        namespace inner
                            sub middle()
                                x = 1
                            end sub
                        end namespace

                        sub last()
                            x = 1
                        end sub
                    end namespace
                `, { blockSpacing: 'between' });
            });
        });
    });

    describe('alignAssignments', () => {
        it('aligns consecutive assignments by padding before the equals sign', () => {
            formatEqualTrim(`
                x = 1
                longName = 2
                y = 3
            `, `
                x        = 1
                longName = 2
                y        = 3
            `, { alignAssignments: true });
        });

        it('resets alignment after a blank line', () => {
            formatEqualTrim(`
                x = 1
                longName = 2

                a = 3
                bb = 4
            `, `
                x        = 1
                longName = 2

                a  = 3
                bb = 4
            `, { alignAssignments: true });
        });

        it('resets alignment after a non-assignment line', () => {
            formatEqualTrim(`
                x = 1
                longName = 2
                print "hello"
                a = 3
                bb = 4
            `, `
                x        = 1
                longName = 2
                print "hello"
                a  = 3
                bb = 4
            `, { alignAssignments: true });
        });

        it('does not align when set to false', () => {
            formatEqualTrim(`
                x = 1
                longName = 2
                y = 3
            `, undefined, { alignAssignments: false });
        });

        it('handles a single assignment (no alignment needed)', () => {
            formatEqualTrim(`
                x = 1
            `, undefined, { alignAssignments: true });
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

    describe('multiline function parameters and calls', () => {
        it('does not double indent [{...\\n...}]', () => {
            formatEqualTrim(`
                sub test()
                    foo([{
                        name: "bob"
                    }])
                end sub
            `);
        });

        it('does not double indent when sub passed to function', () => {
            formatEqualTrim(`
                callSomeFuncWithSubParam(sub()
                    print "hello"
                end sub)
            `);
        });

        it('indents function parameters when already split across lines', () => {
            formatEqualTrim(`
                function foo(
                param1 as string,
                param2,
                param3 as string
                ) as string
                end function
            `, `
                function foo(
                    param1 as string,
                    param2,
                    param3 as string
                ) as string
                end function
            `);
        });

        it('indents sub parameters when already split across lines', () => {
            formatEqualTrim(`
                sub foo(
                param1 as string,
                param2,
                param3 as string
                ) as string
                end sub
            `, `
                sub foo(
                    param1 as string,
                    param2,
                    param3 as string
                ) as string
                end sub
            `);
        });

        it('indents function parameters when already split across lines with function body', () => {
            formatEqualTrim(`
                function foo(
                param1 as    string,
                     param2  as       integer,
                param3  as    string
                )      as string
                        print "hello"
                return param1 + param2.toStr() + param3
                end function
            `, `
                function foo(
                    param1 as string,
                    param2 as integer,
                    param3 as string
                ) as string
                    print "hello"
                    return param1 + param2.toStr() + param3
                end function
            `);
        });

        it('indents multiline function calls', () => {
            formatEqualTrim(`
                myPoster = createObject(
                    "roSGNode",
                    "Poster"
                )
            `);
        });

        it('fixes indents in multiline function calls', () => {
            formatEqualTrim(`
                myPoster = createObject(
                         "roSGNode",
                "Poster"
                )
            `, `
                myPoster = createObject(
                    "roSGNode",
                    "Poster"
                )
            `);
        });

        it('does not modify single-line function declarations', () => {
            formatEqual('function foo(param1 as string, param2, param3 as string) as string\nend function');
        });

        it('does not modify single-line function call', () => {
            formatEqual('myPoster = createObject("roSGNode", "Poster")');
        });

        it('indents multiline callfunc calls', () => {
            formatEqualTrim(`
                myPoster = someNode@.someCallFunc(
                    1,
                    2,
                    { data: "bob" }
                )
            `);
        });

        it('fixes indents in multiline callfunc calls', () => {
            formatEqualTrim(`
                myPoster = someNode@.someCallFunc(
                         1,
                2,
                   {data: "bob"}
                )
            `, `
                myPoster = someNode@.someCallFunc(
                    1,
                    2,
                    { data: "bob" }
                )
            `);
        });

        it('indents in multiline function declarations in aa literals', () => {
            formatEqualTrim(`
                {
                    func: function(
                        param1 as function
                    ) as string
                        return param1(
                            "hello"
                        )
                    end function
                }
                
            `);
        });

        it('allows indents of grouping expressions', () => {
            formatEqualTrim(`
                a = b * (
                    3 - 2
                )
            `);
        });

        it('allows grouping expressions in function calls', () => {
            formatEqualTrim(`
                someFunc(
                    (4 + 7) * 2
                )
            `);
            formatEqualTrim(`
                someFunc(
                    (
                        4 + 7
                    ) * 2
                )
            `);
        });

        it('indents in multiline function calls with aa literals', () => {
            formatEqualTrim(`
                someFunc(
                    1,
                    { data: "bob" },
                    {
                        name: "multiLineAA",
                        value: 22
                    },
                    {
                        func: sub()
                            print "hello"
                        end sub,
                        func2: function(
                            param1 as function
                        ) as string
                            return param1(
                                "hello"
                            )
                        end function
                    }
                )
            `);
        });

        it('indents function calls with multiple args per line ', () => {
            formatEqualTrim(`
                someFunc(1, { data: "bob" }, {
                        name: "multiLineAA",
                        value: 22
                    }, "hello", {
                        func: sub()
                            print "hello"
                        end sub,
                        func2: function(
                            param1 as function
                        ) as string
                            return param1(
                                "hello"
                            )
                        end function
                    }
                )
            `);
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
            while (lines.length > 0 && lines[0].length === 0) {
                lines.splice(0, 1);
            }
            let trimStartIndex = null as number | null;
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                //if we don't have a starting trim count, compute it
                if (trimStartIndex === null && lines[lineIndex].trim().length > 0) {
                    trimStartIndex = lines[lineIndex].length - lines[lineIndex].trim().length;
                }

                if (lines[lineIndex].length > 0 && trimStartIndex !== null) {
                    lines[lineIndex] = lines[lineIndex].substring(trimStartIndex);
                }
            }
            //trim trailing newlines
            while (lines.length > 0 && lines[lines.length - 1].length === 0) {
                lines.splice(lines.length - 1);
            }
            sources[i] = lines.join('\n');
        }
        formatEqual(sources[0], sources[1], options);
    }

});
