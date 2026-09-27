import { describe, expect, it } from 'vitest'
import { applySchemeTokens, contrastRatio, parseHexColor, pickOnAccent, relativeLuminance } from '../schemeTokens'

describe('schemeTokens', () => {
    it('parses 3, 6 and 8 digit hex colors', () => {
        expect(parseHexColor('#fff')).toEqual([255, 255, 255])
        expect(parseHexColor('#6366f1')).toEqual([99, 102, 241])
        expect(parseHexColor('#6366f1cc')).toEqual([99, 102, 241])
        expect(parseHexColor('rgb(1, 2, 3)')).toBeNull()
    })

    it('computes WCAG contrast ratios', () => {
        expect(contrastRatio(relativeLuminance([255, 255, 255]), relativeLuminance([0, 0, 0]))).toBeCloseTo(21, 1)
    })

    it('picks the more readable foreground for accents of built-in schemes', () => {
        expect(pickOnAccent('#6366f1')).toBe('#ffffff') // default
        expect(pickOnAccent('#0f172a')).toBe('#ffffff') // light scheme: near-black accent
        expect(pickOnAccent('#525252')).toBe('#ffffff') // dark
        expect(pickOnAccent('#8be9fd')).toBe('#111111') // galaxy
        expect(pickOnAccent('#a8dadc')).toBe('#111111') // nature
    })

    it('falls back to white for colors it cannot parse', () => {
        expect(pickOnAccent('var(--x)')).toBe('#ffffff')
        expect(pickOnAccent('rgb(255, 255, 255)')).toBe('#ffffff')
        expect(pickOnAccent('')).toBe('#ffffff')
    })

    it('writes the on-accent token and the scheme type onto an element', () => {
        const element = document.createElement('div')
        applySchemeTokens(element, { borderc: '#8be9fd', type: 'light' })
        expect(element.style.getPropertyValue('--mc-on-accent')).toBe('#111111')
        expect(element.dataset.scheme).toBe('light')
    })
})
