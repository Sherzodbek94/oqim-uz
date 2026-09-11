/**
 * Izometrik ofis sahnasi — Higgsfield renderlari (`public/startup/office/`).
 *
 * NEGA SVG EMAS. Ilgari bu yerda brend palitrasida chizilgan SVG zaglushka
 * turardi va u xodim soniga qarab stol qo'shardi. Renderlar kelgach u
 * olib tashlandi: barcha besh daraja uchun rasm bor, ya'ni SVG hech qachon
 * chizilmasdi — qolsa, shunchaki o'qilmaydigan kod bo'lardi.
 *
 * NIMA YO'QOLDI. Stol soni va yuz ifodasi endi o'zgarmaydi. Ikkala
 * ko'rsatkich sahna USTIDA matn bilan turadi («… · N kishi», «Kayfiyat N»,
 * `tabs.tsx`), shuning uchun ma'lumot emas, uning takroriy vizual
 * ko'rinishi ketdi.
 *
 * `ART` — TO'LIQ `Record`: `types.ts` ga yangi daraja qo'shilsa, rasm
 * qo'shilmaguncha `tsc` yiqiladi. Bu ataylab; jim qolgan bo'sh sahna
 * o'rniga build to'xtagani yaxshi.
 */
import type { OfficeLevel } from "@/lib/startup/types";

const GOLD = "#D9A441", GD = "#1B4A38";

const ART: Record<OfficeLevel, { src: string; alt: string }> = {
  0: { src: "/startup/office/level0.webp", alt: "Uy/garaj: bitta stol, noutbuk, deraza ortida Toshkent hovlisi" },
  1: { src: "/startup/office/level1.webp", alt: "Coworking: uchta stol, umumiy qahva burchagi, telefon kabinasi" },
  2: { src: "/startup/office/level2.webp", alt: "Kichik ofis: oltita stol, yig'ilish stoli, server tokchasi, generator" },
  3: { src: "/startup/office/level3.webp", alt: "Korporativ ofis: ikki qavat, o'n ikki stol, shisha yig'ilish xonasi" },
  4: { src: "/startup/office/level4.webp", alt: "IT Park binosi: uch qavat, atrium, server xonasi, tomda OQIM gerbi" },
};

export function Flower({ size = 18, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx="12" cy="5" rx="2.6" ry="4.2" fill={color} transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.4" fill={GD} />
    </svg>
  );
}

export default function OfficeScene({ level, className }: { level: OfficeLevel; className?: string }) {
  const { src, alt } = ART[level];
  return (
    <img
      src={src}
      alt={alt}
      width={720}
      height={540}
      /* Ofis tab'i birinchi ochiladigan ekran — kechiktirish faqat miltillash berardi. */
      loading="eager"
      decoding="async"
      className={className}
    />
  );
}
