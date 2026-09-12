import { describe, expect, test } from "vitest"

import { amortizeTerms, annuityPayment, splitExpenses } from "./engine"
import { DEFAULT_LOAN_MONTHLY_RATE } from "./types"

/*
 * `lib/game/` ning moliyaviy yadrosi. Bu funksiyalar sof — tashqi holat yo'q,
 * shuning uchun ular birlik test uchun eng qimmatli nuqta.
 *
 * MUHIM: annuitet formulasini testda QAYTA YOZMAYMIZ — aks holda test
 * implementatsiyaning ko'zgusi bo'lib qoladi va xato formula ham "o'tadi".
 * Buning o'rniga to'lov jadvali MUSTAQIL simulyatsiya qilinadi: har oy
 * qoldiqqa foiz qo'shiladi va to'lov ayiriladi. To'g'ri PMT bilan oxirida
 * qoldiq ~0 bo'lishi kerak.
 */
function remainingAfterAllPayments(
  principal: number,
  monthlyRate: number,
  months: number,
  payment: number
): number {
  let balance = principal
  for (let i = 0; i < months; i++) {
    balance = balance + balance * monthlyRate - payment
  }
  return balance
}

describe("annuityPayment", () => {
  test("noto'g'ri kirish uchun 0 qaytaradi", () => {
    expect(annuityPayment(0, 0.015, 12)).toBe(0)
    expect(annuityPayment(-1000, 0.015, 12)).toBe(0)
    expect(annuityPayment(1_000_000, 0.015, 0)).toBe(0)
    expect(annuityPayment(1_000_000, 0.015, -5)).toBe(0)
  })

  test("foizsiz kredit — principal muddatga teng bo'linadi", () => {
    expect(annuityPayment(120_000, 0, 12)).toBe(10_000)
    expect(annuityPayment(100_000, 0, 3)).toBe(33_333)
  })

  test("manfiy stavka foizsiz deb qaraladi", () => {
    expect(annuityPayment(120_000, -0.02, 12)).toBe(annuityPayment(120_000, 0, 12))
  })

  test("butun so'mga yaxlitlanadi", () => {
    const pmt = annuityPayment(7_777_777, 0.017, 19)
    expect(Number.isInteger(pmt)).toBe(true)
  })

  /* Asosiy tekshiruv: to'lov jadvali haqiqatan kreditni yopadimi? */
  test.each([
    { principal: 1_000_000, monthlyRate: 0.02, months: 12 },
    { principal: 10_000_000, monthlyRate: 0.015, months: 24 },
    { principal: 45_000_000, monthlyRate: 0.01, months: 60 },
    { principal: 250_000, monthlyRate: 0.05, months: 6 },
  ])(
    "$months oy × $monthlyRate stavka bilan qoldiq yopiladi",
    ({ principal, monthlyRate, months }) => {
      const pmt = annuityPayment(principal, monthlyRate, months)
      const left = remainingAfterAllPayments(principal, monthlyRate, months, pmt)
      // Yaxlitlash tufayli kichik qoldiq bo'lishi mumkin, lekin bitta
      // to'lovdan kichik bo'lishi shart — aks holda formula noto'g'ri.
      expect(Math.abs(left)).toBeLessThan(pmt)
    }
  )

  test("stavka oshgani sayin to'lov ham oshadi", () => {
    const low = annuityPayment(10_000_000, 0.01, 24)
    const mid = annuityPayment(10_000_000, 0.02, 24)
    const high = annuityPayment(10_000_000, 0.03, 24)
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
  })

  test("muddat uzaygani sayin to'lov kamayadi", () => {
    const short = annuityPayment(10_000_000, 0.015, 12)
    const long = annuityPayment(10_000_000, 0.015, 36)
    expect(long).toBeLessThan(short)
  })

  test("foizli kreditda jami to'lov principal'dan katta", () => {
    const months = 24
    const pmt = annuityPayment(10_000_000, 0.015, months)
    expect(pmt * months).toBeGreaterThan(10_000_000)
  })
})

describe("amortizeTerms", () => {
  test("noto'g'ri kirish uchun hamma qiymat nol", () => {
    expect(amortizeTerms(0, 100_000)).toEqual({
      monthlyPayment: 0,
      monthlyRate: 0,
      remainingMonths: 0,
      remainingBalance: 0,
      totalMonths: 0,
    })
    expect(amortizeTerms(1_000_000, 0)).toEqual({
      monthlyPayment: 0,
      monthlyRate: 0,
      remainingMonths: 0,
      remainingBalance: 0,
      totalMonths: 0,
    })
  })

  test("to'lov × muddat ≤ principal bo'lsa — foizsiz shartlar", () => {
    const terms = amortizeTerms(1_000_000, 10_000, 10)
    expect(terms.monthlyRate).toBe(0)
    expect(terms.monthlyPayment).toBe(10_000)
    expect(terms.remainingMonths).toBe(10)
    expect(terms.remainingBalance).toBe(1_000_000)
    expect(terms.totalMonths).toBe(10)
  })

  /*
   * Bisection topgan yashirin stavka HAQIQIY bo'lishi kerak: uni annuitet
   * formulasiga qaytarib qo'ysak, berilgan to'lov qayta chiqishi shart.
   * Bu bisection mantiqini mustaqil tekshiradi.
   */
  test("berilgan muddat uchun topilgan stavka to'lovni qayta hosil qiladi", () => {
    const principal = 10_000_000
    const monthlyPayment = 500_000
    const months = 24

    const terms = amortizeTerms(principal, monthlyPayment, months)

    expect(terms.monthlyRate).toBeGreaterThan(0)
    expect(terms.monthlyRate).toBeLessThan(0.2)
    expect(
      Math.abs(annuityPayment(principal, terms.monthlyRate, months) - monthlyPayment)
    ).toBeLessThanOrEqual(1)
  })

  /*
   * Bisection oralig'i [1e-6, 0.2] — ya'ni oyiga 20% dan yuqori yashirin
   * stavka IFODALANMAYDI. Bunday to'lov berilsa stavka 0.2 ga taqaladi va
   * saqlangan to'lov stavkaga mos kelmaydi. Bu cheklov ataylab yozib
   * qo'yilgan, chunki u jim o'tadi.
   */
  test("20% dan yuqori kerakli stavka 0.2 ga taqaladi", () => {
    const principal = 1_000_000
    const monthlyPayment = 500_000
    const months = 12

    const terms = amortizeTerms(principal, monthlyPayment, months)

    expect(terms.monthlyRate).toBeCloseTo(0.2, 3)
    expect(terms.monthlyPayment).toBe(monthlyPayment)
    // Taqalgan stavkada formula bu to'lovni bermaydi:
    expect(annuityPayment(principal, terms.monthlyRate, months)).toBeLessThan(monthlyPayment)
  })

  test("muddat berilmasa — standart stavkada muddat hisoblanadi", () => {
    const principal = 1_000_000
    const monthlyPayment = 50_000

    const terms = amortizeTerms(principal, monthlyPayment)

    expect(terms.monthlyRate).toBe(DEFAULT_LOAN_MONTHLY_RATE)
    expect(terms.monthlyPayment).toBe(monthlyPayment)
    expect(terms.remainingMonths).toBeGreaterThanOrEqual(1)
    expect(terms.remainingMonths).toBeLessThanOrEqual(600)
    // Hisoblangan muddat davomida to'lov kreditni yopishi kerak:
    const left = remainingAfterAllPayments(
      principal,
      terms.monthlyRate,
      terms.remainingMonths,
      monthlyPayment
    )
    expect(Math.abs(left)).toBeLessThan(monthlyPayment)
  })

  test("to'lov foizni ham qoplamasa — 60 oyga annuitet qayta hisoblanadi", () => {
    const principal = 1_000_000
    // 1_000_000 × 0.015 = 15_000; bundan kichik to'lov foizni qoplamaydi.
    const terms = amortizeTerms(principal, 10_000)

    expect(terms.remainingMonths).toBe(60)
    expect(terms.totalMonths).toBe(60)
    expect(terms.monthlyRate).toBe(DEFAULT_LOAN_MONTHLY_RATE)
    expect(terms.monthlyPayment).toBe(
      annuityPayment(principal, DEFAULT_LOAN_MONTHLY_RATE, 60)
    )
    // Endi to'lov foizdan katta bo'ldi:
    expect(terms.monthlyPayment).toBeGreaterThan(principal * DEFAULT_LOAN_MONTHLY_RATE)
  })
})

describe("splitExpenses", () => {
  /*
   * `other` qoldiq sifatida hisoblanadi, shuning uchun bo'laklar yig'indisi
   * HAR QANDAY butun son uchun aynan total ga teng bo'lishi kerak. Bu
   * hisobot qatorlarining yig'indisi jamiga mos kelishini kafolatlaydi.
   */
  test.each([0, 1, 7, 99, 100, 999, 123_456, 1_000_000, 7_777_777])(
    "bo'laklar yig'indisi %i ga aynan teng",
    (total) => {
      const p = splitExpenses(total)
      expect(p.taxes + p.housing + p.food + p.transport + p.other).toBe(total)
    }
  )

  test("ulushlar kutilgan foizlarda taqsimlanadi", () => {
    expect(splitExpenses(1000)).toEqual({
      taxes: 200,
      housing: 300,
      food: 250,
      transport: 120,
      other: 130,
    })
  })

  test("barcha bo'laklar butun son", () => {
    const p = splitExpenses(3_333_333)
    for (const value of Object.values(p)) {
      expect(Number.isInteger(value)).toBe(true)
    }
  })
})
