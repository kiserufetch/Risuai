import { describe, expect, it } from 'vitest'
import { addRerolls, getPrerollState, PreUnreroll, Prereroll } from 'src/ts/process/prereroll'

describe('getPrerollState', () => {
    it('reports the visible candidate among pre-generated rerolls', () => {
        expect(getPrerollState('unknown')).toBeNull()
        addRerolls('gen-a', ['one', 'two', 'three'])
        expect(getPrerollState('gen-a')).toEqual({ index: 0, total: 3 })
        expect(Prereroll('gen-a')).toBe('two')
        expect(getPrerollState('gen-a')).toEqual({ index: 1, total: 3 })
        expect(PreUnreroll('gen-a')).toBe('one')
        expect(getPrerollState('gen-a')).toEqual({ index: 0, total: 3 })
    })

    it('clamps past the last candidate', () => {
        addRerolls('gen-b', ['one', 'two'])
        Prereroll('gen-b')
        expect(Prereroll('gen-b')).toBeNull()
        expect(getPrerollState('gen-b')).toEqual({ index: 1, total: 2 })
    })
})
