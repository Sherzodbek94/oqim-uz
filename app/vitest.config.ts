import path from "path"
import { defineConfig } from "vitest/config"

/*
 * Alohida config — `vite.config.ts` ga qo'shilmadi. Sababi: `lib/game/` sof
 * TypeScript mantiqi, unga React plugin ham, jsdom ham kerak emas. Build
 * konfiguratsiyasini tegmasdan qoldirish testlar tufayli prod build'ning
 * o'zgarib ketishini oldini oladi.
 *
 * `@` aliasi `vite.config.ts` dagi bilan bir xil bo'lishi SHART — aks holda
 * `lib/game` ichidagi `@/lib/format` kabi importlar testda yechilmaydi.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/game/**"],
      reporter: ["text", "html"],
    },
  },
})
