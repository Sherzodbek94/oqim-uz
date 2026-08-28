import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home, Coffee, Scissors, ShoppingBasket, Send, Factory, Landmark, TrendingUp, DollarSign, ChefHat, Store,
  type LucideIcon,
} from "lucide-react";
import { investments, type InvestCategory } from "./data";
import { uz } from "@/lib/uz";
import { formatUZSCompact } from "@/lib/format";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const icons: Record<string, LucideIcon> = {
  Home, Coffee, Scissors, ShoppingBasket, Send, Factory, Landmark, TrendingUp, DollarSign, ChefHat, Store,
};

const catTint: Record<InvestCategory, string> = {
  realestate: "bg-emerald-100 text-emerald-600",
  business: "bg-clay-100 text-clay-500",
  securities: "bg-sky-100 text-sky-600",
  currency: "bg-gold-100 text-gold-600",
};

type TabKey = "all" | InvestCategory;
const tabs: TabKey[] = ["all", "realestate", "business", "securities", "currency"];

export default function Investments() {
  const [tab, setTab] = useState<TabKey>("all");
  const list = investments.filter((i) => tab === "all" || i.category === tab);

  return (
    <section className="bg-sand-50 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <h2 className="text-h2">{uz.home.investments.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-600">{uz.home.investments.sub}</p>
        </motion.div>

        {/* pill tabs (§9.10) */}
        <div className="mt-8 flex justify-center">
          <div className="flex flex-wrap justify-center gap-1 rounded-full bg-sand-100 p-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t ? "text-ink-900" : "text-ink-600 hover:text-ink-900"
                }`}
              >
                {tab === t && (
                  <motion.span
                    layoutId="invest-tab-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-card"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{uz.home.investments.tabs[t]}</span>
              </button>
            ))}
          </div>
        </div>

        <motion.div layout className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((inv, i) => {
              const Icon = icons[inv.icon] ?? Home;
              return (
                <motion.article
                  layout
                  key={inv.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35, delay: i * 0.06, ease: EASE }}
                  className="card group relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-emerald-600/30 hover:shadow-lift"
                >
                  <span className="chip absolute right-4 top-4 bg-gold-100 text-gold-600">{inv.roi}</span>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${catTint[inv.category]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-h3 !text-[20px]">{inv.title}</h3>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-ink-400">{uz.common.price}</span>
                      <span className="text-money-sm text-ink-900">{formatUZSCompact(inv.price)}</span>
                    </div>
                    <div className="flex justify-between text-body-sm">
                      <span className="text-ink-400">
                        {inv.cashflow ? uz.common.monthlyCashflow : uz.common.capitalGrowth}
                      </span>
                      <span className={`text-money-sm ${inv.cashflow ? "text-emerald-600" : "text-sky-600"}`}>
                        {inv.cashflow ? `+${formatUZSCompact(inv.cashflow)}` : inv.growthNote}
                      </span>
                    </div>
                  </div>
                  {/* hover risk drawer strip */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-sand-100 px-5 py-2.5 text-body-sm text-ink-600 transition-transform duration-200 group-hover:translate-y-0">
                    <span className="font-medium text-clay-500">{uz.home.investments.riskPrefix}</span> {inv.risk}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
