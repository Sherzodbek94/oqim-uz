import { motion } from "framer-motion";
import {
  Zap, Mail, Landmark, KeyRound, Plane, PowerOff, TrendingUp, Gift, type LucideIcon,
} from "lucide-react";
import { eventItems } from "./data";
import { uz } from "@/lib/uz";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const icons: Record<string, LucideIcon> = { Zap, Mail, Landmark, KeyRound, Plane, PowerOff, TrendingUp, Gift };
const toneChip = {
  clay: "bg-clay-100 text-clay-500",
  emerald: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
} as const;

function Row({ items, reverse }: { items: typeof eventItems; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="group/row relative overflow-hidden">
      <div
        className={`flex w-max gap-4 py-2 ${reverse ? "animate-marquee-reverse" : "animate-marquee"} group-hover/row:[animation-play-state:paused] motion-reduce:animate-none`}
      >
        {doubled.map((e, i) => {
          const Icon = icons[e.icon] ?? Zap;
          return (
            <div
              key={i}
              className="flex w-[260px] shrink-0 items-center gap-3 rounded-full bg-white px-4 py-3 shadow-card transition-transform duration-200 hover:-translate-y-0.5 md:w-[320px]"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneChip[e.tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">{e.title}</span>
              <span className={`chip shrink-0 !px-2.5 !py-0.5 !text-[10px] ${toneChip[e.tone]}`}>{e.effect}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EventsMarquee() {
  const half = Math.ceil(eventItems.length / 2);
  return (
    <section className="bg-sand-100 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <h2 className="text-h2">{uz.home.events.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-600">{uz.home.events.sub}</p>
        </motion.div>
      </div>
      <div className="mt-10 space-y-4">
        <Row items={eventItems.slice(0, half)} />
        <Row items={eventItems.slice(half)} reverse />
      </div>
    </section>
  );
}
