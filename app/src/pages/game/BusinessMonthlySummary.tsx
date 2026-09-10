import type { Asset } from "@/lib/game/types";
import { businessSupplyLabel } from "@/lib/game/business-finance";
import { businessMarket, marketIndexLabel } from "@/lib/game/business-market";
import { formatUZSCompact } from "@/lib/format";

type MonthlyAsset = Pick<Asset, "businessModel" | "monthlyRevenue" | "monthlyOperatingCosts" | "operatingCostParts" | "monthlyCashflow" | "market">;

export default function BusinessMonthlySummary({asset: a}: {asset: MonthlyAsset}) {
  if (a.monthlyRevenue === undefined || a.monthlyOperatingCosts === undefined) return null;
  const costs = a.operatingCostParts;
  const market = businessMarket(a);
  const rows: [string, number][] = [
    ["Oylik tushum", a.monthlyRevenue],
    ...(costs ? [["Xodimlar maoshi", -costs.payroll], ["Ijara", -costs.rent], [businessSupplyLabel(a.businessModel), -costs.supplies], ["Marketing", -costs.marketing], ["Boshqa biznes xarajatlari", -costs.other]] as [string, number][] : []),
    ["Jami operatsion xarajat", -a.monthlyOperatingCosts],
    ["Oylik sof oqim", a.monthlyCashflow],
  ];
  return <div className="mt-2 text-sm" aria-label="Biznesning oylik hisoboti">
    <dl>{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-2 py-1"><dt>{label}</dt><dd className="font-semibold">{formatUZSCompact(value)}</dd></div>)}</dl>
    {a.market && <p>
      Bu oy: talab {marketIndexLabel(market.demand)}, ta'minot narxi {marketIndexLabel(market.inputPrice)}, o'tgan oy bandligi {Math.round(market.utilization * 100)}%.
      Tushum va ta'minot xarajati har oy shu indekslardan qayta hisoblanadi; ijara, marketing va maosh o'zgarmaydi.
    </p>}
    <p>Kredit, hodisa va bozor ta’siri umumiy hisobotda hisoblanadi. Qo‘shimcha buyurtmalar alohida.</p>
  </div>;
}
