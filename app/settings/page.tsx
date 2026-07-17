'use client'

import { useEffect, useState } from 'react'
import type { Provider, ProviderSettings } from '@/lib/types'
import { PRESET_PROVIDERS } from '@/lib/types'
import { api, Header } from '../ui'
import { useLanguage } from '../i18n'

type Test = { state: 'idle' | 'busy' | 'ok' | 'err'; message?: string }

export default function SettingsPage() {
  const { t } = useLanguage()
  const [ps, setPs] = useState<ProviderSettings | null>(null)
  const [sel, setSel] = useState<string>('')
  const [draft, setDraft] = useState<Provider | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [test, setTest] = useState<Test>({ state: 'idle' })
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: ProviderSettings) => {
        setPs(data)
        select(data, data.active_provider)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sidebar shows presets + any stored customs, deduped by name.
  const listNames = (p: ProviderSettings) => [
    ...PRESET_PROVIDERS.map(x => x.name),
    ...p.providers.map(x => x.name).filter(n => !PRESET_PROVIDERS.some(x => x.name === n)),
  ]

  function select(p: ProviderSettings, name: string) {
    const stored = p.providers.find(x => x.name === name)
    const preset = PRESET_PROVIDERS.find(x => x.name === name)
    setSel(name)
    setDraft(stored ?? { name, base_url: preset?.base_url ?? '', api_key: '', model: '' })
    setModels([])
    setTest({ state: 'idle' })
    setSaved(false)
  }

  const setD = (k: keyof Provider) => (e: { target: { value: string } }) => {
    setSaved(false)
    setDraft(prev => prev && { ...prev, [k]: e.target.value })
  }

  async function testConnection() {
    if (!draft) return
    setTest({ state: 'busy' })
    try {
      const res = await api('/api/models', 'POST', { base_url: draft.base_url, api_key: draft.api_key })
      const data = await res.json()
      if (!res.ok) {
        setTest({ state: 'err', message: data.error ?? t('连接失败', 'Connection failed') })
        return
      }
      setModels(data.models)
      setTest({ state: 'ok', message: t(`连接成功，${data.models.length} 个模型`, `Connected: ${data.models.length} models`) })
    } catch {
      setTest({ state: 'err', message: t('请求失败', 'Request failed') })
    }
  }

  // Upsert the draft into providers; optionally make it active. One PUT saves all.
  async function save(makeActive: boolean) {
    if (!ps || !draft) return
    const providers = ps.providers.some(p => p.name === draft.name)
      ? ps.providers.map(p => (p.name === draft.name ? draft : p))
      : [...ps.providers, draft]
    const next = {
      ...ps,
      providers,
      active_provider: makeActive ? draft.name : ps.active_provider,
    }
    const res = await api('/api/settings', 'PUT', next)
    if (res.ok) {
      setPs(await res.json())
      setSaved(true)
    }
  }

  if (ps == null || draft == null)
    return (
      <main className="container">
        <Header title={t('设置', 'Settings')} />
        <p className="muted">{t('加载中…', 'Loading…')}</p>
      </main>
    )

  const isActive = ps.active_provider === draft.name
  const configured = new Set(ps.providers.filter(p => p.api_key || p.model).map(p => p.name))

  return (
    <main className="container">
      <Header title={t('设置', 'Settings')} />
      <div className="settings-grid">
        <aside className="provider-list">
          <div className="muted">{t('模型供应商', 'Model providers')}</div>
          {listNames(ps).map(name => (
            <button
              key={name}
              className={`prov-item${sel === name ? ' selected' : ''}`}
              onClick={() => select(ps, name)}
            >
              {name}
              {ps.active_provider === name ? (
                <span className="badge green">{t('使用中', 'Active')}</span>
              ) : configured.has(name) ? (
                <span className="badge grey">{t('已配置', 'Configured')}</span>
              ) : null}
            </button>
          ))}
          {adding ? (
            <span className="dd-add">
              <input
                placeholder={t('名称', 'Name')}
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <button
                onClick={() => {
                  const n = newName.trim()
                  if (!n) return
                  setAdding(false)
                  setNewName('')
                  select(ps, n)
                }}
              >
                {t('确认', 'Confirm')}
              </button>
            </span>
          ) : (
            <button onClick={() => setAdding(true)}>{t('+ 自定义供应商', '+ Custom provider')}</button>
          )}
        </aside>

        <form
          className="card"
          onSubmit={e => {
            e.preventDefault()
            void save(false)
          }}
        >
          <div className="card-head">
            <h2>{draft.name}</h2>
            {isActive && <span className="badge green">{t('使用中', 'Active')}</span>}
          </div>
          <label>
            {t('API 地址', 'API URL')}
            <input value={draft.base_url} onChange={setD('base_url')} />
            <span className="hint">{t('OpenAI 兼容的 /chat/completions 端点根地址', 'Root URL for an OpenAI-compatible /chat/completions endpoint')}</span>
          </label>
          <label>
            API Key
            <input type="password" value={draft.api_key} onChange={setD('api_key')} />
            <span className="hint">{t('只存本地 data.db（Ollama 等本地服务可留空）', 'Stored only in local data.db (leave blank for local services such as Ollama)')}</span>
          </label>
          <div className="actions" style={{ marginBottom: 10 }}>
            <button type="button" onClick={testConnection} disabled={test.state === 'busy'}>
              {test.state === 'busy' ? t('测试中…', 'Testing…') : t('测试连通性 / 刷新模型', 'Test connection / Refresh models')}
            </button>
            {test.state === 'ok' && <span className="badge green">{test.message}</span>}
            {test.state === 'err' && <span className="badge red">{test.message}</span>}
          </div>
          <label>
            {t('选择模型', 'Choose model')}
            {models.length > 0 ? (
              <select value={draft.model} onChange={setD('model')}>
                {!models.includes(draft.model) && <option value={draft.model}>{draft.model || '——'}</option>}
                {models.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input value={draft.model} onChange={setD('model')} placeholder={t('如 deepseek-v4-flash', 'e.g. deepseek-v4-flash')} />
            )}
            <span className="hint">
              {t('提取大模型：解析 Offer 页面并从免费搜索结果补缺。点上方测试可拉取供应商的真实模型列表。', 'Extraction model: parses offer pages and fills gaps from free search results. Test the connection above to load the provider’s model list.')}
            </span>
          </label>
          <div className="actions">
            <button type="submit">{t('保存', 'Save')}</button>
            {!isActive && (
              <button type="button" className="primary" onClick={() => save(true)}>
                {t('保存并设为使用中', 'Save and make active')}
              </button>
            )}
            {saved && <span className="badge green">{t('已保存', 'Saved')}</span>}
          </div>
        </form>
      </div>
      <p className="muted">
        {t('Churn 规则补缺使用免费搜索链（DuckDuckGo → Bing → DuckDuckGo Lite），无需任何搜索配置；搜不到的字段在保存前手动填写即可。', 'Missing Churn rules use the free search chain (DuckDuckGo → Bing → DuckDuckGo Lite) with no search setup required; fill any unavailable fields manually before saving.')}
      </p>
    </main>
  )
}
