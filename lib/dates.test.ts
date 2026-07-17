import { describe, expect, it } from "vitest";
import {
  churnEligibleOn,
  daysSince,
  daysOpen,
  ddDeadline,
  expiryCountdown,
  payoutWait,
  safeCloseOn,
} from "./dates";

const TODAY = "2026-07-08";

describe("daysSince", () => {
  it("returns elapsed whole days from an event date through today", () => {
    expect(daysSince("2026-07-01", TODAY)).toBe(7);
    expect(daysSince(TODAY, TODAY)).toBe(0);
  });

  it("returns null when the event date is absent", () => {
    expect(daysSince(null, TODAY)).toBeNull();
  });
});

describe("daysOpen", () => {
  it("returns 10 for an account opened 10 days before today", () => {
    expect(daysOpen("2026-06-28", TODAY)).toBe(10);
  });

  it("returns 0 when opened today", () => {
    expect(daysOpen(TODAY, TODAY)).toBe(0);
  });

  it("returns null for null openedOn", () => {
    expect(daysOpen(null, TODAY)).toBeNull();
  });
});

describe("ddDeadline", () => {
  it("opened 30 days ago with 90-day window: 60 remaining, not overdue, not near", () => {
    const r = ddDeadline("2026-06-08", 90, TODAY);
    expect(r).toEqual({
      deadline: "2026-09-06",
      daysRemaining: 60,
      overdue: false,
      near: false,
    });
  });

  it("window elapsed: overdue true", () => {
    const r = ddDeadline("2026-01-01", 90, TODAY)!;
    expect(r.daysRemaining).toBeLessThan(0);
    expect(r.overdue).toBe(true);
  });

  it("daysRemaining 14 is near", () => {
    const r = ddDeadline("2026-06-08", 44, TODAY)!;
    expect(r.daysRemaining).toBe(14);
    expect(r.near).toBe(true);
  });

  it("daysRemaining 0 is near", () => {
    const r = ddDeadline("2026-06-08", 30, TODAY)!;
    expect(r.daysRemaining).toBe(0);
    expect(r.near).toBe(true);
    expect(r.overdue).toBe(false);
  });

  it("daysRemaining 15 is not near", () => {
    const r = ddDeadline("2026-06-08", 45, TODAY)!;
    expect(r.daysRemaining).toBe(15);
    expect(r.near).toBe(false);
  });

  it("null openedOn or null deadlineDays returns null", () => {
    expect(ddDeadline(null, 90, TODAY)).toBeNull();
    expect(ddDeadline("2026-06-08", null, TODAY)).toBeNull();
  });
});

describe("churnEligibleOn", () => {
  it("closed 2 months ago, 24-month interval: eligible 22 months out, not now", () => {
    const r = churnEligibleOn("2026-05-08", 24, TODAY)!;
    expect(r.eligibleOn).toBe("2028-05-08");
    expect(r.eligibleNow).toBe(false);
    expect(r.daysRemaining).toBeGreaterThan(0);
  });

  it("eligibleOn in the past: eligibleNow true", () => {
    const r = churnEligibleOn("2024-01-15", 12, TODAY)!;
    expect(r.eligibleOn).toBe("2025-01-15");
    expect(r.eligibleNow).toBe(true);
    expect(r.daysRemaining).toBeLessThan(0);
  });

  it("null closedOn or null interval returns null", () => {
    expect(churnEligibleOn(null, 24, TODAY)).toBeNull();
    expect(churnEligibleOn("2026-05-08", null, TODAY)).toBeNull();
  });

  it("month-end clamp: 2025-01-31 + 1 month = 2025-02-28", () => {
    expect(churnEligibleOn("2025-01-31", 1, TODAY)!.eligibleOn).toBe("2025-02-28");
  });
});

describe("safeCloseOn", () => {
  it("opened 30 days ago with 180-day hold: safe in 150 days, not now", () => {
    expect(safeCloseOn("2026-06-08", 180, TODAY)).toEqual({
      safeOn: "2026-12-05",
      daysRemaining: 150,
      safeNow: false,
    });
  });

  it("safeOn in the past: safeNow true, negative remaining", () => {
    const r = safeCloseOn("2026-01-01", 30, TODAY)!;
    expect(r.safeNow).toBe(true);
    expect(r.daysRemaining).toBeLessThan(0);
  });

  it("safeOn today: safeNow true, zero remaining", () => {
    const r = safeCloseOn("2026-06-08", 30, TODAY)!;
    expect(r.daysRemaining).toBe(0);
    expect(r.safeNow).toBe(true);
  });

  it("null openedOn or null minHoldDays returns null", () => {
    expect(safeCloseOn(null, 180, TODAY)).toBeNull();
    expect(safeCloseOn("2026-06-08", null, TODAY)).toBeNull();
  });
});

describe("expiryCountdown", () => {
  it("expires 12 days out: 12 remaining, not expired", () => {
    expect(expiryCountdown("2026-07-20", TODAY)).toEqual({
      daysRemaining: 12,
      expired: false,
    });
  });

  it("expired yesterday: expired true", () => {
    expect(expiryCountdown("2026-07-07", TODAY)).toEqual({
      daysRemaining: -1,
      expired: true,
    });
  });

  it("expires today: not expired", () => {
    expect(expiryCountdown(TODAY, TODAY)).toEqual({
      daysRemaining: 0,
      expired: false,
    });
  });

  it("null expiresOn returns null", () => {
    expect(expiryCountdown(null, TODAY)).toBeNull();
  });
});

describe("payoutWait", () => {
  it("received: whole days from lastDd to receivedOn", () => {
    expect(payoutWait("2026-06-17", "2026-07-01", TODAY)).toBe(14);
  });

  it("not yet received: days from lastDd to today", () => {
    expect(payoutWait("2026-06-28", null, TODAY)).toBe(10);
  });

  it("null lastDdOn returns null", () => {
    expect(payoutWait(null, "2026-07-01", TODAY)).toBeNull();
  });
});
