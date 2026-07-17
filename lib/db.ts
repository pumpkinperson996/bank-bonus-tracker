import Database from 'better-sqlite3'
import path from 'node:path'
import type { Offer, OfferInput, Account, DdEvent, Provider, ProviderSettings, Settings } from '@/lib/types'
import { DEFAULT_SETTINGS, DEPRECATED_MODELS, EligibilityRulesSchema } from '@/lib/types'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_name TEXT NOT NULL,
  product_name TEXT,
  account_type TEXT,
  early_close_penalty TEXT,
  bonus_amount REAL,
  requirements TEXT,
  dd_amount REAL,
  dd_count INTEGER,
  deadline_days INTEGER,
  churnable INTEGER,
  churn_interval_months INTEGER,
  churn_source_note TEXT,
  eligibility_rules TEXT NOT NULL DEFAULT '[]',
  min_hold_days INTEGER,
  expires_on TEXT,
  fee_note TEXT,
  notes TEXT,
  source TEXT,
  import_key TEXT,
  doc_url TEXT,
  doc_checked_on TEXT,
  churn_source_url TEXT,
  bank_scope TEXT,
  closure_method TEXT,
  closure_source_url TEXT,
  application_status TEXT NOT NULL DEFAULT 'unreviewed',
  application_status_reason TEXT,
  application_denied_on TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  opened_on TEXT NOT NULL,
  closed_on TEXT,
  bonus_received_on TEXT,
  notes TEXT,
  name TEXT,
  account_type TEXT,
  monthly_fee TEXT,
  early_close_penalty TEXT,
  min_hold_days INTEGER,
  bonus_received_amount REAL,
  history_only INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS dd_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  happened_on TEXT,
  amount REAL,
  source_note TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

// ponytail: column presence IS the schema version — no version table.
function migrate(db: Database.Database) {
  const cols = (table: string) =>
    new Set((db.pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name))

  db.transaction(() => {
    const offerCols = cols('offers')
    for (const [name, type] of [
      ['min_hold_days', 'INTEGER'],
      ['expires_on', 'TEXT'],
      ['fee_note', 'TEXT'],
      ['notes', 'TEXT'],
      ['product_name', 'TEXT'],
      ['account_type', 'TEXT'],
      ['early_close_penalty', 'TEXT'],
      ['churn_from', 'TEXT'],
      ['import_key', 'TEXT'],
      ['doc_url', 'TEXT'],
      ['doc_checked_on', 'TEXT'],
      ['churn_source_url', 'TEXT'],
      ['eligibility_rules', "TEXT NOT NULL DEFAULT '[]'"],
      ['bank_scope', 'TEXT'],
      ['closure_method', 'TEXT'],
      ['closure_source_url', 'TEXT'],
      ['application_status', "TEXT NOT NULL DEFAULT 'unreviewed'"],
      ['application_status_reason', 'TEXT'],
      ['application_denied_on', 'TEXT'],
    ] as const) {
      if (!offerCols.has(name)) db.exec(`ALTER TABLE offers ADD COLUMN ${name} ${type}`)
    }

    const acctCols = cols('accounts')
    for (const [name, type] of [
      ['bonus_received_on', 'TEXT'],
      ['notes', 'TEXT'],
      ['name', 'TEXT'],
      ['account_type', 'TEXT'],
      ['monthly_fee', 'TEXT'],
      ['early_close_penalty', 'TEXT'],
      ['min_hold_days', 'INTEGER'],
      ['bonus_received_amount', 'REAL'],
      ['history_only', 'INTEGER NOT NULL DEFAULT 0'],
    ] as const) {
      if (!acctCols.has(name)) db.exec(`ALTER TABLE accounts ADD COLUMN ${name} ${type}`)
    }

    if (acctCols.has('dd_done')) {
      const rows = db
        .prepare('SELECT id, dd_done FROM accounts WHERE dd_done > 0')
        .all() as { id: number; dd_done: number }[]
      const ins = db.prepare(
        "INSERT INTO dd_events (account_id, source_note) VALUES (?, 'migrated from counter')"
      )
      for (const r of rows) for (let i = 0; i < r.dd_done; i++) ins.run(r.id)
      db.exec('ALTER TABLE accounts DROP COLUMN dd_done')
    }

    if (acctCols.has('bonus_received')) {
      db.exec(
        "UPDATE accounts SET bonus_received_on = date('now') WHERE bonus_received = 1 AND bonus_received_on IS NULL"
      )
      db.exec('ALTER TABLE accounts DROP COLUMN bonus_received')
    }

    db.exec(`
      UPDATE offers
      SET application_status = 'unreviewed'
      WHERE application_status IS NULL
         OR application_status NOT IN ('unreviewed', 'ineligible', 'denied')
    `)
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS offers_import_key_unique
      ON offers(import_key)
      WHERE import_key IS NOT NULL
    `)
  })()
}

const toBit = (v: boolean | null | undefined) => (v == null ? null : v ? 1 : 0)

// 账户信息 details group, shared by create and update.
type AccountDetails = {
  name?: string | null
  account_type?: string | null
  monthly_fee?: string | null
  early_close_penalty?: string | null
  min_hold_days?: number | null
  notes?: string | null
}

function rowToOffer(r: any): Offer {
  let eligibilityRules: Offer['eligibility_rules'] = []
  try {
    const parsed = EligibilityRulesSchema.safeParse(JSON.parse(r.eligibility_rules ?? '[]'))
    if (parsed.success) eligibilityRules = parsed.data
  } catch {
    eligibilityRules = []
  }
  return {
    ...r,
    churnable: r.churnable == null ? null : !!r.churnable,
    eligibility_rules: eligibilityRules,
  }
}

function rowToAccount(r: any): Account {
  return { ...r, history_only: !!r.history_only }
}

export function createDb(dbPath: string) {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  migrate(db)

  function getOffer(id: number): Offer | null {
    const r = db.prepare('SELECT * FROM offers WHERE id = ?').get(id)
    return r ? rowToOffer(r) : null
  }

  function getAccount(id: number): Account | null {
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id)
    return row ? rowToAccount(row) : null
  }

  const kvAll = () =>
    Object.fromEntries(
      (db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]).map(
        (r) => [r.key, r.value]
      )
    )
  const kvSet = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  const fixModel = (m: string) => DEPRECATED_MODELS[m] ?? m

  // Providers live as two kv rows: 'providers' (JSON array) and 'active_provider'.
  // First read seeds them from the legacy base_url/model/api_key rows.
  function getProviderSettings(): ProviderSettings {
    const stored = kvAll()
    let providers: Provider[] = []
    try {
      providers = JSON.parse(stored.providers ?? '[]')
    } catch {
      providers = []
    }
    if (providers.length === 0) {
      const base_url = stored.base_url ?? DEFAULT_SETTINGS.base_url
      providers = [
        {
          name: base_url.includes('deepseek') ? 'DeepSeek' : '自定义',
          base_url,
          api_key: stored.api_key ?? '',
          model: fixModel(stored.model ?? DEFAULT_SETTINGS.model),
        },
      ]
    }
    const migrated = providers.map((p) => ({ ...p, model: fixModel(p.model) }))
    let active = stored.active_provider ?? migrated[0].name
    if (!migrated.some((p) => p.name === active)) active = migrated[0].name
    if (JSON.stringify(migrated) !== stored.providers || active !== stored.active_provider) {
      kvSet.run('providers', JSON.stringify(migrated))
      kvSet.run('active_provider', active)
    }
    return { providers: migrated, active_provider: active }
  }

  function saveProviderSettings(ps: ProviderSettings): void {
    kvSet.run('providers', JSON.stringify(ps.providers))
    kvSet.run('active_provider', ps.active_provider)
  }

  // Legacy shape consumed by the extraction pipeline: the active provider, resolved.
  function getSettings(): Settings {
    const ps = getProviderSettings()
    const p = ps.providers.find((x) => x.name === ps.active_provider) ?? ps.providers[0]
    return { base_url: p.base_url, model: p.model, api_key: p.api_key }
  }

  // Legacy writer (tests/back-compat): updates the active provider's triple in place.
  function saveSettings(s: Settings): void {
    const ps = getProviderSettings()
    const providers = ps.providers.map((p) =>
      p.name === ps.active_provider
        ? { ...p, base_url: s.base_url, model: fixModel(s.model), api_key: s.api_key }
        : p
    )
    saveProviderSettings({ ...ps, providers })
    for (const k of ['base_url', 'model', 'api_key'] as const) kvSet.run(k, s[k])
  }

  return {
    close: () => db.close(),

    createOffer(input: OfferInput): Offer {
      const info = db
        .prepare(
          `INSERT INTO offers (bank_name, product_name, account_type, early_close_penalty,
             bonus_amount, requirements, dd_amount, dd_count,
             deadline_days, churnable, churn_interval_months, churn_from, churn_source_note,
             eligibility_rules,
             min_hold_days, expires_on, fee_note, notes, source, import_key, doc_url,
             doc_checked_on, churn_source_url, bank_scope, closure_method, closure_source_url,
             application_status, application_status_reason, application_denied_on)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.bank_name,
          input.product_name,
          input.account_type,
          input.early_close_penalty,
          input.bonus_amount,
          input.requirements,
          input.dd_amount,
          input.dd_count,
          input.deadline_days,
          toBit(input.churnable),
          input.churn_interval_months,
          input.churn_from,
          input.churn_source_note,
          JSON.stringify(input.eligibility_rules ?? []),
          input.min_hold_days,
          input.expires_on,
          input.fee_note,
          input.notes,
          input.source,
          input.import_key,
          input.doc_url,
          input.doc_checked_on,
          input.churn_source_url,
          input.bank_scope,
          input.closure_method,
          input.closure_source_url,
          input.application_status,
          input.application_status_reason,
          input.application_denied_on
        )
      return getOffer(Number(info.lastInsertRowid))!
    },

    listOffers(): Offer[] {
      return db.prepare('SELECT * FROM offers ORDER BY id').all().map(rowToOffer)
    },

    getOffer,
    getAccount,

    updateOffer(id: number, patch: Partial<OfferInput>): Offer | null {
      const cols = [
        'bank_name',
        'product_name',
        'account_type',
        'early_close_penalty',
        'bonus_amount',
        'requirements',
        'dd_amount',
        'dd_count',
        'deadline_days',
        'churnable',
        'churn_interval_months',
        'churn_from',
        'churn_source_note',
        'eligibility_rules',
        'min_hold_days',
        'expires_on',
        'fee_note',
        'notes',
        'source',
        'import_key',
        'doc_url',
        'doc_checked_on',
        'churn_source_url',
        'bank_scope',
        'closure_method',
        'closure_source_url',
        'application_status',
        'application_status_reason',
        'application_denied_on',
      ] as const
      const keys = cols.filter((k) => k in patch)
      if (keys.length) {
        const values = keys.map((k) => {
          if (k === 'churnable') return toBit(patch.churnable)
          if (k === 'eligibility_rules') return JSON.stringify(patch.eligibility_rules ?? [])
          return patch[k]
        })
        db.prepare(`UPDATE offers SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(
          ...values,
          id
        )
      }
      return getOffer(id)
    },

    deleteOffer(id: number): boolean {
      return db.prepare('DELETE FROM offers WHERE id = ?').run(id).changes > 0
    },

    createAccount(
      offerId: number,
      input: AccountDetails & {
        opened_on: string
        closed_on?: string | null
        bonus_received_on?: string | null
        bonus_received_amount?: number | null
        history_only?: boolean
      }
    ): Account {
      const info = db
        .prepare(
          `INSERT INTO accounts (offer_id, opened_on, closed_on, bonus_received_on,
             bonus_received_amount, history_only, name, account_type, monthly_fee,
             early_close_penalty, min_hold_days, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          offerId,
          input.opened_on,
          input.closed_on ?? null,
          input.bonus_received_on ?? null,
          input.bonus_received_amount ?? null,
          input.history_only ? 1 : 0,
          input.name ?? null,
          input.account_type ?? null,
          input.monthly_fee ?? null,
          input.early_close_penalty ?? null,
          input.min_hold_days ?? null,
          input.notes ?? null
        )
      return getAccount(Number(info.lastInsertRowid))!
    },

    listAccounts(offerId: number): Account[] {
      return db
        .prepare('SELECT * FROM accounts WHERE offer_id = ? ORDER BY id')
        .all(offerId)
        .map(rowToAccount)
    },

    updateAccount(
      id: number,
      patch: AccountDetails & {
        opened_on?: string
        closed_on?: string | null
        bonus_received_on?: string | null
        bonus_received_amount?: number | null
        history_only?: boolean
      }
    ): Account | null {
      const cols = [
        'opened_on',
        'closed_on',
        'bonus_received_on',
        'bonus_received_amount',
        'history_only',
        'notes',
        'name',
        'account_type',
        'monthly_fee',
        'early_close_penalty',
        'min_hold_days',
      ] as const
      const keys = cols.filter((k) => patch[k] !== undefined)
      if (keys.length)
        db.prepare(`UPDATE accounts SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(
          ...keys.map((k) => (k === 'history_only' ? (patch.history_only ? 1 : 0) : patch[k])),
          id
        )
      return getAccount(id)
    },

    deleteAccount(id: number): boolean {
      return db.prepare('DELETE FROM accounts WHERE id = ?').run(id).changes > 0
    },

    addDdEvent(
      accountId: number,
      e: { happened_on: string | null; amount: number | null; source_note: string | null }
    ): DdEvent {
      const info = db
        .prepare(
          'INSERT INTO dd_events (account_id, happened_on, amount, source_note) VALUES (?, ?, ?, ?)'
        )
        .run(accountId, e.happened_on, e.amount, e.source_note)
      return db
        .prepare('SELECT * FROM dd_events WHERE id = ?')
        .get(Number(info.lastInsertRowid)) as DdEvent
    },

    listDdEvents(accountId: number): DdEvent[] {
      return db
        .prepare('SELECT * FROM dd_events WHERE account_id = ? ORDER BY id')
        .all(accountId) as DdEvent[]
    },

    deleteDdEvent(id: number): boolean {
      return db.prepare('DELETE FROM dd_events WHERE id = ?').run(id).changes > 0
    },

    getSettings,
    saveSettings,
    getProviderSettings,
    saveProviderSettings,
  }
}

type Db = ReturnType<typeof createDb>

let defaultDb: Db | null = null
function getDb(): Db {
  if (!defaultDb)
    defaultDb = createDb(process.env.DATA_DB_PATH || path.join(process.cwd(), 'data.db'))
  return defaultDb
}

export const createOffer = (input: OfferInput) => getDb().createOffer(input)
export const listOffers = () => getDb().listOffers()
export const getOffer = (id: number) => getDb().getOffer(id)
export const updateOffer = (id: number, patch: Partial<OfferInput>) =>
  getDb().updateOffer(id, patch)
export const deleteOffer = (id: number) => getDb().deleteOffer(id)
export const createAccount = (offerId: number, input: Parameters<Db['createAccount']>[1]) =>
  getDb().createAccount(offerId, input)
export const listAccounts = (offerId: number) => getDb().listAccounts(offerId)
export const getAccount = (id: number) => getDb().getAccount(id)
export const updateAccount = (id: number, patch: Parameters<Db['updateAccount']>[1]) =>
  getDb().updateAccount(id, patch)
export const deleteAccount = (id: number) => getDb().deleteAccount(id)
export const addDdEvent = (accountId: number, e: Parameters<Db['addDdEvent']>[1]) =>
  getDb().addDdEvent(accountId, e)
export const listDdEvents = (accountId: number) => getDb().listDdEvents(accountId)
export const deleteDdEvent = (id: number) => getDb().deleteDdEvent(id)
export const getSettings = () => getDb().getSettings()
export const saveSettings = (s: Settings) => getDb().saveSettings(s)
export const getProviderSettings = () => getDb().getProviderSettings()
export const saveProviderSettings = (ps: ProviderSettings) => getDb().saveProviderSettings(ps)
