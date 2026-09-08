import type { Asset } from "@/lib/game/types";
import { businessEconomy } from "@/lib/game/business-economy";
import { formatUZSCompact } from "@/lib/format";

export default function BusinessOperationsSummary({ asset }: {asset: Pick<Asset, "businessModel" | "operations">}) {
  const economy = businessEconomy(asset);
  const op = asset.operations;
  const capacity = op?.capacity ?? economy.initialCapacity;
  return (
    <div className="mb-2 rounded-lg border border-gold-200 p-2 text-sm text-ink-700" aria-label="Qo'shimcha buyurtma holati">
      <p className="font-semibold">Qo'shimcha buyurtmalar · {economy.name}</p>
      <p>Bo'sh quvvat: {capacity - (op?.usedCapacity ?? 0)} / {capacity} {economy.capacityLabel}/oy</p>
      {economy.resourcePerUnit > 0
        ? <p>{economy.resource}: {op?.stock ?? 0} birlik · {formatUZSCompact((op?.stock ?? 0) * economy.unitCost)}</p>
        : <p>Ombor talab qilinmaydi. Har xizmatga {economy.capacityPerUnit} ish soati va {formatUZSCompact(economy.executionCost)} bajarish xarajati kerak.</p>}
      <p>{op?.order ? `Faol buyurtma: ${op.order.units} birlik · ${op.order.monthsLeft} oy qoldi` : "Faol qo'shimcha buyurtma yo'q"}</p>
      <p className="mt-1">Buyurtma tushumi passiv daromadga qo'shilmaydi. Boshqaruv qarorlari hodisa kartalarida beriladi.</p>
    </div>
  );
}
