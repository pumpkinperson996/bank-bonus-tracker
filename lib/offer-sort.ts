import type { Language } from './language'

export type OfferSortMode = 'catalog' | 'bonus-desc' | 'expiry-asc' | 'bank-asc'

type SortableOffer = {
  bank_name: string
  bonus_amount: number | null
  expires_on: string | null
  bank_scope: 'nationwide' | 'regional' | null
  accounts: Array<unknown>
}

export type OfferGroup<T> = {
  key: 'opened' | 'nationwide' | 'regional' | 'unclassified'
  title: string
  offers: T[]
}

function compareOffers<T extends SortableOffer>(mode: OfferSortMode) {
  if (mode === 'bonus-desc') {
    return (a: T, b: T) => (b.bonus_amount ?? -1) - (a.bonus_amount ?? -1)
  }
  if (mode === 'expiry-asc') {
    return (a: T, b: T) => {
      if (a.expires_on === null) return b.expires_on === null ? 0 : 1
      if (b.expires_on === null) return -1
      return a.expires_on.localeCompare(b.expires_on)
    }
  }
  if (mode === 'bank-asc') {
    return (a: T, b: T) => a.bank_name.localeCompare(b.bank_name, 'en')
  }
  return null
}

export function groupAndSortOffers<T extends SortableOffer>(
  offers: T[],
  mode: OfferSortMode,
  language: Language = 'zh'
): OfferGroup<T>[] {
  const comparator = compareOffers<T>(mode)
  const sorted = (items: T[]) => (comparator ? [...items].sort(comparator) : items)
  const opened = offers.filter(offer => offer.accounts.length > 0)
  const unopened = offers.filter(offer => offer.accounts.length === 0)

  const groups: OfferGroup<T>[] = [
    {
      key: 'opened',
      title: language === 'zh' ? `已开户账户（${opened.length}）` : `Opened accounts (${opened.length})`,
      offers: sorted(opened),
    },
    ...(
      [
        { key: 'nationwide', zh: '全国性银行', en: 'Nationwide banks' },
        { key: 'regional', zh: '区域性银行', en: 'Regional banks' },
        { key: 'unclassified', zh: '未分类银行', en: 'Unclassified banks' },
      ] as const
    ).map(({ key, zh, en }) => {
      const scoped = unopened.filter(offer =>
        key === 'unclassified' ? offer.bank_scope === null : offer.bank_scope === key
      )
      const title = language === 'zh' ? `${zh}（${scoped.length}）` : `${en} (${scoped.length})`
      return { key, title, offers: sorted(scoped) }
    }),
  ]

  return groups.filter(group => group.offers.length > 0)
}
