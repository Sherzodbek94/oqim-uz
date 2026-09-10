import type { Asset } from "@/lib/game/types";
import { PRODUCTION_LINE_MONTHS, businessEconomy, usesProductionLine } from "@/lib/game/business-economy";
import { businessMarket, marketIndexLabel } from "@/lib/game/business-market";
import { formatUZSCompact } from "@/lib/format";

type SummaryAsset = Pick<Asset, "businessModel" | "operations" | "market">;

export default function BusinessOperationsSummary({ asset }: {asset: SummaryAsset}) {
  const economy = businessEconomy(asset);
  const op = asset.operations;
  const capacity = op?.capacity ?? economy.initialCapacity;
  const line = usesProductionLine(asset);
  const market = businessMarket(asset);
  return (
    <div className="mb-2 rounded-lg border border-gold-200 p-2 text-sm text-ink-700" aria-label="Qo'shimcha buyurtma holati">
      <p className="font-semibold">Qo'shimcha buyurtmalar · {economy.name}</p>
      <p>Bo'sh quvvat: {capacity - (op?.usedCapacity ?? 0)} / {capacity} {economy.capacityLabel}/oy</p>
      {economy.resourcePerUnit > 0
        ? <p>{economy.resource}: {op?.stock ?? 0} birlik · {formatUZSCompact((op?.stock ?? 0) * economy.unitCost)}</p>
        : <p>Ombor talab qilinmaydi. Har xizmatga {economy.capacityPerUnit} ish soati va {formatUZSCompact(economy.executionCost)} bajarish xarajati kerak.</p>}
      {line && <p>
        Tayyor mahsulot ombori: {op?.finished ?? 0} birlik ·{" "}
        {op?.line ? `liniyada ${op.line.units} birlik, ${op.line.monthsLeft} oy qoldi` : `liniya bo'sh (partiya ${PRODUCTION_LINE_MONTHS} oy)`}
      </p>}
      <p>{op?.order ? `Faol buyurtma: ${op.order.units} birlik · ${op.order.monthsLeft} oy qoldi` : "Faol qo'shimcha buyurtma yo'q"}</p>
      {asset.market && <p className="mt-1">
        Bozor: talab {marketIndexLabel(market.demand)} · ta'minot narxi {marketIndexLabel(market.inputPrice)} · o'tgan oy bandligi {Math.round(market.utilization * 100)}%
        {market.priceLockMonths > 0 ? ` · narx ${market.priceLockMonths} oy qulflangan` : ""}
        {market.demandBoostMonths > 0 ? ` · kampaniya ${market.demandBoostMonths} oy` : ""}
      </p>}
      <p className="mt-1">Buyurtma tushumi passiv daromadga qo'shilmaydi. Boshqaruv qarorlari hodisa kartalarida beriladi.</p>
    </div>
  );
}
