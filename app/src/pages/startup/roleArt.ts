/**
 * Xodim portretlari — Higgsfield personajlaridan kesilgan bosh-yelka
 * (`public/startup/roles/<rol>-<jins>-<n>.webp`).
 *
 * IKKI O'LCHOV. Jins ismdan kelib chiqadi: portret faqat ROLGA bog'langanda
 * «Ulug'bek — dizayner» ayol portreti bilan chiqardi. Ismni rolga
 * moslashtirish buni yopardi, lekin «dizayner = ayol» qolipini kodga
 * mustahkamlardi, shuning uchun har rolga ikkala jins CHIZILDI.
 *
 * Variant esa ismning o'zidan hisoblanadi: bitta jamoadagi ikki junior bir
 * xil yuz bilan chiqmasligi kerak. Dasturchi rollarida beshtadan — o'yinchi
 * ularni bir nechtadan yollaydi (junior 5, middle/senior 4); qolganlarida
 * uchtadan, chunki ikkinchi buxgalter kamdan-kam uchraydi.
 *
 * TANLOV BARQAROR va holatsiz: ism o'zgarmaguncha portret ham o'zgarmaydi,
 * saqlanmaga hech narsa yozilmaydi va eski saqlanmalar ham to'g'ri
 * chiziladi. Shu sababdan bu yerda `Math.random` ham, seeded RNG ham yo'q —
 * dvigatel tasodifi faqat o'yin mantig'iga tegishli.
 *
 * ALOHIDA MODULDA, `tabs.tsx` ichida emas: komponent fayli konstanta
 * eksport qilsa Fast Refresh ishlamay qoladi (`react-refresh/
 * only-export-components`).
 */
import { FEMALE_NAMES, NAMES } from "@/lib/startup/balance";
import type { RoleId } from "@/lib/startup/types";

export const FOUNDER_ART = "/startup/roles/founder.webp";

const v = (role: string, g: "m" | "f", n: number) =>
  Array.from({ length: n }, (_, i) => `/startup/roles/${role}-${g}-${i + 1}.webp`);

/** TO'LIQ `Record`: yangi rol qo'shilsa, ikkala jins ham bo'lmaguncha `tsc` yiqiladi. */
export const ROLE_ART: Record<RoleId, { m: string[]; f: string[] }> = {
  junior: { m: v("junior", "m", 5), f: v("junior", "f", 5) },
  middle: { m: v("middle", "m", 4), f: v("middle", "f", 4) },
  senior: { m: v("senior", "m", 4), f: v("senior", "f", 4) },
  designer: { m: v("designer", "m", 3), f: v("designer", "f", 3) },
  smm: { m: v("smm", "m", 3), f: v("smm", "f", 3) },
  sales: { m: v("sales", "m", 3), f: v("sales", "f", 3) },
  accountant: { m: v("accountant", "m", 3), f: v("accountant", "f", 3) },
  hr: { m: v("hr", "m", 3), f: v("hr", "f", 3) },
  office: { m: v("office", "m", 3), f: v("office", "f", 3) },
};

/**
 * Ism -> variant indeksi.
 *
 * XESH EMAS, O'RIN. Avval FNV-1a ishlatilgandi, lekin ismlar ro'yxati kichik
 * (jinsiga 13 tadan) va bunday o'lchamda har qanday xesh omadga qoladi:
 * FNV `% 4` da bitta portret hech kimga tushmasdi, `% 5` da esa boshqasi.
 * Murmur finalizeri va multiply-shift ham bo'shliq qoldirdi.
 *
 * Shuning uchun indeks o'z JINSIDAGI ro'yxatdagi O'RINDAN olinadi: navbat
 * bilan aylanadi, ya'ni ismlar variantdan ko'p bo'lsa har bir portret
 * albatta ishlatiladi. Tanlov baribir barqaror — `NAMES` tartibi
 * o'zgarmaydi (u seeded RNG bilan tortiladi, qayta tartiblash eski
 * partiyalarni buzardi).
 *
 * Ro'yxatda yo'q ism (kelajakda o'yinchi tanlaydigan yoki boshqa manba)
 * xeshga tushadi — bo'sh ekran bermaslik uchun.
 */
const BY_GENDER: Record<"m" | "f", string[]> = {
  m: NAMES.filter(n => !FEMALE_NAMES.has(n)),
  f: NAMES.filter(n => FEMALE_NAMES.has(n)),
};

/** FNV-1a — faqat ro'yxatdan tashqaridagi ismlar uchun zaxira. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Rol va ismga mos portret. Ism berilmasa (asoschi) — bitta variant. */
export function portraitFor(role: RoleId | "founder", name?: string): string {
  if (role === "founder") return FOUNDER_ART;
  const g = name && FEMALE_NAMES.has(name) ? "f" : "m";
  const set = ROLE_ART[role][g];
  if (!name) return set[0];
  const i = BY_GENDER[g].indexOf(name);
  return set[(i >= 0 ? i : hash(name)) % set.length];
}
