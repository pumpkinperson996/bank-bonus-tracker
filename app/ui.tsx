'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { normalizeApplicationOutcome } from '@/lib/offer-validation'
import { accountTimelineError } from '@/lib/account-timeline'
import { daysSince } from '@/lib/dates'
import type { OfferInput } from '@/lib/types'
import { useLanguage } from './i18n'

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const api = async (url: string, method: string, body?: unknown) => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const result = await response.clone().json().catch(() => null)
    throw new Error(result?.error ?? result?.message ?? `Request failed (${response.status})`)
  }
  return response
}

export const blankOffer: OfferInput = {
  bank_name: '',
  product_name: null,
  account_type: null,
  early_close_penalty: null,
  bonus_amount: null,
  requirements: null,
  dd_amount: null,
  dd_count: null,
  deadline_days: null,
  churnable: null,
  churn_interval_months: null,
  churn_from: null,
  churn_source_note: null,
  eligibility_rules: [],
  min_hold_days: null,
  expires_on: null,
  fee_note: null,
  notes: null,
  source: null,
  import_key: null,
  doc_url: null,
  doc_checked_on: null,
  churn_source_url: null,
  bank_scope: null,
  closure_method: null,
  closure_source_url: null,
  application_status: 'unreviewed',
  application_status_reason: null,
  application_denied_on: null,
}

export function Header({ title }: { title?: string }) {
  const { language, setLanguage, t } = useLanguage()
  return (
    <header className="top">
      <h1>
        <Link href="/">Bank Bonus Tracker</Link>
        {title ? ` · ${title}` : ''}
      </h1>
      <nav>
        <Link href="/new">{t('新增 Offer', 'New offer')}</Link>
        <Link href="/settings">{t('设置', 'Settings')}</Link>
        <label className="language-control">
          <span>{t('语言', 'Language')}</span>
          <select
            aria-label={t('选择显示语言', 'Choose display language')}
            data-testid="language-select"
            value={language}
            onChange={event => setLanguage(event.target.value === 'en' ? 'en' : 'zh')}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </label>
      </nav>
    </header>
  )
}

const numStr = (n: number | null) => (n == null ? '' : String(n))
const strNum = (s: string) => (s.trim() === '' ? null : Number(s))

export type AccountFormValues = {
  opened_on: string
  closed_on: string | null
  bonus_received_on: string | null
  bonus_received_amount: number | null
  history_only: boolean
  name: string | null
  account_type: string | null
  monthly_fee: string | null
  early_close_penalty: string | null
  min_hold_days: number | null
  notes: string | null
}

export function AccountForm({
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: AccountFormValues
  saveLabel: string
  onSave: (v: AccountFormValues) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const [f, setF] = useState({
    opened_on: initial.opened_on,
    closed_on: initial.closed_on ?? '',
    bonus_received_on: initial.bonus_received_on ?? '',
    bonus_received_amount: numStr(initial.bonus_received_amount),
    history_only: initial.history_only,
    name: initial.name ?? '',
    account_type: initial.account_type ?? '',
    monthly_fee: initial.monthly_fee ?? '',
    early_close_penalty: initial.early_close_penalty ?? '',
    min_hold_days: numStr(initial.min_hold_days),
    notes: initial.notes ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set =
    (k: Exclude<keyof typeof f, 'history_only'>) =>
    (e: { target: { value: string } }) =>
      setF(prev => ({ ...prev, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const timelineError = accountTimelineError(
      {
        opened_on: f.opened_on,
        closed_on: f.closed_on || null,
        bonus_received_on: f.bonus_received_on || null,
      },
      todayISO()
    )
    if (timelineError) {
      setErr(t(`日期冲突：${timelineError}`, `Date conflict: ${timelineError}`))
      return
    }
    const bonusAmount = strNum(f.bonus_received_amount)
    if (bonusAmount !== null && (!Number.isFinite(bonusAmount) || bonusAmount < 0)) {
      setErr(t('实收奖励必须是非负数字。', 'Received bonus must be a non-negative number.'))
      return
    }
    if (bonusAmount !== null && !f.bonus_received_on) {
      setErr(t('填写实收奖励时，必须同时填写奖励到账日期。', 'A bonus received date is required when entering the received amount.'))
      return
    }
    setErr('')
    setBusy(true)
    try {
      await onSave({
        opened_on: f.opened_on,
        closed_on: f.closed_on || null,
        bonus_received_on: f.bonus_received_on || null,
        bonus_received_amount: bonusAmount,
        history_only: f.history_only,
        name: f.name.trim() || null,
        account_type: f.account_type.trim() || null,
        monthly_fee: f.monthly_fee.trim() || null,
        early_close_penalty: f.early_close_penalty.trim() || null,
        min_hold_days: strNum(f.min_hold_days),
        notes: f.notes.trim() || null,
      })
    } catch (error) {
      setErr(error instanceof Error ? error.message : t('保存失败。', 'Save failed.'))
      setBusy(false)
    }
  }

  return (
    <form className="offer-form" onSubmit={submit}>
      {err && <p className="error">{err}</p>}
      <label className="inline history-toggle">
        <input
          type="checkbox"
          checked={f.history_only}
          onChange={e =>
            setF(prev => ({
              ...prev,
              history_only: e.target.checked,
              ...(e.target.checked && !prev.history_only
                ? { monthly_fee: '', early_close_penalty: '', min_hold_days: '' }
                : {}),
            }))
          }
        />
        {t('仅补录历史账户（不套用当前 Offer 的 DD、持有期和默认奖励）', 'Historical account only (do not apply the current offer’s DD, hold period, or default bonus)')}
      </label>
      <label>
        {t('开户日期', 'Opened date')}
        <input type="date" required max={todayISO()} value={f.opened_on} onChange={set('opened_on')} />
      </label>
      <p className="muted">{t('历史日期（可一次补齐，之后仍可编辑）', 'Historical dates can be entered now and edited later.')}</p>
      <div className="grid2">
        <label>
          {t('关户日期', 'Closed date')}
          <input type="date" max={todayISO()} value={f.closed_on} onChange={set('closed_on')} />
        </label>
        <label>
          {t('奖励到账日期', 'Bonus received date')}
          <input
            type="date"
            max={todayISO()}
            value={f.bonus_received_on}
            onChange={set('bonus_received_on')}
          />
        </label>
      </div>
      <label>
        {t('历史实收奖励 $', 'Historical bonus received $')}
        <input
          type="number"
          min="0"
          step="0.01"
          value={f.bonus_received_amount}
          onChange={set('bonus_received_amount')}
        />
      </label>
      <p className="muted">{t('账户信息', 'Account details')}</p>
      <div className="grid2">
        <label>
          {t('账户名称', 'Account name')}
          <input value={f.name} onChange={set('name')} placeholder={t('如 Chase Total Checking', 'e.g. Chase Total Checking')} />
        </label>
        <label>
          {t('账户类型', 'Account type')}
          <input value={f.account_type} onChange={set('account_type')} placeholder="Checking / Savings…" />
        </label>
      </div>
      <div className="grid2">
        <label>
          {t('月费', 'Monthly fee')}
          <input value={f.monthly_fee} onChange={set('monthly_fee')} placeholder={t('如 $12，DD 免', 'e.g. $12, waived with DD')} />
        </label>
        <label>
          {t('安全关户天数', 'Safe closing days')}
          <input type="number" value={f.min_hold_days} onChange={set('min_hold_days')} />
        </label>
      </div>
      <label>
        {t('提前关户惩罚', 'Early closure penalty')}
        <input
          value={f.early_close_penalty}
          onChange={set('early_close_penalty')}
          placeholder={t('如 180 天内关户收 $25 / 追回奖励', 'e.g. $25 fee or bonus clawback if closed within 180 days')}
        />
      </label>
      <label>
        {t('备注', 'Notes')}
        <textarea rows={2} value={f.notes} onChange={set('notes')} />
      </label>
      <div className="actions">
        <button type="submit" disabled={busy}>
          {busy ? t('保存中…', 'Saving…') : saveLabel}
        </button>
        <button type="button" onClick={onCancel}>
          {t('取消', 'Cancel')}
        </button>
      </div>
    </form>
  )
}

export function OfferForm({
  initial,
  saveLabel,
  churnLabel,
  onSave,
  onCancel,
}: {
  initial: OfferInput
  saveLabel: string
  churnLabel?: string
  onSave: (input: OfferInput) => Promise<void>
  onCancel?: () => void
}) {
  const { t } = useLanguage()
  const [f, setF] = useState({
    bank_name: initial.bank_name,
    product_name: initial.product_name ?? '',
    account_type: initial.account_type ?? '',
    early_close_penalty: initial.early_close_penalty ?? '',
    bonus_amount: numStr(initial.bonus_amount),
    requirements: initial.requirements ?? '',
    dd_amount: numStr(initial.dd_amount),
    dd_count: numStr(initial.dd_count),
    deadline_days: numStr(initial.deadline_days),
    churnable: initial.churnable == null ? 'unknown' : initial.churnable ? 'yes' : 'no',
    churn_interval_months: numStr(initial.churn_interval_months),
    churn_from: initial.churn_from ?? 'unknown',
    churn_source_note: initial.churn_source_note ?? '',
    min_hold_days: numStr(initial.min_hold_days),
    expires_on: initial.expires_on ?? '',
    fee_note: initial.fee_note ?? '',
    notes: initial.notes ?? '',
    doc_url: initial.doc_url ?? '',
    doc_checked_on: initial.doc_checked_on ?? '',
    churn_source_url: initial.churn_source_url ?? '',
    bank_scope: initial.bank_scope ?? 'unclassified',
    closure_method: initial.closure_method ?? '',
    closure_source_url: initial.closure_source_url ?? '',
    application_status: initial.application_status,
    application_status_reason: initial.application_status_reason ?? '',
    application_denied_on: initial.application_denied_on ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set =
    (k: keyof typeof f) =>
    (e: { target: { value: string } }) =>
      setF(prev => ({ ...prev, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.bank_name.trim()) {
      setErr('Bank name is required.')
      return
    }
    const status =
      f.application_status === 'denied'
        ? 'denied'
        : f.application_status === 'ineligible'
          ? 'ineligible'
          : 'unreviewed'
    let outcome
    try {
      outcome = normalizeApplicationOutcome(
        status,
        f.application_status_reason,
        f.application_denied_on || null,
        todayISO()
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setErr(
        message === 'denial reason is required'
          ? t('开户被拒绝时必须填写原因。', 'A reason is required when an application is denied.')
          : message === 'denial date is required'
            ? t('开户被拒绝时必须填写被拒日期。', 'A denial date is required when an application is denied.')
            : t('被拒日期必须是真实日期，并且不能晚于今天。', 'The denial date must be valid and cannot be in the future.')
      )
      return
    }
    setErr('')
    setBusy(true)
    try {
      await onSave({
        bank_name: f.bank_name.trim(),
        product_name: f.product_name.trim() || null,
        account_type: f.account_type.trim() || null,
        early_close_penalty: f.early_close_penalty.trim() || null,
        bonus_amount: strNum(f.bonus_amount),
        requirements: f.requirements.trim() || null,
        dd_amount: strNum(f.dd_amount),
        dd_count: strNum(f.dd_count),
        deadline_days: strNum(f.deadline_days),
        churnable: f.churnable === 'unknown' ? null : f.churnable === 'yes',
        churn_interval_months: strNum(f.churn_interval_months),
        churn_from: f.churn_from === 'close' || f.churn_from === 'bonus' ? f.churn_from : null,
        churn_source_note: f.churn_source_note.trim() || null,
        eligibility_rules: initial.eligibility_rules ?? [],
        min_hold_days: strNum(f.min_hold_days),
        expires_on: f.expires_on || null,
        fee_note: f.fee_note.trim() || null,
        notes: f.notes.trim() || null,
        source: initial.source,
        import_key: initial.import_key,
        doc_url: f.doc_url.trim() || null,
        doc_checked_on: f.doc_checked_on || null,
        churn_source_url: f.churn_source_url.trim() || null,
        bank_scope:
          f.bank_scope === 'nationwide' || f.bank_scope === 'regional' ? f.bank_scope : null,
        closure_method: f.closure_method.trim() || null,
        closure_source_url: f.closure_source_url.trim() || null,
        ...outcome,
      })
    } catch {
      setErr(t('保存失败。', 'Save failed.'))
      setBusy(false)
    }
  }

  const deniedDays =
    f.application_status === 'denied'
      ? daysSince(f.application_denied_on || null, todayISO())
      : null

  return (
    <form className="offer-form" onSubmit={submit}>
      {err && <p className="error">{err}</p>}
      <label>
        {t('银行名称', 'Bank name')}
        <input value={f.bank_name} onChange={set('bank_name')} />
      </label>
      <div className="grid2">
        <label>
          {t('申请状态', 'Application status')}
          <select value={f.application_status} onChange={set('application_status')}>
            <option value="unreviewed">{t('未处理', 'Not reviewed')}</option>
            <option value="ineligible">{t('拿不了优惠', 'Ineligible')}</option>
            <option value="denied">{t('开户被拒绝', 'Application denied')}</option>
          </select>
        </label>
        {f.application_status !== 'unreviewed' && (
          <label>
            {f.application_status === 'denied'
              ? t('被拒原因（必填）', 'Denial reason (required)')
              : t('原因（可选）', 'Reason (optional)')}
            <input
              value={f.application_status_reason}
              onChange={set('application_status_reason')}
              placeholder={t('如 Chex 敏感、超出服务范围', 'e.g. Chex-sensitive or outside service area')}
            />
          </label>
        )}
      </div>
      {f.application_status === 'denied' && (
        <div className="grid2">
          <label>
            {t('被拒日期（必填）', 'Denial date (required)')}
            <input
              type="date"
              required
              max={todayISO()}
              value={f.application_denied_on}
              onInput={e => {
                const value = e.currentTarget.value
                setF(prev => ({ ...prev, application_denied_on: value }))
              }}
            />
          </label>
          <label>
            {t('距离今天已经多少天（自动计算）', 'Days since denial (calculated automatically)')}
            <input readOnly value={deniedDays == null ? '' : t(`${deniedDays} 天`, `${deniedDays} days`)} />
          </label>
        </div>
      )}
      <div className="grid2">
        <label>
          {t('账户产品名', 'Account product name')}
          <input value={f.product_name} onChange={set('product_name')} placeholder={t('如 Chase Total Checking', 'e.g. Chase Total Checking')} />
        </label>
        <label>
          {t('账户类型', 'Account type')}
          <input value={f.account_type} onChange={set('account_type')} placeholder="Checking / Savings…" />
        </label>
      </div>
      <div className="grid2">
        <label>
          {t('奖励 $', 'Bonus $')}
          <input type="number" value={f.bonus_amount} onChange={set('bonus_amount')} />
        </label>
        <label>
          {t('截止期限（开户后天数）', 'Deadline (days after opening)')}
          <input type="number" value={f.deadline_days} onChange={set('deadline_days')} />
        </label>
      </div>
      <label>
        {t('要求', 'Requirements')}
        <textarea rows={3} value={f.requirements} onChange={set('requirements')} />
      </label>
      <div className="grid2">
        <label>
          {t('DD 金额 $', 'DD amount $')}
          <input type="number" value={f.dd_amount} onChange={set('dd_amount')} />
        </label>
        <label>
          {t('DD 次数', 'DD count')}
          <input type="number" value={f.dd_count} onChange={set('dd_count')} />
        </label>
      </div>
      <div className="grid2">
        <label>
          {t('最短持有天数', 'Minimum hold days')}
          <input type="number" value={f.min_hold_days} onChange={set('min_hold_days')} />
        </label>
        <label>
          {t('Offer 截止日', 'Offer expiration date')}
          <input type="date" value={f.expires_on} onChange={set('expires_on')} />
        </label>
      </div>
      <label>
        {t('月费/豁免', 'Monthly fee / waiver')}
        <input value={f.fee_note} onChange={set('fee_note')} />
      </label>
      <label>
        {t('提前关户惩罚', 'Early closure penalty')}
        <input
          value={f.early_close_penalty}
          onChange={set('early_close_penalty')}
          placeholder={t('如 180 天内关户收 $25 / 追回奖励', 'e.g. $25 fee or bonus clawback if closed within 180 days')}
        />
      </label>
      <label>
        {t('备注', 'Notes')}
        <textarea rows={2} value={f.notes} onChange={set('notes')} />
      </label>
      {churnLabel && <p className="muted">{t('Churn 字段', 'Churn fields')}: {churnLabel}</p>}
      <div className="grid2">
        <label>
          {t('可否 Churn', 'Churnable')}
          <select value={f.churnable} onChange={set('churnable')}>
            <option value="unknown">{t('未知', 'unknown')}</option>
            <option value="yes">{t('可以', 'yes')}</option>
            <option value="no">{t('不可以', 'no')}</option>
          </select>
        </label>
        <label>
          {t('Churn 间隔（月）', 'Churn interval (months)')}
          <input type="number" value={f.churn_interval_months} onChange={set('churn_interval_months')} />
        </label>
      </div>
      <label>
        {t('Churn 冷却基准', 'Churn cooldown anchor')}
        <select value={f.churn_from} onChange={set('churn_from')}>
          <option value="unknown">{t('未知', 'Unknown')}</option>
          <option value="close">{t('关户日起算', 'From account closing')}</option>
          <option value="bonus">{t('奖励到账日起算', 'From bonus received')}</option>
        </select>
        <span className="hint">
          {t(
            '冷却期从哪天开始数：如 Chase 是「距上次拿到奖励 24 个月」选奖励到账；U.S. Bank 是「关户满 12 个月」选关户日。',
            'Choose where the cooldown starts: for “24 months since the last bonus,” use bonus received; for “12 months since closing,” use account closing.'
          )}
        </span>
      </label>
      <label>
        {t('Churn 来源备注', 'Churn source note')}
        <input value={f.churn_source_note} onChange={set('churn_source_note')} />
      </label>
      <div className="grid2">
        <label>
          {t('Doctor of Credit 链接', 'Doctor of Credit link')}
          <input
            type="url"
            value={f.doc_url}
            onChange={set('doc_url')}
            placeholder="https://www.doctorofcredit.com/..."
          />
        </label>
        <label>
          {t('DoC 核对日期', 'DoC verified date')}
          <input type="date" value={f.doc_checked_on} onChange={set('doc_checked_on')} />
        </label>
      </div>
      <label>
        {t('Churn 来源链接（可指向 DoC 评论）', 'Churn source link (may link to a DoC comment)')}
        <input
          type="url"
          value={f.churn_source_url}
          onChange={set('churn_source_url')}
          placeholder="https://www.doctorofcredit.com/.../#comment-..."
        />
      </label>
      <div className="grid2">
        <label>
          {t('银行范围', 'Bank coverage')}
          <select value={f.bank_scope} onChange={set('bank_scope')}>
            <option value="unclassified">{t('未分类', 'Unclassified')}</option>
            <option value="nationwide">{t('全国性银行', 'Nationwide bank')}</option>
            <option value="regional">{t('区域性银行', 'Regional bank')}</option>
          </select>
        </label>
        <label>
          {t('关户方式 DoC 链接', 'Account closure DoC link')}
          <input
            type="url"
            value={f.closure_source_url}
            onChange={set('closure_source_url')}
            placeholder="https://www.doctorofcredit.com/..."
          />
        </label>
      </div>
      <label>
        {t('关户方式', 'Account closure method')}
        <textarea
          rows={2}
          value={f.closure_method}
          onChange={set('closure_method')}
          placeholder={t('如：余额清零后在网银中关闭账户', 'e.g. Zero the balance, then close the account in online banking')}
        />
      </label>
      <div className="actions">
        <button type="submit" disabled={busy}>
          {busy ? t('保存中…', 'Saving…') : saveLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            {t('取消', 'Cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
