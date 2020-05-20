import { expect } from 'chai';

import { Formatter } from './Formatter';
import { FormattingOptions } from './FormattingOptions';
import { TokenKind } from 'brighterscript';

describe('Formatter', () => {
    let formatter: Formatter;

    beforeEach(() => {
        formatter = new Formatter();
    });

    describe('formatIndent', () => {
        it('properly indents foreach loops', () => {
            formatEqual(
                `for each item in collection\n    name = true\nend for`
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
    });

    describe('formatMultiLineObjectsAndArrays', () => {
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
    });

    describe('dedupeWhitespace', () => {
        it('dedupes Whitespace', () => {
            const tokens = [{
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 0
            }, {
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 1
            }, {
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 2
            }];
            (formatter as any).dedupeWhitespace(tokens);
            expect(tokens).to.be.lengthOf(1);
        });
    });

    describe('formatInteriorWhitespace', () => {
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

            expect(formatter.format(`for   i=-1    to   -1    step   -1`)).to.equal(`for i = -1 to -1 step -1`);
            formatEqual(`a = [1, -24]`);
            formatEqual(`a = [-24]`);
            formatEqual(`a(-24)`);
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

        it('removes space between empty parens', () => {
            formatEqual(`main( )`, `main()`);
            formatEqual(`main()`, `main()`);
        });

        it('removes leading space when comma appears next to an item', () => {
            formatEqual(`action("value" ,"otherValue")`, `action("value", "otherValue")`);
        });

        it('disabling the rule works', () => {
            expect(formatter.format(`a=1`)).to.equal('a = 1');
            //disabled
            expect(formatter.format(`a=1`, {
                formatInteriorWhitespace: false
            })).to.equal('a=1');
        });
    });

    describe('getCompositeKeywordParts', () => {
        it('works', () => {
            let parts;
            parts = (formatter as any).getCompositeKeywordParts({ text: 'endif' });
            expect(parts[0]).to.equal('end');
            expect(parts[1]).to.equal('if');

            parts = (formatter as any).getCompositeKeywordParts({ text: 'end if' });
            expect(parts[0]).to.equal('end');
            expect(parts[1]).to.equal('if');

            parts = (formatter as any).getCompositeKeywordParts({ text: 'elseif' });
            expect(parts[0]).to.equal('else');
            expect(parts[1]).to.equal('if');

            parts = (formatter as any).getCompositeKeywordParts({ text: 'else if' });
            expect(parts[0]).to.equal('else');
            expect(parts[1]).to.equal('if');

            parts = (formatter as any).getCompositeKeywordParts({ text: '#else if' });
            expect(parts[0]).to.equal('#else');
            expect(parts[1]).to.equal('if');
        });
    });

    describe('indentStyle', () => {
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
            let program = `sub test()\n    if true then break\nend sub`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('handles single-line if-then-else statements', () => {
            let program = `sub test()\n    if true then break else break\nend sub`;
            expect(formatter.format(program)).to.equal(program);
        });

        it('handles resetting outdent when gone into the negative', () => {
            let program = `sub test()\n    if true then\n        doSomething()\n    end if\nend if\nend sub\nsub test2()\n    doSomething()\nend sub`;
            expect(formatter.format(program)).to.equal(program);
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
    });

    describe('keywordCase', () => {
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
        function format(text: string, kind: TokenKind) {
            let tokens = (formatter as any).formatCompositeKeywords([{
                text: text,
                kind: kind,
                startIndex: 0
            }], { compositeKeywords: 'split' });
            return tokens[0].text;
        }

        it('handles edge cases', () => {
            let tokens = (formatter as any).formatCompositeKeywords([{
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
            expect(format('endfunction', TokenKind.EndFunction)).to.equal('end function');
            expect(format('endif', TokenKind.EndIf)).to.equal('end if');
            expect(format('endsub', TokenKind.EndSub)).to.equal('end sub');
            expect(format('endwhile', TokenKind.EndWhile)).to.equal('end while');
            expect(format('exitwhile', TokenKind.ExitWhile)).to.equal('exit while');
            expect(format('exitfor', TokenKind.ExitFor)).to.equal('exit for');
            expect(format('endfor', TokenKind.EndFor)).to.equal('end for');
            expect(format('elseif', TokenKind.ElseIf)).to.equal('else if');

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
            expect(format('endFUNCTION', TokenKind.EndFunction)).to.equal('end FUNCTION');
        });

        it('handles multi-line arrays', () => {
            let program = `function DoSomething()\ndata=[\n1,\n2\n]\nend function`;
            expect(formatter.format(program)).to.equal(`function DoSomething()\n    data = [\n        1,\n        2\n    ]\nend function`);
        });
    });

    describe('upperCaseLetter()', () => {
        it('works for beginning of word', () => {
            expect(formatter.upperCaseLetter('hello', 0)).to.equal('Hello');
        });
        it('works for middle of word', () => {
            expect(formatter.upperCaseLetter('hello', 2)).to.equal('heLlo');
        });
        it('works for end of word', () => {
            expect(formatter.upperCaseLetter('hello', 4)).to.equal('hellO');
        });
        it('handles out-of-bounds indexes', () => {
            expect(formatter.upperCaseLetter('hello', -1)).to.equal('hello');
            expect(formatter.upperCaseLetter('hello', 5)).to.equal('hello');
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

    function formatEqual(incoming: string, expected?: string, options?: FormattingOptions) {
        expected = expected ?? incoming;
        expect(formatter.format(incoming, options)).to.equal(expected);
    }
});
