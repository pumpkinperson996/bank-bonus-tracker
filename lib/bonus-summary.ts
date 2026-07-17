export interface BonusReceipt {
  bonus_received_on: string | null
  bonus_received_amount: number | null
}

export interface ReceivedBonusSummary {
  total: number
  receivedCount: number
  missingAmountCount: number
}

export function summarizeReceivedBonuses(accounts: BonusReceipt[]): ReceivedBonusSummary {
  return accounts.reduce<ReceivedBonusSummary>(
    (summary, account) => {
      if (account.bonus_received_on === null) return summary

      summary.receivedCount += 1
      if (account.bonus_received_amount === null || !Number.isFinite(account.bonus_received_amount)) {
        summary.missingAmountCount += 1
      } else {
        summary.total += account.bonus_received_amount
      }
      return summary
    },
    { total: 0, receivedCount: 0, missingAmountCount: 0 }
  )
}
