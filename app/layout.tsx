import type { ReactNode } from 'react'
import './globals.css'
import { LanguageProvider } from './i18n'

export const metadata = { title: 'Bank Bonus Tracker' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
