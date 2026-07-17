'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ExtractionResult, OfferInput, Tier } from '@/lib/types'
import { api, blankOffer, Header, OfferForm } from '../ui'
import { useLanguage } from '../i18n'

type QItem = {
  url: string
  status: 'queued' | 'analyzing' | 'ready' | 'failed' | 'done'
  result?: ExtractionResult
  error?: string
}

export default function NewOffer() {
  const { t } = useLanguage()
  const router = useRouter()
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'tiers' | 'form'>('input')
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<{ code: string; message: string } | null>(null)
  const [notices, setNotices] = useState<string[]>([])
  const [initial, setInitial] = useState<OfferInput>(blankOffer)
  const [churnLabel, setChurnLabel] = useState<string>()
  const [queue, setQueue] = useState<QItem[] | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  useEffect(() => {
    if (phase !== 'analyzing') return
    setElapsed(0)
    const t = setInterval(() => setElapsed(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  // Batch runner: one link in flight; next starts while the user reviews.
  useEffect(() => {
    if (!queue || queue.some(q => q.status === 'analyzing')) return
    const i = queue.findIndex(q => q.status === 'queued')
    if (i === -1) return
    const url = queue[i].url
    setQueue(qs => qs!.map((q, j) => (j === i ? { ...q, status: 'analyzing' } : q)))
    void (async () => {
      try {
        const res = await api('/api/extract', 'POST', { input: url })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || data.error || 'Extraction failed.')
        setQueue(qs => qs!.map((q, j) => (j === i ? { ...q, status: 'ready', result: data } : q)))
      } catch (e) {
        setQueue(qs =>
          qs!.map((q, j) =>
            j === i ? { ...q, status: 'failed', error: e instanceof Error ? e.message : 'failed' } : q
          )
        )
      }
    })()
  }, [queue])

  const activeSource = activeIdx != null && queue ? queue[activeIdx].url : input.trim() || null

  // Offer-level fields come from the extraction; per-tier fields from the chosen tier.
  const mergeTier = (r: ExtractionResult, t: Tier | null, source: string | null): OfferInput => ({
    bank_name: r.bank_name ?? '',
    product_name: t?.product_name ?? null,
    account_type: t?.account_type ?? null,
    early_close_penalty: t?.early_close_penalty ?? null,
    bonus_amount: t?.bonus_amount ?? null,
    requirements: t?.requirements ?? null,
    dd_amount: t?.dd_amount ?? null,
    dd_count: t?.dd_count ?? null,
    deadline_days: t?.deadline_days ?? null,
    churnable: r.churnable,
    churn_interval_months: r.churn_interval_months,
    churn_from: r.churn_from,
    churn_source_note: r.churn_source_note,
    eligibility_rules: [],
    min_hold_days: t?.min_hold_days ?? null,
    expires_on: r.expires_on,
    fee_note: t?.fee_note ?? null,
    notes: null,
    source,
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
  })

  // Shared by single flow and batch review: show a result as tiers choice or form.
  function applyResult(r: ExtractionResult, source: string | null) {
    setError(null)
    const n: string[] = []
    if (r.fetch_failed) n.push(t('页面抓取被阻止；仅使用粘贴的文字或 URL 进行提取。', 'Page fetch was blocked; extraction used pasted text/URL only.'))
    if (r.search_skipped)
      n.push(t('Churn 网络搜索不可用或没有结果，请手动填写 Churn 字段。', 'Churn web search unavailable/found nothing — fill churn fields manually.'))
    if (r.tiers.length === 0) n.push(t('未能识别出奖励档位', 'No bonus tier could be identified'))
    setNotices(n)
    setChurnLabel(r.search_used ? 'community-sourced (web search)' : undefined)
    if (r.tiers.length > 1) {
      setResult(r)
      setPhase('tiers')
    } else {
      setInitial(mergeTier(r, r.tiers[0] ?? null, source))
      setPhase('form')
    }
  }

  function openBlankForm(source: string | null = input.trim() || null) {
    setError(null)
    setNotices([])
    setChurnLabel(undefined)
    setInitial({ ...blankOffer, source })
    setPhase('form')
  }

  // ≥2 non-empty lines, all URLs → batch mode.
  function parseBatch(text: string): string[] | null {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
    if (lines.length < 2 || !lines.every(l => l.startsWith('http://') || l.startsWith('https://')))
      return null
    return lines
  }

  async function analyze() {
    const urls = parseBatch(input)
    if (urls) {
      setQueue(urls.map(url => ({ url, status: 'queued' })))
      setActiveIdx(null)
      return
    }
    setError(null)
    setPhase('analyzing')
    try {
      const res = await api('/api/extract', 'POST', { input })
      const data = await res.json()
      if (!res.ok) {
        setError({
          code: data.error ?? 'extraction_failed',
          message: data.message || 'Extraction failed.',
        })
        setNotices([])
        setChurnLabel(undefined)
        setInitial({ ...blankOffer, source: input.trim() || null })
        setPhase('form')
        return
      }
      applyResult(data as ExtractionResult, input.trim() || null)
    } catch {
      setError({ code: 'extraction_failed', message: 'Request failed.' })
      setNotices([])
      setChurnLabel(undefined)
      setInitial({ ...blankOffer, source: input.trim() || null })
      setPhase('form')
    }
  }

  function openQueueItem(i: number) {
    const item = queue![i]
    setActiveIdx(i)
    if (item.result) applyResult(item.result, item.url)
    else openBlankForm(item.url)
  }

  // After saving a batch item: mark done via functional update (the runner may have
  // changed other items since this form rendered), then let the effect below open
  // the next ready item from the FRESH queue state.
  const [advancing, setAdvancing] = useState(false)

  async function saveOffer(v: OfferInput) {
    const res = await api('/api/offers', 'POST', v)
    if (!res.ok) throw new Error('save failed')
    if (queue && activeIdx != null) {
      const i = activeIdx
      setQueue(qs => qs!.map((item, j) => (j === i ? { ...item, status: 'done' } : item)))
      setActiveIdx(null)
      setAdvancing(true)
    } else {
      router.push('/')
    }
  }

  useEffect(() => {
    if (!advancing || !queue) return
    setAdvancing(false)
    const next = queue.findIndex(item => item.status === 'ready')
    if (next !== -1) openQueueItem(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancing, queue])

  const reviewOpen = queue == null || activeIdx != null
  const allDone = queue != null && queue.every(q => q.status === 'done')

  return (
    <main className="container">
      <Header title={t('新增 Offer', 'New offer')} />
      {queue && (
        <div className="card">
          <p>
            <strong>{t('批量分析', 'Batch analysis')}</strong>{' '}
            <span className="muted">{t('逐个分析中，请勿离开本页（离开会丢失队列）', 'Analyzing one at a time. Do not leave this page or the queue will be lost.')}</span>
          </p>
          <ul className="queue">
            {queue.map((item, i) => (
              <li key={i} className={activeIdx === i ? 'active' : undefined}>
                <span className="status">{{
                  queued: t('⬜ 排队', '⬜ Queued'),
                  analyzing: t('⏳ 分析中…', '⏳ Analyzing…'),
                  ready: t('✅ 待审核', '✅ Ready for review'),
                  failed: t('⚠ 失败', '⚠ Failed'),
                  done: t('✔ 已保存', '✔ Saved'),
                }[item.status]}</span>
                <span className="trunc url" title={item.url}>
                  {item.url}
                </span>
                {item.status === 'ready' && activeIdx !== i && (
                  <button onClick={() => openQueueItem(i)}>{t('审核', 'Review')}</button>
                )}
                {item.status === 'failed' && (
                  <>
                    <span className="muted">{item.error}</span>
                    <button
                      onClick={() =>
                        setQueue(qs => qs!.map((q, j) => (j === i ? { url: q.url, status: 'queued' } : q)))
                      }
                    >
                      {t('重试', 'Retry')}
                    </button>
                    <button onClick={() => openQueueItem(i)}>{t('手动录入', 'Enter manually')}</button>
                    <button
                      onClick={() =>
                        setQueue(qs => qs!.map((q, j) => (j === i ? { ...q, status: 'done' } : q)))
                      }
                    >
                      {t('跳过', 'Skip')}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {allDone && (
            <p className="notice">
              {t('全部处理完毕。', 'All items completed.')} <Link href="/">{t('返回 Dashboard', 'Return to Dashboard')}</Link> {t('或', 'or')}{' '}
              <button
                onClick={() => {
                  setQueue(null)
                  setActiveIdx(null)
                  setInput('')
                  setPhase('input')
                }}
              >
                {t('再加一批', 'Add another batch')}
              </button>
            </p>
          )}
        </div>
      )}
      {phase === 'tiers' && result && reviewOpen ? (
        <div className="card" key={`tiers-${activeIdx ?? 'single'}`}>
          {notices.map(n => (
            <p key={n} className="notice">
              {n}
            </p>
          ))}
          <p>
            <strong>{t('选择你开的档位', 'Choose the tier you opened')}</strong>
          </p>
          {result.tiers.map((tier, i) => (
            <div key={i}>
              <label className="inline">
                <input
                  type="radio"
                  name="tier"
                  onChange={() => {
                    setInitial(mergeTier(result, tier, activeSource))
                    setPhase('form')
                  }}
                />
                {tier.tier_name ?? t(`档位 ${i + 1}`, `Tier ${i + 1}`)}
                {tier.account_type && ` · ${tier.account_type}`}
                {tier.bonus_amount != null && ` · $${tier.bonus_amount}`}
              </label>
            </div>
          ))}
          <div className="actions">
            <button
              type="button"
              onClick={() => (queue ? setActiveIdx(null) : setPhase('input'))}
            >
              {t('返回', 'Back')}
            </button>
          </div>
        </div>
      ) : phase === 'form' && reviewOpen ? (
        <div className="card" key={`form-${activeIdx ?? 'single'}`}>
          {error && (
            <p className="error">
              {error.message}
              {error.code === 'no_api_key' && (
                <>
                  {' '}
                  {t('请在', 'Set your API key in')} <Link href="/settings">{t('设置', 'Settings')}</Link>{t('中填写 API Key。', '.')}
                </>
              )}{' '}
              {t('你可以在下方手动填写 Offer。', 'You can enter the offer manually below.')}
            </p>
          )}
          {notices.map(n => (
            <p key={n} className="notice">
              {n}
            </p>
          ))}
          <OfferForm
            initial={initial}
            churnLabel={churnLabel}
            saveLabel={t('保存 Offer', 'Save offer')}
            onSave={saveOffer}
            onCancel={() => (queue ? setActiveIdx(null) : setPhase('input'))}
          />
        </div>
      ) : queue ? null : (
        <div className="card">
          <label>
            {t('粘贴 Offer URL 或 Offer 文本——多个链接每行一个，可批量分析', 'Paste an offer URL or the offer text — use one URL per line for batch analysis')}
            <textarea
              className="paste"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={phase === 'analyzing'}
              placeholder={t('https://… 或完整 Offer 文本\nhttps://…（多行链接 → 批量）', 'https://… or the full offer text\nhttps://… (multiple URL lines → batch)')}
            />
          </label>
          {phase === 'analyzing' ? (
            <p className="notice">
              {t(`正在提取——如果运行 Churn 网络搜索，可能需要几分钟。已用 ${elapsed} 秒…`, `Extracting — can take a few minutes if churn web search runs. ${elapsed}s elapsed…`)}
            </p>
          ) : (
            <div className="actions">
              <button className="primary" onClick={analyze} disabled={!input.trim()}>
                {t('分析', 'Analyze')}
              </button>
              <button type="button" onClick={() => openBlankForm()}>
                {t('跳过分析，手动填写', 'Skip analysis, enter manually')}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
