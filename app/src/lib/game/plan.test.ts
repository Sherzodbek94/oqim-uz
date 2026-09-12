import { describe, expect, test } from "vitest"

import {
  DAYS_PER_WEEK,
  PLAN_DAYS,
  WEEKS_PER_MONTH,
  autofillPlan,
  autofillPlanWeek,
  makeEmptyPlan,
  planSalaryScale,
  planTileCounts,
  planWorkDays,
  validatePlan,
  validatePlanWeek,
  weekOfDay,
  weekStartDay,
} from "./plan"
import type { PlanDay, PlanTile } from "./plan"

/** Berilgan plitkalardan reja yasaydi; qolgan kunlar null bo'lib qoladi. */
function planFrom(tiles: (PlanTile | null)[]): PlanDay[] {
  const days = makeEmptyPlan()
  tiles.forEach((tile, i) => {
    if (i < days.length) days[i] = { tile, done: false }
  })
  return days
}

/** Hamma kuni bir xil plitka bilan to'ldirilgan reja. */
function planOfAll(tile: PlanTile): PlanDay[] {
  return makeEmptyPlan().map(() => ({ tile, done: false }))
}

describe("reja konstantalari", () => {
  /*
   * Hafta segmentlari oyni AYNAN qoplashi kerak. Agar kimdir
   * WEEKS_PER_MONTH yoki DAYS_PER_WEEK ni o'zgartirsa va PLAN_DAYS
   * yangilanmasa, validatePlanWeek oyning bir qismini hech qachon
   * tekshirmay qo'yadi — bu jim o'tadigan xato.
   */
  test("hafta × kun = oy kunlari", () => {
    expect(WEEKS_PER_MONTH * DAYS_PER_WEEK).toBe(PLAN_DAYS)
  })

  test("bo'sh reja to'g'ri uzunlikda va to'liq bo'sh", () => {
    const days = makeEmptyPlan()
    expect(days).toHaveLength(PLAN_DAYS)
    expect(days.every((d) => d.tile === null && d.done === false)).toBe(true)
  })
})

describe("weekOfDay / weekStartDay", () => {
  test("kun indeksi to'g'ri haftaga tushadi", () => {
    expect(weekOfDay(0)).toBe(0)
    expect(weekOfDay(4)).toBe(0)
    expect(weekOfDay(5)).toBe(1)
    expect(weekOfDay(9)).toBe(1)
    expect(weekOfDay(10)).toBe(2)
    expect(weekOfDay(14)).toBe(2)
    expect(weekOfDay(15)).toBe(3)
    expect(weekOfDay(19)).toBe(3)
  })

  test("oy tashqarisidagi kun oxirgi haftaga qisiladi", () => {
    expect(weekOfDay(PLAN_DAYS)).toBe(WEEKS_PER_MONTH - 1)
    expect(weekOfDay(999)).toBe(WEEKS_PER_MONTH - 1)
  })

  test("hafta boshlanish kunlari", () => {
    expect(weekStartDay(0)).toBe(0)
    expect(weekStartDay(1)).toBe(5)
    expect(weekStartDay(2)).toBe(10)
    expect(weekStartDay(3)).toBe(15)
  })

  test("weekOfDay va weekStartDay bir-birini qaytaradi", () => {
    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
      expect(weekOfDay(weekStartDay(w))).toBe(w)
      // Haftaning oxirgi kuni ham shu haftada:
      expect(weekOfDay(weekStartDay(w) + DAYS_PER_WEEK - 1)).toBe(w)
    }
  })
})

describe("validatePlanWeek", () => {
  test("to'liq rejada har bir hafta yaroqli", () => {
    const days = planOfAll("work")
    for (let w = 0; w < WEEKS_PER_MONTH; w++) {
      expect(validatePlanWeek(days, w)).toBe(true)
    }
  })

  test("noto'g'ri hafta indeksi rad etiladi", () => {
    const days = planOfAll("work")
    expect(validatePlanWeek(days, -1)).toBe(false)
    expect(validatePlanWeek(days, WEEKS_PER_MONTH)).toBe(false)
  })

  test("reja uzunligi noto'g'ri bo'lsa rad etiladi", () => {
    expect(validatePlanWeek([{ tile: "work", done: false }], 0)).toBe(false)
  })

  test("haftada bitta bo'sh kun bo'lsa — yaroqsiz", () => {
    const days = planOfAll("work")
    days[7] = { tile: null, done: false }
    expect(validatePlanWeek(days, 1)).toBe(false)
  })

  /* Haftalar mustaqil: boshqa haftadagi bo'shliq joriy haftaga ta'sir qilmaydi. */
  test("boshqa haftadagi bo'sh kun joriy haftani buzmaydi", () => {
    const days = planOfAll("work")
    days[17] = { tile: null, done: false }
    expect(validatePlanWeek(days, 0)).toBe(true)
    expect(validatePlanWeek(days, 3)).toBe(false)
  })
})

describe("autofillPlanWeek", () => {
  test("faqat joriy haftaning bo'sh kunlarini to'ldiradi", () => {
    const filled = autofillPlanWeek(makeEmptyPlan(), 1)

    // 1-hafta (5–9) "rest" bo'ldi:
    for (let i = 5; i < 10; i++) expect(filled[i].tile).toBe("rest")
    // Qolgan haftalar tegilmagan:
    for (let i = 0; i < 5; i++) expect(filled[i].tile).toBeNull()
    for (let i = 10; i < PLAN_DAYS; i++) expect(filled[i].tile).toBeNull()
  })

  test("allaqachon qo'yilgan plitkani almashtirmaydi", () => {
    const days = planFrom(["work", "client", "market", "event", "knowledge"])
    const filled = autofillPlanWeek(days, 0)
    expect(filled.slice(0, 5).map((d) => d.tile)).toEqual([
      "work",
      "client",
      "market",
      "event",
      "knowledge",
    ])
  })

  test("to'ldirgandan keyin hafta yaroqli bo'ladi", () => {
    const filled = autofillPlanWeek(makeEmptyPlan(), 2)
    expect(validatePlanWeek(filled, 2)).toBe(true)
  })

  test("kirish massivini o'zgartirmaydi", () => {
    const days = makeEmptyPlan()
    autofillPlanWeek(days, 0)
    expect(days.every((d) => d.tile === null)).toBe(true)
  })
})

describe("validatePlan / autofillPlan", () => {
  test("bo'sh reja yaroqsiz, to'la reja yaroqli", () => {
    expect(validatePlan(makeEmptyPlan())).toBe(false)
    expect(validatePlan(planOfAll("rest"))).toBe(true)
  })

  test("uzunligi noto'g'ri reja yaroqsiz", () => {
    expect(validatePlan([{ tile: "work", done: false }])).toBe(false)
  })

  test("autofillPlan butun oyni yaroqli qiladi", () => {
    const filled = autofillPlan(makeEmptyPlan())
    expect(validatePlan(filled)).toBe(true)
    expect(filled.every((d) => d.tile === "rest")).toBe(true)
  })
})

describe("planWorkDays / planSalaryScale", () => {
  test("ish kunlari sanaladi", () => {
    expect(planWorkDays(planOfAll("work"))).toBe(PLAN_DAYS)
    expect(planWorkDays(planOfAll("rest"))).toBe(0)
    expect(planWorkDays(makeEmptyPlan())).toBe(0)
  })

  test("maosh koeffitsiyenti ish kunlari ulushiga teng", () => {
    expect(planSalaryScale(planOfAll("work"))).toBe(1)
    expect(planSalaryScale(planOfAll("rest"))).toBe(0)

    const half = planOfAll("rest")
    for (let i = 0; i < PLAN_DAYS / 2; i++) half[i] = { tile: "work", done: false }
    expect(planSalaryScale(half)).toBe(0.5)
  })

  test("koeffitsiyent har doim 0 va 1 orasida", () => {
    for (let workDays = 0; workDays <= PLAN_DAYS; workDays++) {
      const days = planOfAll("rest")
      for (let i = 0; i < workDays; i++) days[i] = { tile: "work", done: false }
      const scale = planSalaryScale(days)
      expect(scale).toBeGreaterThanOrEqual(0)
      expect(scale).toBeLessThanOrEqual(1)
    }
  })
})

describe("planTileCounts", () => {
  test("har bir plitka turi sanaladi", () => {
    const days = planFrom(["work", "work", "knowledge", "client", "market", "event", "rest"])
    const counts = planTileCounts(days)

    expect(counts.work).toBe(2)
    expect(counts.knowledge).toBe(1)
    expect(counts.client).toBe(1)
    expect(counts.market).toBe(1)
    expect(counts.event).toBe(1)
    expect(counts.rest).toBe(1)
  })

  test("bo'sh kunlar sanalmaydi — yig'indi qo'yilgan plitkalar soni", () => {
    const days = planFrom(["work", null, "rest"])
    const total = Object.values(planTileCounts(days)).reduce((a, b) => a + b, 0)
    expect(total).toBe(2)
  })

  test("to'la rejada yig'indi oy kunlariga teng", () => {
    const total = Object.values(planTileCounts(planOfAll("client"))).reduce((a, b) => a + b, 0)
    expect(total).toBe(PLAN_DAYS)
  })

  test("hamma turlar kalit sifatida mavjud (0 bo'lsa ham)", () => {
    const counts = planTileCounts(makeEmptyPlan())
    expect(Object.keys(counts).sort()).toEqual(
      ["client", "event", "knowledge", "market", "rest", "work"].sort()
    )
    expect(Object.values(counts).every((v) => v === 0)).toBe(true)
  })
})
