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
 * xil yuz bilan chiqmasligi kerak. Dasturchi rollarida uchtadan — o'yinchi
 * ularni bir nechtadan yollaydi; qolganlarida ikkitadan, chunki ikkita
 * buxgalter kamdan-kam uchraydi.
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
import { FEMALE_NAMES } from "@/lib/startup/balance";
import type { RoleId } from "@/lib/startup/types";

export const FOUNDER_ART = "/startup/roles/founder.webp";

const v = (role: string, g: "m" | "f", n: number) =>
  Array.from({ length: n }, (_, i) => `/startup/roles/${role}-${g}-${i + 1}.webp`);

/** TO'LIQ `Record`: yangi rol qo'shilsa, ikkala jins ham bo'lmaguncha `tsc` yiqiladi. */
export const ROLE_ART: Record<RoleId, { m: string[]; f: string[] }> = {
  junior: { m: v("junior", "m", 3), f: v("junior", "f", 3) },
  middle: { m: v("middle", "m", 3), f: v("middle", "f", 3) },
  senior: { m: v("senior", "m", 3), f: v("senior", "f", 3) },
  designer: { m: v("designer", "m", 2), f: v("designer", "f", 2) },
  smm: { m: v("smm", "m", 2), f: v("smm", "f", 2) },
  sales: { m: v("sales", "m", 2), f: v("sales", "f", 2) },
  accountant: { m: v("accountant", "m", 2), f: v("accountant", "f", 2) },
  hr: { m: v("hr", "m", 2), f: v("hr", "f", 2) },
  office: { m: v("office", "m", 2), f: v("office", "f", 2) },
};

/**
 * Ismdan barqaror indeks (FNV-1a). Kriptografik emas — talab bitta: bir xil
 * ism har doim bir xil raqam bersin.
 *
 * FNV-1a ATAYLAB, djb2 emas. Ro'yxat kichik (13 erkak + 13 ayol ismi) va
 * shunday o'lchamda xeshning sifati ko'rinib qoladi: djb2 ayol ismlarini
 * uchta variantga 11/0/2 qilib bo'lardi, ya'ni ikkinchi portret umuman
 * chizilmasdi. FNV-1a o'sha ro'yxatda 4/4/5 va 5/4/4 beradi.
 */
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
  const set = ROLE_ART[role][name && FEMALE_NAMES.has(name) ? "f" : "m"];
  return set[name ? hash(name) % set.length : 0];
}
