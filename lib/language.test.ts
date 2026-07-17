import { describe, expect, it } from 'vitest'
import { normalizeLanguage, pickLanguage } from './language'

describe('language helpers', () => {
  it('keeps supported languages and safely defaults to Chinese', () => {
    expect(normalizeLanguage('en')).toBe('en')
    expect(normalizeLanguage('zh')).toBe('zh')
    expect(normalizeLanguage('fr')).toBe('zh')
    expect(normalizeLanguage(null)).toBe('zh')
  })

  it('selects text for the active language', () => {
    expect(pickLanguage('zh', '中文', 'English')).toBe('中文')
    expect(pickLanguage('en', '中文', 'English')).toBe('English')
  })
})
