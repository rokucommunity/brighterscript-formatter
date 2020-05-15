/* eslint-disable */
// @ts-nocheck
import { normalizeOptions } from "./FormattingOptions";
import { expect } from "chai";

describe('FormattingOptions', () => {
    describe('normalizeOptions', () => {
        it('does not fail with deprecated values for `keywordCaseOverride`', () => {
            expect(
                normalizeOptions({
                    keywordCaseOverride: {
                        function: 'title',
                        sub: null,
                        if: 'original'
                    }
                }).keywordCaseOverride
            ).to.eql({
                function: 'title',
                sub: 'disabled',
                if: 'disabled'
            });
        });

        it('converts keywordCaseOverride conditional compile tokens to the proper token kind`', () => {
            let options = normalizeOptions({
                keywordCaseOverride: {
                    '#const': 'title',
                    '#else': 'title',
                    '#elseif': 'title',
                    '#endif': 'title',
                    '#error': 'title',
                    '#if': 'title'
                }
            });
            expect(options.keywordCaseOverride).to.eql({
                'hashconst': 'title',
                'hashelse': 'title',
                'hashelseif': 'title',
                'hashendif': 'title',
                'hasherror': 'title',
                'hashif': 'title'
            });
        });

        it('does not fail with deprecated values for `typeCaseOverride`', () => {
            expect(
                normalizeOptions({
                    typeCaseOverride: {
                        function: 'title',
                        sub: null,
                        string: 'original'
                    }
                }).typeCaseOverride
            ).to.eql({
                function: 'title',
                sub: 'disabled',
                string: 'disabled'
            });
        });
    });
});