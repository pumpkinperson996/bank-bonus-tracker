import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import Database from 'better-sqlite3'
import { createDb } from '@/lib/db'
import { DEFAULT_SETTINGS, type OfferInput } from '@/lib/types'

const offerInput: OfferInput = {
  bank_name: 'Chase',
  product_name: 'Total Checking',
  account_type: 'Checking',
  early_close_penalty: 'clawback within 180d',
  bonus_amount: 300,
  requirements: 'Two DDs of $500',
  dd_amount: 500,
  dd_count: 2,
  deadline_days: 90,
  churnable: true,
  churn_interval_months: 24,
  churn_from: 'bonus',
  churn_source_note: 'DoC',
  eligibility_rules: [
    {
      kind: 'current_account',
      months: null,
      anchor: null,
      description: 'No current checking account.',
    },
    {
      kind: 'bonus_history',
      months: 24,
      anchor: 'bonus',
      description: 'No checking bonus in the past 24 months.',
    },
  ],
  min_hold_days: 180,
  expires_on: '2026-12-31',
  fee_note: 'no fee with DD',
  notes: 'good offer',
  source: 'https://example.com',
  import_key: 'bbw:51d0e71d-cd21-4991-a48c-4b187570baa1',
  doc_url: 'https://www.doctorofcredit.com/example-offer/',
  doc_checked_on: '2026-07-17',
  churn_source_url: 'https://www.doctorofcredit.com/example-offer/#comment-1',
  bank_scope: 'nationwide',
  closure_method: 'Close by secure message',
  closure_source_url: 'https://www.doctorofcredit.com/close/#Example',
  application_status: 'denied',
  application_status_reason: 'Chex-sensitive',
  application_denied_on: '2026-07-01',
}

const tmpDbPath = () =>
  join(tmpdir(), `bankdd-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)

let dbPath: string
let db: ReturnType<typeof createDb>

beforeEach(() => {
  dbPath = tmpDbPath()
  db = createDb(dbPath)
})

afterEach(() => {
  db.close()
  rmSync(dbPath, { force: true })
})

describe('db', () => {
  it('fresh file has schema and empty lists', () => {
    expect(db.listOffers()).toEqual([])
    expect(db.listAccounts(1)).toEqual([])
    expect(db.getOffer(1)).toBeNull()
  })

  it('offer CRUD round-trip with boolean and null conversion', () => {
    const offer = db.createOffer(offerInput)
    expect(offer.id).toBe(1)
    expect(offer.churnable).toBe(true)
    expect(offer.min_hold_days).toBe(180)
    expect(offer.expires_on).toBe('2026-12-31')
    expect(offer.fee_note).toBe('no fee with DD')
    expect(offer.notes).toBe('good offer')
    expect(offer.product_name).toBe('Total Checking')
    expect(offer.account_type).toBe('Checking')
    expect(offer.early_close_penalty).toBe('clawback within 180d')
    expect(offer.import_key).toBe('bbw:51d0e71d-cd21-4991-a48c-4b187570baa1')
    expect(offer.doc_url).toBe('https://www.doctorofcredit.com/example-offer/')
    expect(offer.doc_checked_on).toBe('2026-07-17')
    expect(offer.churn_source_url).toContain('#comment-1')
    expect(offer.eligibility_rules).toHaveLength(2)
    expect(offer.eligibility_rules[1]).toMatchObject({ months: 24, anchor: 'bonus' })
    expect(offer.bank_scope).toBe('nationwide')
    expect(offer.closure_method).toBe('Close by secure message')
    expect(offer.closure_source_url).toContain('#Example')
    expect(offer.application_status).toBe('denied')
    expect(offer.application_status_reason).toBe('Chex-sensitive')
    expect(offer.application_denied_on).toBe('2026-07-01')
    expect(offer.created_at).toBeTruthy()

    const fetched = db.getOffer(offer.id)!
    expect(fetched).toEqual(offer)

    const nully = db.createOffer({
      ...offerInput,
      bank_name: 'Ally',
      churnable: null,
      bonus_amount: null,
      min_hold_days: null,
      expires_on: null,
      fee_note: null,
      notes: null,
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
    expect(nully.churnable).toBeNull()
    expect(nully.bonus_amount).toBeNull()
    expect(nully.min_hold_days).toBeNull()
    expect(nully.bank_scope).toBeNull()
    expect(nully.closure_method).toBeNull()

    const updated = db.updateOffer(offer.id, {
      churnable: false,
      bonus_amount: 400,
      min_hold_days: 90,
      notes: null,
      application_status: 'ineligible',
      application_status_reason: 'outside footprint',
      application_denied_on: null,
    })!
    expect(updated.churnable).toBe(false)
    expect(updated.bonus_amount).toBe(400)
    expect(updated.min_hold_days).toBe(90)
    expect(updated.notes).toBeNull()
    expect(updated.application_status).toBe('ineligible')
    expect(updated.application_status_reason).toBe('outside footprint')
    expect(updated.application_denied_on).toBeNull()
    expect(updated.bank_name).toBe('Chase')

    expect(db.updateOffer(999, { bank_name: 'x' })).toBeNull()
    expect(db.listOffers()).toHaveLength(2)
    expect(db.deleteOffer(offer.id)).toBe(true)
    expect(db.deleteOffer(offer.id)).toBe(false)
    expect(db.getOffer(offer.id)).toBeNull()
  })

  it('enforces unique non-null import keys while allowing manual null keys', () => {
    db.createOffer(offerInput)
    expect(() => db.createOffer({ ...offerInput, bank_name: 'Duplicate' })).toThrow()

    db.createOffer({ ...offerInput, bank_name: 'Manual One', import_key: null })
    db.createOffer({ ...offerInput, bank_name: 'Manual Two', import_key: null })
    expect(db.listOffers()).toHaveLength(3)
  })

  it('account create/update/delete under an offer', () => {
    const offer = db.createOffer(offerInput)
    const acct = db.createAccount(offer.id, {
      opened_on: '2026-01-15',
      name: 'Total Checking',
      account_type: 'Checking',
      monthly_fee: '$12, waived with DD',
      early_close_penalty: 'bonus clawback within 180d',
      min_hold_days: 180,
    })
    expect(acct.offer_id).toBe(offer.id)
    expect(acct.opened_on).toBe('2026-01-15')
    expect(acct.closed_on).toBeNull()
    expect(acct.bonus_received_on).toBeNull()
    expect(acct.bonus_received_amount).toBeNull()
    expect(acct.history_only).toBe(false)
    expect(acct.notes).toBeNull()
    expect(acct.name).toBe('Total Checking')
    expect(acct.account_type).toBe('Checking')
    expect(acct.monthly_fee).toBe('$12, waived with DD')
    expect(acct.early_close_penalty).toBe('bonus clawback within 180d')
    expect(acct.min_hold_days).toBe(180)

    const bare = db.createAccount(offer.id, { opened_on: '2026-01-20' })
    expect(bare.name).toBeNull()
    expect(bare.account_type).toBeNull()
    expect(bare.monthly_fee).toBeNull()
    expect(bare.early_close_penalty).toBeNull()
    expect(bare.min_hold_days).toBeNull()
    expect(bare.history_only).toBe(false)
    db.deleteAccount(bare.id)

    const updated = db.updateAccount(acct.id, {
      bonus_received_on: '2026-05-01',
      closed_on: '2026-06-01',
      notes: 'closed after bonus',
      account_type: 'Savings',
      min_hold_days: 90,
      bonus_received_amount: 450,
      history_only: true,
    })!
    expect(updated.bonus_received_on).toBe('2026-05-01')
    expect(updated.closed_on).toBe('2026-06-01')
    expect(updated.notes).toBe('closed after bonus')
    expect(updated.account_type).toBe('Savings')
    expect(updated.min_hold_days).toBe(90)
    expect(updated.bonus_received_amount).toBe(450)
    expect(updated.history_only).toBe(true)
    expect(updated.name).toBe('Total Checking')

    const cleared = db.updateAccount(acct.id, {
      bonus_received_on: null,
      bonus_received_amount: null,
    })!
    expect(cleared.bonus_received_on).toBeNull()
    expect(cleared.bonus_received_amount).toBeNull()
    expect(cleared.notes).toBe('closed after bonus')

    expect(db.updateAccount(999, { notes: 'x' })).toBeNull()
    expect(db.listAccounts(offer.id)).toHaveLength(1)
    expect(db.deleteAccount(acct.id)).toBe(true)
    expect(db.deleteAccount(acct.id)).toBe(false)
    expect(db.listAccounts(offer.id)).toEqual([])
  })

  it('creates a historical account atomically', () => {
    const offer = db.createOffer(offerInput)
    const account = db.createAccount(offer.id, {
      opened_on: '2019-01-15',
      closed_on: '2019-08-20',
      bonus_received_on: '2019-04-01',
      bonus_received_amount: 300,
      history_only: true,
      name: 'Old checking',
    })

    expect(account).toMatchObject({
      opened_on: '2019-01-15',
      closed_on: '2019-08-20',
      bonus_received_on: '2019-04-01',
      bonus_received_amount: 300,
      history_only: true,
      name: 'Old checking',
    })
  })

  it('deleting an offer cascades its accounts', () => {
    const offer = db.createOffer(offerInput)
    db.createAccount(offer.id, { opened_on: '2026-01-01' })
    db.createAccount(offer.id, { opened_on: '2026-02-01' })
    expect(db.listAccounts(offer.id)).toHaveLength(2)
    db.deleteOffer(offer.id)
    expect(db.listAccounts(offer.id)).toEqual([])
  })

  it('dd_events CRUD round-trip and cascade on account delete', () => {
    const offer = db.createOffer(offerInput)
    const acct = db.createAccount(offer.id, { opened_on: '2026-01-15' })

    const e1 = db.addDdEvent(acct.id, { happened_on: '2026-02-01', amount: 500, source_note: 'payroll' })
    const e2 = db.addDdEvent(acct.id, { happened_on: null, amount: null, source_note: null })
    expect(e1.account_id).toBe(acct.id)
    expect(e1.happened_on).toBe('2026-02-01')
    expect(e1.amount).toBe(500)
    expect(e2.happened_on).toBeNull()

    expect(db.listDdEvents(acct.id)).toEqual([e1, e2])

    expect(db.deleteDdEvent(e1.id)).toBe(true)
    expect(db.deleteDdEvent(e1.id)).toBe(false)
    expect(db.listDdEvents(acct.id)).toEqual([e2])

    db.deleteAccount(acct.id)
    expect(db.listDdEvents(acct.id)).toEqual([])
  })

  it('settings default, save, get', () => {
    expect(db.getSettings()).toEqual(DEFAULT_SETTINGS)
    const custom = { ...DEFAULT_SETTINGS, api_key: 'sk-123', model: 'gpt-x' }
    db.saveSettings(custom)
    expect(db.getSettings()).toEqual(custom)
  })

  it('deprecated model aliases migrate to deepseek-v4-flash and persist', () => {
    for (const alias of ['deepseek-chat', 'deepseek-reasoner']) {
      db.saveSettings({ ...DEFAULT_SETTINGS, model: alias })
      expect(db.getSettings().model).toBe('deepseek-v4-flash')
      // rewritten in storage, not just in the returned object
      db.close()
      db = createDb(dbPath)
      expect(db.getSettings().model).toBe('deepseek-v4-flash')
    }
  })

  it('custom model names are not migrated', () => {
    db.saveSettings({ ...DEFAULT_SETTINGS, model: 'qwen-max' })
    expect(db.getSettings().model).toBe('qwen-max')
  })

  it('provider settings: seed from legacy, switch active, pipeline follows', () => {
    db.saveSettings({ ...DEFAULT_SETTINGS, api_key: 'ds-key' })
    const ps = db.getProviderSettings()
    expect(ps.active_provider).toBe('DeepSeek')
    expect(ps.providers[0]).toMatchObject({ name: 'DeepSeek', api_key: 'ds-key' })

    db.saveProviderSettings({
      providers: [
        ...ps.providers,
        { name: 'Kimi', base_url: 'https://api.moonshot.cn/v1', api_key: 'kimi-key', model: 'kimi-k2' },
      ],
      active_provider: 'Kimi',
    })
    expect(db.getSettings()).toEqual({
      base_url: 'https://api.moonshot.cn/v1',
      model: 'kimi-k2',
      api_key: 'kimi-key',
    })

    // switch back without retyping anything
    const ps2 = db.getProviderSettings()
    db.saveProviderSettings({ ...ps2, active_provider: 'DeepSeek' })
    expect(db.getSettings().api_key).toBe('ds-key')
  })

  it('provider settings: unknown active falls back, deprecated model in provider migrates', () => {
    db.saveProviderSettings({
      providers: [{ name: 'DeepSeek', base_url: 'https://api.deepseek.com', api_key: 'k', model: 'deepseek-chat' }],
      active_provider: 'Gone',
    })
    const ps = db.getProviderSettings()
    expect(ps.active_provider).toBe('DeepSeek')
    expect(ps.providers[0].model).toBe('deepseek-v4-flash')
  })

  it('data persists across close and reopen', () => {
    const offer = db.createOffer(offerInput)
    const acct = db.createAccount(offer.id, { opened_on: '2026-03-01' })
    const event = db.addDdEvent(acct.id, { happened_on: '2026-03-05', amount: 250, source_note: null })
    db.saveSettings({ ...DEFAULT_SETTINGS, api_key: 'persisted' })
    db.close()

    db = createDb(dbPath)
    expect(db.getOffer(offer.id)).toEqual(offer)
    expect(db.listAccounts(offer.id)).toEqual([acct])
    expect(db.listDdEvents(acct.id)).toEqual([event])
    expect(db.getSettings().api_key).toBe('persisted')
  })

})

describe('migration from old schema', () => {
  let oldPath: string

  beforeEach(() => {
    oldPath = tmpDbPath()
    const raw = new Database(oldPath)
    raw.exec(`
      CREATE TABLE offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_name TEXT NOT NULL,
        bonus_amount REAL,
        requirements TEXT,
        dd_amount REAL,
        dd_count INTEGER,
        deadline_days INTEGER,
        churnable INTEGER,
        churn_interval_months INTEGER,
        churn_source_note TEXT,
        source TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
        opened_on TEXT NOT NULL,
        closed_on TEXT,
        dd_done INTEGER NOT NULL DEFAULT 0,
        bonus_received INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO offers (bank_name, bonus_amount, churnable) VALUES ('OldBank', 200, 1);
      INSERT INTO accounts (offer_id, opened_on, dd_done, bonus_received) VALUES (1, '2025-01-01', 2, 1);
      INSERT INTO accounts (offer_id, opened_on, dd_done, bonus_received) VALUES (1, '2025-02-01', 0, 0);
    `)
    raw.close()
  })

  afterEach(() => {
    rmSync(oldPath, { force: true })
  })

  it('migrates counters to dd_events, flags to dates, drops old columns, and is idempotent', () => {
    const migrated = createDb(oldPath)

    // rows survive
    const offers = migrated.listOffers()
    expect(offers).toHaveLength(1)
    expect(offers[0].bank_name).toBe('OldBank')
    expect(offers[0].min_hold_days).toBeNull()
    expect(offers[0].expires_on).toBeNull()
    expect(offers[0].fee_note).toBeNull()
    expect(offers[0].notes).toBeNull()
    expect(offers[0].product_name).toBeNull()
    expect(offers[0].account_type).toBeNull()
    expect(offers[0].early_close_penalty).toBeNull()
    expect(offers[0].eligibility_rules).toEqual([])
    expect(offers[0].import_key).toBeNull()
    expect(offers[0].doc_url).toBeNull()
    expect(offers[0].doc_checked_on).toBeNull()
    expect(offers[0].churn_source_url).toBeNull()
    expect(offers[0].bank_scope).toBeNull()
    expect(offers[0].closure_method).toBeNull()
    expect(offers[0].closure_source_url).toBeNull()
    expect(offers[0].application_status).toBe('unreviewed')
    expect(offers[0].application_status_reason).toBeNull()
    expect(offers[0].application_denied_on).toBeNull()

    const accounts = migrated.listAccounts(1)
    expect(accounts).toHaveLength(2)
    expect(accounts[0].bonus_received_amount).toBeNull()
    expect(accounts[1].bonus_received_amount).toBeNull()

    // dd_done=2 became exactly 2 dd_events with null happened_on
    const events1 = migrated.listDdEvents(accounts[0].id)
    expect(events1).toHaveLength(2)
    for (const e of events1) {
      expect(e.happened_on).toBeNull()
      expect(e.amount).toBeNull()
      expect(e.source_note).toBe('migrated from counter')
    }
    expect(migrated.listDdEvents(accounts[1].id)).toEqual([])

    // bonus_received=1 became a non-null date; the 0 stayed null
    expect(accounts[0].bonus_received_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(accounts[0].history_only).toBe(false)
    expect(accounts[1].bonus_received_on).toBeNull()

    migrated.close()

    // dropped columns gone
    const raw = new Database(oldPath)
    const acctCols = (raw.pragma('table_info(accounts)') as { name: string }[]).map((c) => c.name)
    expect(acctCols).not.toContain('dd_done')
    expect(acctCols).not.toContain('bonus_received')
    expect(acctCols).toContain('bonus_received_on')
    expect(acctCols).toContain('history_only')
    expect(acctCols).toContain('bonus_received_amount')
    expect(acctCols).toContain('notes')
    for (const c of ['name', 'account_type', 'monthly_fee', 'early_close_penalty', 'min_hold_days'])
      expect(acctCols).toContain(c)
    raw.close()

    // second run changes nothing
    const again = createDb(oldPath)
    expect(again.listOffers()).toHaveLength(1)
    const accounts2 = again.listAccounts(1)
    expect(accounts2).toEqual(accounts)
    expect(again.listDdEvents(accounts2[0].id)).toHaveLength(2)
    expect(again.listDdEvents(accounts2[1].id)).toEqual([])
    again.close()
  })
})
