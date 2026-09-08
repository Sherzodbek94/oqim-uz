export type Choice = { label: string; detail: string; cost: number; energy?: number; skill?: number; boost?: number; salaryDelta?: number; livingDelta?: number };
export const EVENTS: Record<string, {title: string; body: string; scene: number; choices: Choice[]; scope?: string; minMonth?: number}> = {
  health: {title: 'Sog‘liqni ortga surmang', body: 'Tekshiruvga borish yoki hozircha uyda dam olishni tanlang.', scene: 6, choices: [{label: 'Shifokorga borish',detail: 'Naqd −600 000 · quvvat +20',cost: 600_000,energy: 20},{label: 'Uyda dam olish',detail: 'Pul sarflanmaydi · quvvat +5',cost: 0,energy: 5}]},
  family: {title: 'Oilaviy dam olish', body: 'Yaqinlaringiz bilan vaqt o‘tkazish ham hayotingizning bir qismi.',scene: 8,choices:[{label:'Birga sayohat',detail:'Naqd −500 000 · quvvat +25',cost:500_000,energy:25},{label:'Bog‘da sayr',detail:'Bepul · quvvat +10',cost:0,energy:10}]},
  employee: {title: 'Yangi loyiha taklifi',body:'Ish beruvchi qo‘shimcha vazifa taklif qildi. Daromad ko‘payadi, lekin dam olishga kamroq vaqt qoladi.',scene:0,choices:[{label:'Vazifani olish',detail:'Naqd +800 000 · quvvat −15',cost:-800_000,energy:-15},{label:'Asosiy ishga e’tibor',detail:'Naqd o‘zgarmaydi · quvvat +5',cost:0,energy:5}]},
  trade: {title:'Yetkazib beruvchi aksiyasi',body:'Do‘kon mahsulotlarini tanitish uchun yetkazib beruvchi bilan qo‘shma aksiya qilish mumkin.',scene:1,choices:[{label:'Aksiyani boshlash',detail:'Naqd −400 000 · shu oy talab +15%',cost:400_000,boost:15},{label:'Oddiy savdoni davom ettirish',detail:'Qo‘shimcha xarajat yo‘q',cost:0}]},
  production: {title:'Yangi partiya uchun buyurtma',body:'Mahalliy kafe nonvoyxonangizdan mahsulot olmoqchi. Namuna va yetkazib berishni tashkil etish kerak.',scene:11,choices:[{label:'Namuna yuborish',detail:'Naqd −300 000 · shu oy talab +15%',cost:300_000,boost:15},{label:'Hozirgi mijozlarni saqlash',detail:'Qo‘shimcha xarajat yo‘q',cost:0}]},
  service: {title:'Mijoz tavsiyasi',body:'Eski mijoz sizni hamkoriga tavsiya qildi. Uchrashuv uchun vaqt ajratsangiz, yangi buyurtmalar keladi.',scene:3,choices:[{label:'Uchrashuvga borish',detail:'Quvvat −10 · shu oy talab +15%',cost:0,energy:-10,boost:15},{label:'Mavjud ishlarni yakunlash',detail:'Quvvat +5',cost:0,energy:5}]},
};

// Six additional situations per audience: 6 originals + 30 additions = 36.
type Situation = [string,string,string,number,string,number,number,string,number,number];
const situations:Record<string,Situation[]>={
 common:[
 ['repair','Uy quvuri oqmoqda','Usta chaqirish muammoni tez bartaraf qiladi. O‘zingiz tuzatsangiz quvvat sarflaysiz.',7,'Usta chaqirish',450000,5,'O‘zim ta’mirlayman',0,-20],
 ['family-budget','Oilaviy xarid rejasi','Ro‘yxat bilan xarid qilish ortiqcha sarfni kamaytiradi.',5,'Xaridni rejalash',0,-5,'Tayyor to‘plam olish',180000,5],
 ['transport','Avtomobilga xizmat kerak','Profilaktika yoki vaqtincha jamoat transportini tanlang.',7,'Servisga topshirish',700000,5,'Avtobusdan foydalanish',0,-10],
 ['birthday','Yaqiningizning tug‘ilgan kuni','Qimmat sovg‘a yoki o‘z qo‘lingiz bilan tayyorlangan sovg‘a.',5,'Sovg‘a sotib olish',350000,10,'Qo‘lda sovg‘a tayyorlash',0,-5],
 ['rest-day','Charchoq yig‘ilib qoldi','Dam olish keyingi haftalardagi ish unumdorligini tiklaydi.',8,'Dam olish maskani',400000,30,'Uyda dam olish',0,15],
 ['lost-phone','Telefon ta’miri','Ish uchun kerakli telefoningiz buzildi. Yangi model olish shart emas.',7,'Ta’mirlash',500000,0,'Zaxira telefonga o‘tish',0,-10],
 ],
 employee:[
 ['overtime','Shoshilinch topshiriq','Ishdan keyin qolish evaziga bir martalik qo‘shimcha haq beriladi.',0,'Qo‘shimcha ishlash',-650000,-15,'Dam olishni saqlash',0,10],
 ['presentation','Muhim taqdimot','Yaxshi tayyorgarlik uchun vaqt sarflaysiz; natijada mukofot olasiz.',0,'Taqdimotni tayyorlash',-450000,-10,'Asosiy vazifada qolish',0,5],
 ['training','Ish joyidagi trening','Ish beruvchi bepul trening taklif qildi. Unda qatnashish vaqt talab qiladi.',4,'Treningda qatnashish',0,-10,'Keyingi safar qatnashish',0,5],
 ['commute','Uzoq ish safari','Safar uchun qo‘shimcha haq bor, lekin yo‘l charchatadi.',0,'Safarga borish',-900000,-25,'Masofadan yordam berish',-200000,-5],
 ['team','Hamkasbga ko‘mak','Hamkasbingizning ishini vaqtincha bajarish taklif etildi.',0,'Vazifani olish',-350000,-10,'O‘z rejamni davom ettirish',0,5],
 ['promotion','Yangi mas’uliyat','Lavozim oshishi bilan maosh ham, mas’uliyat ham ortadi.',0,'Lavozimni qabul qilish',0,-15,'Hozirgi vazifada qolish',0,5],
 ],
 trade:[
 ['delivery','Tovar yetkazish kechikdi','Tezkor transport savdoni saqlaydi; kutish esa shu oy talabni kamaytiradi.',1,'Tezkor transport',350000,0,'Yetkazishni kutish',0,0],
 ['display','Vitrinani yangilash','Tovarlarni qulay joylashtirish yangi xaridorlarni jalb qilishi mumkin.',1,'Vitrinani yangilash',300000,-5,'Hozircha o‘zgartirmaslik',0,0],
 ['competitor','Yaqinda raqobatchi ochildi','Mijozlarga servisni yaxshilash orqali javob berishingiz mumkin.',1,'Servis aksiyasi',450000,-5,'Oddiy savdoni davom ettirish',0,0],
 ['market-day','Mahallada yarmarka','Yarmarkaga chiqish vaqt va joy haqini talab qiladi.',1,'Savdo joyi olish',250000,-10,'Do‘konda qolish',0,5],
 ['returns','Xaridor mahsulotni qaytardi','Masalani xizmat bilan hal qilish obro‘ni saqlaydi.',1,'Almashtirib berish',200000,0,'O‘zim tuzatib beraman',0,-15],
 ['loyalty','Doimiy xaridorlar','Sodiqlik dasturini boshlash yoki mavjud usulda ishlashni tanlang.',1,'Bonus dasturi',350000,-5,'Oddiy savdo',0,0],
 ],
 production:[
 ['machine','Uskunani sozlash','Profilaktika ishlab chiqarishning to‘xtab qolishini kamaytiradi.',11,'Ustani chaqirish',600000,0,'O‘zim sozlayman',0,-20],
 ['quality','Sifat tekshiruvi','Qo‘shimcha sifat nazorati qayta buyurtmalarni ko‘paytirishi mumkin.',11,'Nazoratni kuchaytirish',400000,-5,'Oddiy nazorat',0,0],
 ['supplier','Xomashyo yetkazuvchisi','Yangi yetkazuvchining namunasini sinash uchun xarajat kerak.',11,'Namunani sinash',250000,-10,'Hozirgi yetkazuvchida qolish',0,0],
 ['power','Elektr uzilishi','Vaqtincha generator ishlab chiqarishni davom ettirishga yordam beradi.',11,'Generator ijarasi',700000,0,'Ishni vaqtincha to‘xtatish',0,5],
 ['packaging','Qadoqlash taklifi','Yangi qadoq mahsulotni savdo nuqtalariga olib chiqishga yordam beradi.',11,'Yangi qadoq sinovi',350000,-5,'Eski qadoqni saqlash',0,0],
 ['wholesale','Ulgurji mijoz uchrashuvi','Doimiy xaridor uchun namuna va uchrashuv tashkil etish mumkin.',11,'Namuna taqdim etish',300000,-10,'Hozirgi buyurtmalarni bajarish',0,0],
 ],
 service:[
 ['review','Mijoz fikri','Mijoz ishni biroz o‘zgartirishni so‘radi. Yaxshi servis yangi mijoz olib kelishi mumkin.',3,'Tuzatishni bajarish',0,-15,'Kelishilgan hajmni saqlash',0,5],
 ['urgent','Shoshilinch buyurtma','Buyurtmaga vaqt ajratish oy oxiridagi talabni oshiradi.',3,'Buyurtmani qabul qilish',0,-20,'Navbatga yozish',0,5],
 ['tools','Asboblarni yangilash','Mayda asbob va dasturiy vositalarni yangilash sifatga yordam beradi.',3,'Vositalarni yangilash',450000,5,'Mavjud vositalarda ishlash',0,-5],
 ['partner','Hamkor tavsiyasi','Hamkor sizning xizmatingizni o‘z mijozlariga tavsiya qilmoqchi.',3,'Hamkorlikni boshlash',250000,-5,'Mustaqil davom etish',0,0],
 ['cancel','Mijoz uchrashuvni bekor qildi','Bo‘sh vaqtni yangi mijoz topishga yoki dam olishga sarflang.',3,'Yangi mijoz izlash',0,-10,'Dam olish',0,15],
 ['portfolio','Ishlaringiz namoyishi','Yaxshi portfolio yangi buyurtmalar uchun ishonch yaratadi.',3,'Portfolio tayyorlash',200000,-10,'Keyinroq tayyorlash',0,5],
 ],
};
function effects(c:Choice){return [c.cost?`Naqd ${c.cost>0?'−':'+'}${Math.abs(c.cost).toLocaleString('uz-UZ')}`:'Naqd o‘zgarmaydi',c.energy?`quvvat ${c.energy>0?'+':''}${c.energy}`:'',c.boost?`shu oy talab ${c.boost>0?'+':''}${c.boost}%`:'',c.salaryDelta?`maosh +${c.salaryDelta.toLocaleString('uz-UZ')}/oy`:''].filter(Boolean).join(' · ');}
for(const [scope,rows] of Object.entries(situations))for(const [id,title,body,scene,yes,cost,energy,no,costNo,energyNo] of rows){
 const business=['trade','production','service'].includes(scope);
 const choices:Choice[]=[{label:yes,detail:'',cost,energy,...(business?{boost:15}:{})},{label:no,detail:'',cost:costNo,energy:energyNo,...(business&&['delivery','competitor','power','cancel'].includes(id)?{boost:-15}:{})}];
 if(id==='promotion')choices[0].salaryDelta=350000;
 choices.forEach(c=>{c.detail=effects(c);});
 EVENTS[`${scope}-${id}`]={title,body,scene,scope,minMonth:2,choices};
}
for(const id of ['health','family'])EVENTS[id].scope='common';
for(const id of ['employee','trade','production','service'])EVENTS[id].scope=id;
