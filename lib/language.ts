export type Language = 'zh' | 'en'

export const DEFAULT_LANGUAGE: Language = 'zh'
export const LANGUAGE_STORAGE_KEY = 'bank-bonus-tracker-language'

export const normalizeLanguage = (value: unknown): Language =>
  value === 'en' ? 'en' : DEFAULT_LANGUAGE

export const pickLanguage = (language: Language, zh: string, en: string) =>
  language === 'zh' ? zh : en
