'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Account, DdEvent, EligibilityRule, Offer } from '@/lib/types'
import { summarizeReceivedBonuses } from '@/lib/bonus-summary'
import { eligibilityRuleState } from '@/lib/eligibility'
import {
  churnEligibleOn,
  daysSince,
  daysOpen,
  ddDeadline,
  expiryCountdown,
  payoutWait,
  safeCloseOn,
} from '@/lib/dates'
import {
  applicationStatusLabel,
  offerSourceLinks,
  receivedTogglePatch,
  shouldShowApplicationStatus,
} from '@/lib/offer-presentation'
import { groupAndSortOffers, type OfferSortMode } from '@/lib/offer-sort'
import { AccountForm, api, Header, OfferForm, todayISO } from './ui'
import { useLanguage } from './i18n'
import type { Language } from '@/lib/language'

type AccountRow = Account & { dd_events: DdEvent[] }
type OfferRow = Offer & { accounts: AccountRow[] }

function useLiveToday() {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayISO()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return today
}

const churnFromLabel = (v: 'close' | 'bonus' | null, language: Language) =>
  language === 'zh'
    ? v === 'bonus' ? '自奖励到账' : v === 'close' ? '自关户' : '基准未知'
    : v === 'bonus' ? 'from bonus received' : v === 'close' ? 'from account closing' : 'unknown anchor'

const eligibilityKindLabel = (kind: EligibilityRule['kind'], language: Language) => ({
  current_account: language === 'zh' ? '现有账户' : 'Existing account',
  account_history: language === 'zh' ? '账户历史' : 'Account history',
  bonus_history: language === 'zh' ? '奖励历史' : 'Bonus history',
  membership_history: language === 'zh' ? '会员历史' : 'Membership history',
  calendar_limit: language === 'zh' ? '自然年限制' : 'Calendar-year limit',
  household_limit: language === 'zh' ? '家庭限制' : 'Household limit',
  lifetime_limit: language === 'zh' ? '终身限制' : 'Lifetime limit',
  other: language === 'zh' ? '其他限制' : 'Other restriction',
})[kind]

function LegacyChurnSummary({ offer }: { offer: OfferRow }) {
  const { language, t } = useLanguage()
  return (
    <>
      {offer.churnable == null ? t('未知', 'Unknown') : offer.churnable ? t('可', 'Yes') : t('不可', 'No')}
      {offer.churn_interval_months != null &&
        t(
          `，每 ${offer.churn_interval_months} 个月（${churnFromLabel(offer.churn_from, language)}）`,
          `, every ${offer.churn_interval_months} months (${churnFromLabel(offer.churn_from, language)})`
        )}
    </>
  )
}

function EligibilityRules({ offer }: { offer: OfferRow }) {
  const { language } = useLanguage()
  if (offer.eligibility_rules.length === 0) return <LegacyChurnSummary offer={offer} />
  return (
    <ul className="eligibility-rules">
      {offer.eligibility_rules.map((rule, index) => (
        <li key={`${rule.kind}-${index}`} title={rule.description}>
          <strong>{eligibilityKindLabel(rule.kind, language)}</strong>
          <span>{rule.description}</span>
        </li>
      ))}
    </ul>
  )
}

function BankTitle({ offer }: { offer: OfferRow }) {
  const { t } = useLanguage()
  const title = <strong>{offer.bank_name}</strong>
  const { bankHref } = offerSourceLinks(offer)
  return bankHref ? (
    <a href={bankHref} target="_blank" rel="noreferrer" title={t('打开最新核对的 Doctor of Credit 页面', 'Open the latest verified Doctor of Credit page')}>
      {title}
    </a>
  ) : (
    title
  )
}

function Outcome({ offer, today }: { offer: OfferRow; today: string }) {
  const { language, t } = useLanguage()
  if (!shouldShowApplicationStatus(offer.application_status, offer.accounts.length)) return null

  const badgeClass =
    offer.application_status === 'denied'
      ? 'red'
      : offer.application_status === 'ineligible'
        ? 'amber'
        : 'grey'
  return (
    <div className="offer-outcome">
      <span className={`badge ${badgeClass}`}>{applicationStatusLabel(offer.application_status, language)}</span>
      {offer.application_status_reason && (
        <span className="muted" title={offer.application_status_reason}>
          {offer.application_status_reason}
        </span>
      )}
      {offer.application_status === 'denied' && offer.application_denied_on && (
        <span className="muted denial-age">
          {t(
            `被拒 ${offer.application_denied_on} · 距今 ${daysSince(offer.application_denied_on, today)} 天`,
            `Denied ${offer.application_denied_on} · ${daysSince(offer.application_denied_on, today)} days ago`
          )}
        </span>
      )}
    </div>
  )
}

function FeeNote({ offer, prefix = false }: { offer: OfferRow; prefix?: boolean }) {
  const { t } = useLanguage()
  const { feeHref } = offerSourceLinks(offer)
  return (
    <div className="fee-note">
      <span className="trunc" title={offer.fee_note ?? undefined}>
        {prefix && t('月费: ', 'Monthly fee: ')}
        {offer.fee_note ?? t('DoC 暂无月费记录', 'No monthly-fee record in DoC')}
      </span>
      {feeHref && (
        <a className="source-link" href={feeHref} target="_blank" rel="noreferrer">
          {offer.doc_url ? t('DoC 月费来源 ↗', 'DoC fee source ↗') : t('官方月费来源 ↗', 'Official fee source ↗')}
        </a>
      )}
    </div>
  )
}

function ChurnSourceLink({ offer }: { offer: OfferRow }) {
  const { t } = useLanguage()
  const { churnHref } = offerSourceLinks(offer)
  return churnHref ? (
    <a className="source-link" href={churnHref} target="_blank" rel="noreferrer">
      {t('DoC 来源 ↗', 'DoC source ↗')}
    </a>
  ) : null
}

function HoldSourceLink({ offer, hasKnownTerm }: { offer: OfferRow; hasKnownTerm: boolean }) {
  const { t } = useLanguage()
  const { holdHref } = offerSourceLinks(offer)
  return holdHref ? (
    <a className="source-link" href={holdHref} target="_blank" rel="noreferrer">
      {hasKnownTerm ? t('DoC 持有条款 ↗', 'DoC hold terms ↗') : t('查看 DoC ↗', 'View DoC ↗')}
    </a>
  ) : null
}

function ClosureMethod({ offer }: { offer: OfferRow }) {
  const { t } = useLanguage()
  const { closureHref } = offerSourceLinks(offer)
  return (
    <div className="closure-method">
      {offer.closure_method ? (
        <span className="trunc" title={offer.closure_method}>
          {offer.closure_method}
        </span>
      ) : (
        <span className="muted">{t('DoC 暂无对应记录', 'No matching record in DoC')}</span>
      )}
      {closureHref && (
        <a className="source-link" href={closureHref} target="_blank" rel="noreferrer">
          {t('DoC 关户来源 ↗', 'DoC closure source ↗')}
        </a>
      )}
    </div>
  )
}

function OfferExpiry({ offer, today }: { offer: OfferRow; today: string }) {
  const { t } = useLanguage()
  const expiry = expiryCountdown(offer.expires_on, today)
  if (!expiry || !offer.expires_on) return <span className="muted">{t('未知', 'Unknown')}</span>
  if (expiry.expired) {
    return (
      <>
        <div className="muted">{offer.expires_on}</div>
        <span className="badge grey">{t(`已过期 ${-expiry.daysRemaining} 天`, `Expired ${-expiry.daysRemaining} days ago`)}</span>
      </>
    )
  }
  return (
    <>
      <div className="muted">{offer.expires_on}</div>
      <span className={`badge ${expiry.daysRemaining <= 14 ? 'amber' : 'green'}`}>
        {expiry.daysRemaining === 0 ? t('今天到期', 'Expires today') : t(`剩 ${expiry.daysRemaining} 天`, `${expiry.daysRemaining} days left`)}
      </span>
    </>
  )
}

// All per-account computed values, shared by table and card layouts.
function deriveAccount(acct: AccountRow, offer: OfferRow, today: string) {
  const dated = acct.dd_events
    .map(e => e.happened_on)
    .filter((d): d is string => d != null)
    .sort()
  // Cooldown anchor: bonus-received date when the bank counts from the bonus,
  // closed date otherwise (unknown anchor behaves like close, labeled 基准未知).
  const churnAnchor = offer.churn_from === 'bonus' ? acct.bonus_received_on : acct.closed_on
  return {
    received: acct.bonus_received_on != null,
    open: daysOpen(acct.opened_on, today),
    dl: acct.history_only ? null : ddDeadline(acct.opened_on, offer.deadline_days, today),
    cool: churnEligibleOn(churnAnchor, offer.churn_interval_months, today),
    ruleCooldowns: offer.eligibility_rules.map(rule =>
      eligibilityRuleState(rule, offer.accounts, today)
    ),
    safe: acct.history_only
      ? null
      : safeCloseOn(acct.opened_on, acct.min_hold_days ?? offer.min_hold_days, today),
    wait: payoutWait(dated[dated.length - 1] ?? null, acct.bonus_received_on, today),
  }
}
type Derived = ReturnType<typeof deriveAccount>

export default function Dashboard() {
  const { language, t } = useLanguage()
  const [offers, setOffers] = useState<OfferRow[] | null>(null)
  const [sortMode, setSortMode] = useState<OfferSortMode>('catalog')
  const today = useLiveToday()
  const load = async () => setOffers(await (await fetch('/api/offers')).json())
  useEffect(() => {
    void load()
  }, [])

  const summary = offers
    ? summarizeReceivedBonuses(offers.flatMap((offer) => offer.accounts))
    : null
  const groups = offers ? groupAndSortOffers(offers, sortMode, language) : []

  return (
    <main className="container wide">
      <Header />
      {offers == null ? (
        <p className="muted">{t('加载中…', 'Loading…')}</p>
      ) : (
        <>
          <div className="card bonus-summary">
            <div>
              <span className="muted">{t('已拿到的 Bonus 总额', 'Total bonuses received')}</span>
              <strong>${summary!.total.toLocaleString()}</strong>
            </div>
            <div>
              <span className="muted">{t('已到账账户', 'Accounts paid')}</span>
              <strong>{summary!.receivedCount}</strong>
            </div>
            <div>
              <span className="muted">{t('金额待补', 'Amounts missing')}</span>
              <strong>{summary!.missingAmountCount}</strong>
            </div>
          </div>
          <div className="card dashboard-toolbar">
            <div>
              <strong>{t('银行列表', 'Bank offers')}</strong>
              <span className="hint">{t('已开户账户始终置顶；排序应用于各分组内部。', 'Opened accounts stay first; sorting applies within each group.')}</span>
            </div>
            <label className="sort-control">
              {t('排序', 'Sort')}
              <select
                data-testid="offer-sort"
                value={sortMode}
                onChange={event => setSortMode(event.target.value as OfferSortMode)}
              >
                <option value="catalog">{t('目录顺序', 'Catalog order')}</option>
                <option value="bonus-desc">{t('奖励从高到低', 'Bonus: high to low')}</option>
                <option value="expiry-asc">{t('到期由近到远', 'Expiration: soonest first')}</option>
                <option value="bank-asc">{t('银行名称 A–Z', 'Bank name A–Z')}</option>
              </select>
            </label>
          </div>
          {offers.length === 0 ? (
            <div className="card">
              {t('还没有 Offer。', 'No offers yet.')} <Link href="/new">{t('添加第一个 Offer', 'Add your first offer')}</Link>.
            </div>
          ) : (
            <div className="sheet-wrap">
              <table className="sheet tracking-sheet">
                <colgroup>
                  <col className="col-bank" />
                  <col className="col-bonus" />
                  <col className="col-expiry" />
                  <col className="col-fee" />
                  <col className="col-requirements" />
                  <col className="col-eligibility" />
                  <col className="col-closure" />
                  <col className="col-account" />
                  <col className="col-opened" />
                  <col className="col-dd" />
                  <col className="col-hold" />
                  <col className="col-churn" />
                  <col className="col-received" />
                  <col className="col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t('银行', 'Bank')}</th>
                    <th>{t('奖励', 'Bonus')}</th>
                    <th>{t('券倒计时', 'Offer countdown')}</th>
                    <th>{t('月费', 'Monthly fee')}</th>
                    <th>{t('要求', 'Requirements')}</th>
                    <th>{t('资格 / Churn', 'Eligibility / Churn')}</th>
                    <th>{t('关户方式', 'Closure method')}</th>
                    <th>{t('账户', 'Account')}</th>
                    <th>{t('开户', 'Opened')}</th>
                    <th>DD</th>
                    <th>{t('最低持有', 'Minimum hold')}</th>
                    <th>{t('关户 / Churn', 'Close / Churn')}</th>
                    <th>{t('到账', 'Received')}</th>
                    <th>{t('操作', 'Actions')}</th>
                  </tr>
                </thead>
                {groups.map(group => (
                  <tbody key={group.key}>
                    <tr className="bank-section-row">
                      <td colSpan={COLS}>{group.title}</td>
                    </tr>
                    {group.offers.map(o => (
                      <OfferRows key={o.id} offer={o} today={today} reload={load} />
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}

const COLS = 14

// —— shared info lines (table cells and card facts render the same content) ——

function DeadlineLine({ d, acct }: { d: Derived; acct: AccountRow }) {
  const { t } = useLanguage()
  if (acct.closed_on || !d.dl) return null
  return (
    <div className="muted">
      {t('截止', 'Due')} {d.dl.deadline} ·{' '}
      {d.dl.daysRemaining >= 0
        ? t(`剩 ${d.dl.daysRemaining} 天`, `${d.dl.daysRemaining} days left`)
        : t(`超 ${-d.dl.daysRemaining} 天`, `${-d.dl.daysRemaining} days overdue`)}{' '}
      {d.dl.overdue && !d.received && <span className="badge red">{t('已逾期', 'Overdue')}</span>}
      {d.dl.near && !d.received && <span className="badge amber">{t('临近', 'Due soon')}</span>}
    </div>
  )
}

function SafeCloseLine({ d, acct }: { d: Derived; acct: AccountRow }) {
  const { t } = useLanguage()
  if (acct.closed_on) return <>{acct.closed_on}</>
  if (!d.safe) return <>—</>
  return d.safe.safeNow ? (
    <span className="badge green">{t('可安全关户', 'Safe to close')}</span>
  ) : (
    <span className="muted">
      {t('安全关户', 'Safe to close')} {d.safe.safeOn} · {t(`剩 ${d.safe.daysRemaining} 天`, `${d.safe.daysRemaining} days left`)}
    </span>
  )
}

function HoldRequirement({
  offer,
  acct,
  d,
}: {
  offer: OfferRow
  acct?: AccountRow
  d?: Derived
}) {
  const { t } = useLanguage()
  const days = acct ? (acct.min_hold_days ?? offer.min_hold_days) : offer.min_hold_days
  return (
    <div className="hold-requirement">
      {days == null ? <span className="muted">{t('未知', 'Unknown')}</span> : <strong>{t(`至少 ${days} 天`, `At least ${days} days`)}</strong>}
      {acct && d && days != null && (
        <div>
          <SafeCloseLine d={d} acct={acct} />
        </div>
      )}
      {offer.early_close_penalty && (
        <div className="muted trunc" title={offer.early_close_penalty}>
          {offer.early_close_penalty}
        </div>
      )}
      <HoldSourceLink offer={offer} hasKnownTerm={days != null} />
    </div>
  )
}

function CooldownLine({ d, acct, offer }: { d: Derived; acct: AccountRow; offer: OfferRow }) {
  const { language, t } = useLanguage()
  if (offer.eligibility_rules.length > 0) {
    return (
      <div className="rule-countdowns">
        {d.ruleCooldowns.map(({ rule, blockedByOpen, cooldown }, index) => {
          if (rule.kind === 'current_account') {
            return offer.accounts.some(account => account.closed_on == null) ? (
              <span className="badge red" key={index}>{t('现有账户仍开户，不能申请', 'An existing account is still open; not eligible')}</span>
            ) : (
              <span className="badge green" key={index}>{t('当前无开户记录', 'No open account on record')}</span>
            )
          }
          if (blockedByOpen) {
            return <span className="badge red" key={index}>{t('仍有账户开户，关户后开始计算', 'An account is still open; countdown starts after closing')}</span>
          }
          if (cooldown) {
            return cooldown.eligibleNow ? (
              <span className="badge green" key={index}>
                {t(`${eligibilityKindLabel(rule.kind, language)}已满足`, `${eligibilityKindLabel(rule.kind, language)} satisfied`)}
              </span>
            ) : (
              <span className="muted" key={index}>
                {t(
                  `${eligibilityKindLabel(rule.kind, language)}：${cooldown.eligibleOn} 满足 · 剩 ${cooldown.daysRemaining} 天`,
                  `${eligibilityKindLabel(rule.kind, language)}: eligible ${cooldown.eligibleOn} · ${cooldown.daysRemaining} days left`
                )}
              </span>
            )
          }
          if (rule.months != null && rule.anchor === 'bonus') {
            return <span className="muted" key={index}>{t('奖励历史：填写奖励到账日后计算', 'Bonus history: enter the bonus received date to calculate')}</span>
          }
          if (rule.months != null && rule.anchor === 'close') {
            return <span className="muted" key={index}>{t('账户历史：关户后开始计算', 'Account history: countdown starts after closing')}</span>
          }
          return <span className="muted" key={index}>{eligibilityKindLabel(rule.kind, language)}{t('：请按 DoC 条款人工确认', ': confirm manually against the DoC terms')}</span>
        })}
      </div>
    )
  }
  if (!offer.churnable && offer.churn_interval_months == null) return null
  if (d.cool) {
    return d.cool.eligibleNow ? (
      <span className="badge green">{t('现在可 churn', 'Eligible to churn now')}</span>
    ) : (
      <span className="muted">
        {t(
          `可再 churn ${d.cool.eligibleOn} · 剩 ${d.cool.daysRemaining} 天（${churnFromLabel(offer.churn_from, language)}）`,
          `Eligible to churn ${d.cool.eligibleOn} · ${d.cool.daysRemaining} days left (${churnFromLabel(offer.churn_from, language)})`
        )}
      </span>
    )
  }
  // No anchor date yet: waiting on the bonus (bonus anchor) or on closing (close/unknown).
  if (offer.churn_from === 'bonus') return <span className="muted">{t('冷却奖励到账后起算', 'Cooldown starts after bonus receipt')}</span>
  if (!acct.closed_on)
    return (
      <span className="muted">{t('冷却关户后起算', 'Cooldown starts after closing')}{offer.churn_from == null ? t('（基准未知）', ' (unknown anchor)') : ''}</span>
    )
  return null
}

// —— shared controls ——

function ReceivedControl({
  acct,
  d,
  today,
  offerBonus,
  patch,
}: {
  acct: AccountRow
  d: Derived
  today: string
  offerBonus: number | null
  patch: (body: Record<string, unknown>) => Promise<void>
}) {
  const { t } = useLanguage()
  const [amount, setAmount] = useState(
    acct.bonus_received_amount == null ? '' : String(acct.bonus_received_amount)
  )
  useEffect(() => {
    setAmount(acct.bonus_received_amount == null ? '' : String(acct.bonus_received_amount))
  }, [acct.bonus_received_amount])

  const saveAmount = () => {
    const value = amount.trim() === '' ? null : Number(amount)
    if (value !== null && (!Number.isFinite(value) || value < 0)) return
    if (value !== acct.bonus_received_amount) void patch({ bonus_received_amount: value })
  }

  return (
    <>
      <input
        type="checkbox"
        checked={d.received}
        onChange={e =>
          patch(
            receivedTogglePatch(
              e.target.checked,
              today,
              acct.bonus_received_amount,
              offerBonus
            )
          )
        }
      />
      {d.received && (
        <div>
          <input
            type="date"
            value={acct.bonus_received_on ?? ''}
            onChange={e => e.target.value && patch({ bonus_received_on: e.target.value })}
          />
          <label className="received-amount">
            {t('实收 $', 'Received $')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onBlur={saveAmount}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          </label>
        </div>
      )}
      {d.wait != null && (
        <div className="muted">{d.received ? t(`等了 ${d.wait} 天`, `Waited ${d.wait} days`) : t(`距上笔 DD ${d.wait} 天`, `${d.wait} days since last DD`)}</div>
      )}
    </>
  )
}

function CloseControl({
  acct,
  d,
  today,
  patch,
}: {
  acct: AccountRow
  d: Derived
  today: string
  patch: (body: Record<string, unknown>) => Promise<void>
}) {
  const { t } = useLanguage()
  const [closing, setClosing] = useState(false)
  const [closeDate, setCloseDate] = useState(today)
  if (acct.closed_on) return null
  return closing ? (
    <span className="actions">
      <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
      <button
        onClick={() => {
          if (
            d.safe &&
            closeDate < d.safe.safeOn &&
            !confirm(
              t(
                `关户日期早于安全关户日 ${d.safe.safeOn}，可能产生提前关户费或奖励被追回（clawback）。仍要关户吗？`,
                `The closing date is before the safe date ${d.safe.safeOn}. An early-closure fee or bonus clawback may apply. Close anyway?`
              )
            )
          )
            return
          void patch({ closed_on: closeDate })
        }}
      >
        {t('确认', 'Confirm')}
      </button>
      <button onClick={() => setClosing(false)}>{t('取消', 'Cancel')}</button>
    </span>
  ) : (
    <button onClick={() => setClosing(true)}>{t('关户…', 'Close…')}</button>
  )
}

const ddLabel = (e: DdEvent, missingDate: string) =>
  [e.happened_on ? e.happened_on.slice(5) : missingDate, e.amount != null ? `$${e.amount}` : null, e.source_note]
    .filter(v => v != null)
    .join('·')

function DdContent({
  acct,
  ddCount,
  today,
  reload,
}: {
  acct: AccountRow
  ddCount: number | null
  today: string
  reload: () => Promise<void>
}) {
  const { t } = useLanguage()
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('')
  const closed = acct.closed_on != null

  async function add() {
    await api(`/api/accounts/${acct.id}/dd`, 'POST', {
      happened_on: date || null,
      amount: amount.trim() === '' ? null : Number(amount),
      source_note: source.trim() || null,
    })
    setAdding(false)
    setAmount('')
    setSource('')
    await reload()
  }

  if (closed && acct.dd_events.length === 0) return <>—</>
  return (
    <>
      {ddCount != null && (
        <div>
          {acct.dd_events.length} / {ddCount}
        </div>
      )}
      {acct.dd_events.length > 0 && (
        <ul className="dd-events">
          {acct.dd_events.map(e => (
            <li key={e.id}>
              {ddLabel(e, t('日期未记', 'Date not recorded'))}
              {!closed && (
                <button
                  className="danger"
                  title={t('删除', 'Delete')}
                  onClick={async () => {
                    await api(`/api/dd/${e.id}`, 'DELETE')
                    await reload()
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!closed &&
        (adding ? (
          <span className="dd-add">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input type="number" placeholder="$" value={amount} onChange={e => setAmount(e.target.value)} />
            <input placeholder={t('来源', 'Source')} value={source} onChange={e => setSource(e.target.value)} />
            <button onClick={add}>{t('确认', 'Confirm')}</button>
            <button onClick={() => setAdding(false)}>{t('取消', 'Cancel')}</button>
          </span>
        ) : (
          <button onClick={() => setAdding(true)}>{t('加一笔', 'Add DD')}</button>
        ))}
    </>
  )
}

// —— desktop table ——

function OfferRows({
  offer,
  today,
  reload,
}: {
  offer: OfferRow
  today: string
  reload: () => Promise<void>
}) {
  const { t } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [addingAcct, setAddingAcct] = useState(false)
  const [editingAcct, setEditingAcct] = useState<AccountRow | null>(null)
  const { accounts, id, created_at, ...input } = offer
  void id
  void created_at
  const span = Math.max(accounts.length, 1)

  const exp = expiryCountdown(offer.expires_on, today)
  const offCls = exp?.expired ? ' expired-offer' : ''

  async function del() {
    if (!confirm(t(`删除“${offer.bank_name}”及其 ${accounts.length} 个账户？`, `Delete "${offer.bank_name}" and its ${accounts.length} account(s)?`))) return
    await api(`/api/offers/${offer.id}`, 'DELETE')
    await reload()
  }

  const offerCells = (
    <>
      <td rowSpan={span} className={`bank-cell${offCls}`}>
        <BankTitle offer={offer} />
        <Outcome offer={offer} today={today} />
        {(offer.product_name || offer.account_type) && (
          <div className="muted">
            {[offer.product_name, offer.account_type].filter(Boolean).join(' · ')}
          </div>
        )}
        {offer.notes && (
          <div className="muted trunc" title={offer.notes}>
            {offer.notes}
          </div>
        )}
        {offer.doc_checked_on && <div className="muted">{t('DoC 核对', 'DoC verified')} {offer.doc_checked_on}</div>}
        <span className="actions">
          <button onClick={() => setEditing(!editing)}>{editing ? t('取消', 'Cancel') : t('编辑', 'Edit')}</button>
          <button className="danger" onClick={del}>
            {t('删除', 'Delete')}
          </button>
        </span>
        {accounts.length > 0 && (
          <span className="actions">
            <button onClick={() => setAddingAcct(!addingAcct)}>{t('+开户', '+ Account')}</button>
          </span>
        )}
      </td>
      <td rowSpan={span} className={`num${offCls}`}>
        {offer.bonus_amount != null ? `$${offer.bonus_amount}` : '—'}
      </td>
      <td rowSpan={span} className={`expiry-cell${offCls}`}>
        <OfferExpiry offer={offer} today={today} />
      </td>
      <td rowSpan={span} className={`fee-cell${offCls}`}>
        <FeeNote offer={offer} />
      </td>
      <td rowSpan={span} className={`req-cell${offCls}`} title={offer.requirements ?? ''}>
        {offer.requirements ?? '—'}
        {(offer.dd_amount != null || offer.dd_count != null) && (
          <div className="muted">
            DD {offer.dd_amount != null ? `$${offer.dd_amount}` : '?'} × {offer.dd_count ?? '?'}
            {offer.deadline_days != null && t(` · ${offer.deadline_days} 天内`, ` · within ${offer.deadline_days} days`)}
          </div>
        )}
        {offer.early_close_penalty && (
          <div className="muted trunc" title={offer.early_close_penalty}>
            {t('提前关户', 'Early closure')}: {offer.early_close_penalty}
          </div>
        )}
      </td>
      <td rowSpan={span} className={`churn-cell${offCls}`}>
        <EligibilityRules offer={offer} />
        {offer.churn_source_note && (
          <div className="muted trunc" title={offer.churn_source_note}>
            {t('社区来源', 'Community source')}: {offer.churn_source_note}
          </div>
        )}
        <ChurnSourceLink offer={offer} />
      </td>
      <td rowSpan={span} className={`closure-cell${offCls}`}>
        <ClosureMethod offer={offer} />
      </td>
    </>
  )

  return (
    <Fragment>
      {accounts.length === 0 ? (
        <tr>
          {offerCells}
          <td className="acct-cell">
            <span className="muted">{t('尚未开户', 'Not opened')}</span>
            <button onClick={() => setAddingAcct(!addingAcct)}>{t('+开户', '+ Account')}</button>
          </td>
          <td className="muted">
            {t('开户后记录', 'Record after opening')}
          </td>
          <td className="muted">
            {t('开户后计算', 'Calculate after opening')}
          </td>
          <td className="hold-cell">
            <HoldRequirement offer={offer} />
          </td>
          <td className="muted">
            {t('开户后计算', 'Calculate after opening')}
          </td>
          <td className="muted center">
            {t('开户后记录', 'Record after opening')}
          </td>
          <td className="muted">
            {t('尚无操作', 'No actions yet')}
          </td>
        </tr>
      ) : (
        accounts.map((a, i) => (
          <AccountCells
            key={a.id}
            acct={a}
            offer={offer}
            today={today}
            reload={reload}
            offerCells={i === 0 ? offerCells : null}
            onEdit={() => setEditingAcct(a)}
          />
        ))
      )}
      {addingAcct && (
        <tr>
          <td colSpan={COLS}>
            <AccountForm
              initial={{
                opened_on: today,
                closed_on: null,
                bonus_received_on: null,
                bonus_received_amount: null,
                history_only: false,
                name: offer.product_name,
                account_type: offer.account_type,
                monthly_fee: offer.fee_note,
                early_close_penalty: offer.early_close_penalty,
                min_hold_days: offer.min_hold_days,
                notes: null,
              }}
              saveLabel={t('添加账户', 'Add account')}
              onSave={async v => {
                await api(`/api/offers/${offer.id}`, 'POST', v)
                setAddingAcct(false)
                await reload()
              }}
              onCancel={() => setAddingAcct(false)}
            />
          </td>
        </tr>
      )}
      {editingAcct && (
        <tr>
          <td colSpan={COLS}>
            <AccountForm
              initial={editingAcct}
              saveLabel={t('保存账户', 'Save account')}
              onSave={async v => {
                await api(`/api/accounts/${editingAcct.id}`, 'PATCH', v)
                setEditingAcct(null)
                await reload()
              }}
              onCancel={() => setEditingAcct(null)}
            />
          </td>
        </tr>
      )}
      {editing && (
        <tr>
          <td colSpan={COLS}>
            <OfferForm
              initial={input}
              saveLabel={t('保存修改', 'Save changes')}
              onSave={async v => {
                await api(`/api/offers/${offer.id}`, 'PATCH', v)
                await reload()
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function AccountCells({
  acct,
  offer,
  today,
  reload,
  offerCells,
  onEdit,
}: {
  acct: AccountRow
  offer: OfferRow
  today: string
  reload: () => Promise<void>
  offerCells: React.ReactNode
  onEdit: () => void
}) {
  const { t } = useLanguage()
  const d = deriveAccount(acct, offer, today)
  const patch = async (body: Record<string, unknown>) => {
    await api(`/api/accounts/${acct.id}`, 'PATCH', body)
    await reload()
  }

  return (
    <tr className={acct.closed_on ? 'closed-row' : ''}>
      {offerCells}
      <td className="acct-cell">
        <strong>{acct.name ?? '—'}</strong>
        {acct.history_only && <span className="badge grey">{t('历史补录', 'Historical entry')}</span>}
        {acct.account_type && <div className="muted">{acct.account_type}</div>}
        {acct.monthly_fee && (
          <div className="muted trunc" title={acct.monthly_fee}>
            {t('月费', 'Monthly fee')}: {acct.monthly_fee}
          </div>
        )}
        {acct.early_close_penalty && (
          <div className="muted trunc" title={acct.early_close_penalty}>
            {t('提前关户', 'Early closure')}: {acct.early_close_penalty}
          </div>
        )}
        <button onClick={onEdit}>{t('编辑', 'Edit')}</button>
      </td>
      <td className="nowrap">
        <input
          type="date"
          value={acct.opened_on}
          onChange={e => e.target.value && patch({ opened_on: e.target.value })}
        />
        {!acct.closed_on && d.open != null && <div className="muted">{t(`已开户 ${d.open} 天`, `Open for ${d.open} days`)}</div>}
      </td>
      <td className="nowrap">
        {acct.history_only ? (
          <span className="muted">{t('不套用当前 Offer 的 DD', 'Current offer DD does not apply')}</span>
        ) : (
          <>
            <DdContent acct={acct} ddCount={offer.dd_count} today={today} reload={reload} />
            <DeadlineLine d={d} acct={acct} />
          </>
        )}
      </td>
      <td className="hold-cell">
        {acct.history_only ? (
          <span className="muted">{t('不套用当前 Offer 的持有期', 'Current offer hold period does not apply')}</span>
        ) : (
          <HoldRequirement offer={offer} acct={acct} d={d} />
        )}
      </td>
      <td className="close-cell">
        {acct.closed_on && <div className="muted">{t('已关户', 'Closed')} {acct.closed_on}</div>}
        <CooldownLine d={d} acct={acct} offer={offer} />
      </td>
      <td className="center">
        <ReceivedControl
          acct={acct}
          d={d}
          today={today}
          offerBonus={acct.history_only ? null : offer.bonus_amount}
          patch={patch}
        />
      </td>
      <td className="nowrap">
        <CloseControl acct={acct} d={d} today={today} patch={patch} />
        {acct.notes && (
          <div className="muted trunc" title={acct.notes}>
            {acct.notes}
          </div>
        )}
      </td>
    </tr>
  )
}

// —— mobile cards ——

function OfferCard({
  offer,
  today,
  reload,
}: {
  offer: OfferRow
  today: string
  reload: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [addingAcct, setAddingAcct] = useState(false)
  const [editingAcct, setEditingAcct] = useState<AccountRow | null>(null)
  const { accounts, id, created_at, ...input } = offer
  void id
  void created_at

  async function del() {
    if (!confirm(`Delete "${offer.bank_name}" and its ${accounts.length} account(s)?`)) return
    await api(`/api/offers/${offer.id}`, 'DELETE')
    await reload()
  }

  return (
    <div className="card offer-card">
      <div className="card-head">
        <div>
          <BankTitle offer={offer} />
          <Outcome offer={offer} today={today} />
          {(offer.product_name || offer.account_type) && (
            <div className="muted">
              {[offer.product_name, offer.account_type].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <strong>{offer.bonus_amount != null ? `$${offer.bonus_amount}` : '—'}</strong>
      </div>
      <div className="facts">
        <div className="mobile-expiry">
          券倒计时: <OfferExpiry offer={offer} today={today} />
        </div>
        <FeeNote offer={offer} prefix />
        {(offer.dd_amount != null || offer.dd_count != null) && (
          <span>
            DD {offer.dd_amount != null ? `$${offer.dd_amount}` : '?'} × {offer.dd_count ?? '?'}
            {offer.deadline_days != null && ` · ${offer.deadline_days} 天内`}
          </span>
        )}
        <div className="mobile-eligibility">
          资格 / Churn: <EligibilityRules offer={offer} />
        </div>
        <ChurnSourceLink offer={offer} />
        <div className="mobile-closure">
          关户方式: <ClosureMethod offer={offer} />
        </div>
        <HoldRequirement offer={offer} />
      </div>
      {offer.requirements && <p className="muted">{offer.requirements}</p>}
      {offer.doc_checked_on && <p className="muted">DoC 核对 {offer.doc_checked_on}</p>}
      {offer.notes && <p className="muted">{offer.notes}</p>}
      <span className="actions">
        <button onClick={() => setEditing(!editing)}>{editing ? '取消' : '编辑'}</button>
        <button className="danger" onClick={del}>
          删除
        </button>
        <button onClick={() => setAddingAcct(!addingAcct)}>+开户</button>
      </span>
      {editing && (
        <OfferForm
          initial={input}
          saveLabel="Save changes"
          onSave={async v => {
            await api(`/api/offers/${offer.id}`, 'PATCH', v)
            await reload()
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}
      {addingAcct && (
        <AccountForm
          initial={{
            opened_on: today,
            closed_on: null,
            bonus_received_on: null,
            bonus_received_amount: null,
            history_only: false,
            name: offer.product_name,
            account_type: offer.account_type,
            monthly_fee: offer.fee_note,
            early_close_penalty: offer.early_close_penalty,
            min_hold_days: offer.min_hold_days,
            notes: null,
          }}
          saveLabel="添加账户"
          onSave={async v => {
            await api(`/api/offers/${offer.id}`, 'POST', v)
            setAddingAcct(false)
            await reload()
          }}
          onCancel={() => setAddingAcct(false)}
        />
      )}
      {accounts.map(a =>
        editingAcct?.id === a.id ? (
          <AccountForm
            key={a.id}
            initial={editingAcct}
            saveLabel="保存账户"
            onSave={async v => {
              await api(`/api/accounts/${editingAcct.id}`, 'PATCH', v)
              setEditingAcct(null)
              await reload()
            }}
            onCancel={() => setEditingAcct(null)}
          />
        ) : (
          <AccountBlock
            key={a.id}
            acct={a}
            offer={offer}
            today={today}
            reload={reload}
            onEdit={() => setEditingAcct(a)}
          />
        )
      )}
    </div>
  )
}

function AccountBlock({
  acct,
  offer,
  today,
  reload,
  onEdit,
}: {
  acct: AccountRow
  offer: OfferRow
  today: string
  reload: () => Promise<void>
  onEdit: () => void
}) {
  const d = deriveAccount(acct, offer, today)
  const patch = async (body: Record<string, unknown>) => {
    await api(`/api/accounts/${acct.id}`, 'PATCH', body)
    await reload()
  }

  return (
    <div className={`acct-block${acct.closed_on ? ' closed-block' : ''}`}>
      <div className="card-head">
        <div>
          <strong>{acct.name ?? '账户'}</strong>
          {acct.history_only && <span className="badge grey">历史补录</span>}
        </div>
        <span className="actions">
          <button onClick={onEdit}>编辑</button>
          <CloseControl acct={acct} d={d} today={today} patch={patch} />
        </span>
      </div>
      <div className="facts">
        {acct.account_type && <span className="muted">{acct.account_type}</span>}
        {acct.monthly_fee && <span>月费: {acct.monthly_fee}</span>}
        <span>
          开户{' '}
          <input
            type="date"
            value={acct.opened_on}
            onChange={e => e.target.value && patch({ opened_on: e.target.value })}
          />
          {!acct.closed_on && d.open != null && ` · ${d.open} 天`}
        </span>
      </div>
      <div className="facts">
        {acct.closed_on && <span className="muted">已关户 {acct.closed_on}</span>}
        {acct.history_only ? (
          <span className="muted">不套用当前 Offer 的 DD 与持有期</span>
        ) : (
          <HoldRequirement offer={offer} acct={acct} d={d} />
        )}
        <CooldownLine d={d} acct={acct} offer={offer} />
      </div>
      {!acct.history_only && <DeadlineLine d={d} acct={acct} />}
      <div className="facts">
        {!acct.history_only && (
          <>
            <span className="muted">DD</span>
            <span>
              <DdContent acct={acct} ddCount={offer.dd_count} today={today} reload={reload} />
            </span>
          </>
        )}
        <div className="inline received-control">
          <span className="muted">到账</span>
          <ReceivedControl
            acct={acct}
            d={d}
            today={today}
            offerBonus={acct.history_only ? null : offer.bonus_amount}
            patch={patch}
          />
        </div>
      </div>
      {acct.notes && <p className="muted">{acct.notes}</p>}
    </div>
  )
}
