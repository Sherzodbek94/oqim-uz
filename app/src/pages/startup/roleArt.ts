/**
 * Xodim portretlari — Higgsfield personajlaridan kesilgan bosh-yelka
 * (`public/startup/roles/<rol>-<jins>.webp`).
 *
 * HAR ROLNING IKKI VARIANTI BOR. Ilgari portret faqat ROLGA bog'langandi va
 * ism `NAMES` dan tasodifiy tortilardi, ya'ni «Ulug'bek — dizayner» ayol
 * portreti bilan chiqardi. Ismni rolga moslashtirish (dizayner doim ayol)
 * muammoni yopardi, lekin o'rniga qolipni kodga mustahkamlardi; shuning
 * uchun ikkinchi variant CHIZILDI va tanlov ISM bo'yicha ketadi — rollar
 * jins jihatidan ochiq qoladi.
 *
 * Asoschining ismi o'yinchi tanlamaydi (`BALANCE.founderName`), unda jins
 * ishorasi yo'q — shuning uchun uning portreti bitta.
 *
 * ALOHIDA MODULDA, `tabs.tsx` ichida emas: komponent fayli konstanta
 * eksport qilsa Fast Refresh ishlamay qoladi (`react-refresh/
 * only-export-components`).
 */
import { FEMALE_NAMES } from "@/lib/startup/balance";
import type { RoleId } from "@/lib/startup/types";

export const FOUNDER_ART = "/startup/roles/founder.webp";

/** TO'LIQ `Record`: yangi rol qo'shilsa, ikkala variant ham bo'lmaguncha `tsc` yiqiladi. */
export const ROLE_ART: Record<RoleId, { m: string; f: string }> = {
  junior: { m: "/startup/roles/junior-m.webp", f: "/startup/roles/junior-f.webp" },
  middle: { m: "/startup/roles/middle-m.webp", f: "/startup/roles/middle-f.webp" },
  senior: { m: "/startup/roles/senior-m.webp", f: "/startup/roles/senior-f.webp" },
  designer: { m: "/startup/roles/designer-m.webp", f: "/startup/roles/designer-f.webp" },
  smm: { m: "/startup/roles/smm-m.webp", f: "/startup/roles/smm-f.webp" },
  sales: { m: "/startup/roles/sales-m.webp", f: "/startup/roles/sales-f.webp" },
  accountant: { m: "/startup/roles/accountant-m.webp", f: "/startup/roles/accountant-f.webp" },
  hr: { m: "/startup/roles/hr-m.webp", f: "/startup/roles/hr-f.webp" },
  office: { m: "/startup/roles/office-m.webp", f: "/startup/roles/office-f.webp" },
};

/** Rol va ismga mos portret. Ism berilmasa (asoschi) — bitta variant. */
export function portraitFor(role: RoleId | "founder", name?: string): string {
  if (role === "founder") return FOUNDER_ART;
  return ROLE_ART[role][name && FEMALE_NAMES.has(name) ? "f" : "m"];
}
