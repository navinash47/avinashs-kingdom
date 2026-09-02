import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { kingdomSearch, parseKingdomUrl, ventureIdFromFocus } from '../../src/lib/tab-url.ts'

describe('kingdom live page URLs', () => {
  it('keeps Research Lab as ?tab=research', () => {
    assert.deepEqual(parseKingdomUrl('?tab=research'), { tab: 'research', focus: null })
    assert.equal(kingdomSearch('research', 'venture:beamdojo'), '?tab=research')
  })

  it('encodes BeamDojo fleet focus in the URL', () => {
    assert.equal(kingdomSearch('graph', 'venture:beamdojo'), '?tab=graph&focus=venture%3Abeamdojo')
    const parsed = parseKingdomUrl('?tab=graph&focus=venture:beamdojo')
    assert.equal(parsed.tab, 'graph')
    assert.equal(parsed.focus, 'venture:beamdojo')
    assert.equal(ventureIdFromFocus(parsed.focus), 'beamdojo')
  })
})
