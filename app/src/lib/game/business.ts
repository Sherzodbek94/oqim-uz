import type { Asset, ProfessionField } from "./types";

// O'yin balansining namunaviy qiymatlari; real bozor daromadi prognozi emas.
const profiles: Record<ProfessionField, { title: string; tag: string; employees: number }> = {
  talim: { title: "O'quv markazi", tag: "talim", employees: 4 },
  tibbiyot: { title: "Xususiy klinika", tag: "tibbiyot", employees: 4 },
  it: { title: "Dasturiy xizmatlar studiyasi", tag: "onlayn", employees: 3 },
  savdo: { title: "Savdo do'koni", tag: "savdo", employees: 3 },
  qishloq: { title: "Fermer xo'jaligi", tag: "dala", employees: 4 },
  xizmat: { title: "Xizmat ko'rsatish markazi", tag: "xizmat", employees: 3 },
  qurilish: { title: "Qurilish brigadasi", tag: "qurilish", employees: 5 },
  huquq: { title: "Yuridik xizmatlar byurosi", tag: "xizmat", employees: 3 },
  moliya: { title: "Buxgalteriya xizmatlari byurosi", tag: "xizmat", employees: 3 },
  transport: { title: "Transport korxonasi", tag: "avto", employees: 4 },
};

export function startingBusiness(id: string, field: ProfessionField): Asset {
  return {
    id, ...profiles[field], kind: "business", icon: "Store",
    price: 200_000_000, paid: 70_000_000,
    monthlyRevenue: 30_000_000, monthlyOperatingCosts: 16_000_000,
    monthlyCashflow: 14_000_000,
    operatingCostParts: { payroll: 8_000_000, rent: 3_000_000, supplies: 3_000_000, marketing: 1_000_000, other: 1_000_000 },
    resalePercent: 70, liquidity: 3, buyIndex: 1, riskLevel: 2,
  };
}
