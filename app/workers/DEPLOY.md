# OQIM Onlayn server — Deploy qo'llanmasi (v19)

Bu papka Cloudflare Workers + Durable Objects ustida ishlaydigan onlayn multiplayer serveri.
Frontend (Vite build) Cloudflare Pages'ga, backend (shu papka) Workers'ga joylanadi.

## 1. Talablar

- Node.js 18+ va Cloudflare akkaunti (bepul tariff yetarli — Durable Objects uchun Workers Paid $5 kerak bo'lishi mumkin, 2025-yildan Free tarifda ham DO mavjud).
- Terminal.

## 2. Wrangler o'rnatish va login

```bash
npm i -g wrangler
wrangler login        # brauzer ochiladi — Cloudflare akkauntingiz bilan ruxsat bering
```

## 3. Serverni deploy qilish

```bash
cd workers
npm i                 # wrangler + @cloudflare/workers-types o'rnatadi
wrangler deploy       # oqim-server worker'ni joylaydi
```

Deploy muvaffaqiyatli bo'lganda wrangler quyidagiga o'xshash URL chiqaradi:

```
https://oqim-server.<account>.workers.dev
```

Tekshirish:

```bash
curl https://oqim-server.<account>.workers.dev/api/health
# {"ok":true,"service":"oqim-server","version":19}
```

Xona yaratish sinovi:

```bash
curl -X POST https://oqim-server.<account>.workers.dev/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","timerSec":60,"bots":1}'
# {"ok":true,"code":"ABC234","hostToken":"...","playerId":0}
```

> `wrangler.toml` ichida `GAME_ROOM` Durable Object binding va `new_classes: ["GameRoom"]`
> migratsiyasi allaqachon yozilgan — qo'shimcha sozlash shart emas.

## 4. Frontendni Cloudflare Pages'ga joylash

Loyiha ildizida (workers/ EMAS, bir pog'ona yuqorida):

```bash
npm i
VITE_OQIM_SERVER=https://oqim-server.<account>.workers.dev npm run build
```

Keyin Pages'ga joylash (ikki usul):

**A) Wrangler orqali (tavsiya):**
```bash
wrangler pages deploy dist --project-name=oqim
```

**B) Cloudflare Dashboard orqali:**
1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git (yoki Direct upload).
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Environment variable (Production): `VITE_OQIM_SERVER = https://oqim-server.<account>.workers.dev`
5. Save and Deploy.

> MUHIM: `VITE_OQIM_SERVER` build vaqtida kodga yoziladi (`import.meta.env`).
> Server URL o'zgarsa, frontend'ni qayta build qilish kerak.
> O'rnatilmagan bo'lsa placeholder `https://oqim-server.your-account.workers.dev` ishlatiladi
> va onlayn sahifa "Serverga ulanib bo'lmadi" deb ko'rsatadi (lokal o'yin /game buzilmaydi).

## 5. CORS

Worker barcha domenlardan so'rovlarni qabul qiladi (`Access-Control-Allow-Origin: *`).
Istasangiz, `workers/src/index.ts` dagi `CORS` konstantasini faqat o'z Pages domeningiz bilan cheklang.

## 6. Lokal sinov (ixtiyoriy)

```bash
cd workers
wrangler dev          # http://localhost:8787 da server
# boshqa terminalda, loyiha ildizida:
VITE_OQIM_SERVER=http://localhost:8787 npm run dev
```

## 7. Arxitektura eslatmasi

- `POST /api/rooms` — xona yaratadi, 6 belgili kod qaytaradi (Durable Object `idFromName(code)`).
- `GET /api/rooms/:code` — lobby holati (JSON).
- `GET /api/rooms/:code/ws` — WebSocket; barcha o'yin logikasi `GameRoom` DO ichida.
- Navbat taymeri — DO `setAlarm` orqali; vaqt tugasa server avtomatik harakat qiladi.
- Reconnect — mijoz `playerToken`ni localStorage'da saqlaydi va join paytida qayta yuboradi.
- Onlayn rejim MVP'da faqat KLASSIK doska (yo'l xaritasi/reja rejimlari lokal o'yinlarda qoladi).
