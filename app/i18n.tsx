'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  pickLanguage,
  type Language,
} from '@/lib/language'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (zh: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const applyDocumentLanguage = (language: Language) => {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    const stored = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
    setLanguageState(stored)
    applyDocumentLanguage(stored)
  }, [])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    applyDocumentLanguage(next)
  }, [])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (zh: string, en: string) => pickLanguage(language, zh, en),
    }),
    [language, setLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}
