import {useEffect, useState} from 'react';
import {ArrowLeft, Package, Users, Wallet, Play, Pause} from 'lucide-react';
import {economics, makeBusiness, money, SECTORS} from './engine';
import type {Sector, State} from './engine';

const tiles:Record<Sector,number>={trade:0,clothing:1,online:2,production:3,furniture:4,dairy:5,service:6,carwash:7,barber:8};
export default function BusinessInterior({state,sector,onBack}:{state:State;sector:Sector;onBack:()=>void}){
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const owned=state.businesses.find(b=>b.sector===sector),b=owned??makeBusiness(sector),d=SECTORS[sector],e=economics(state,b),tile=tiles[sector];
 useEffect(()=>{const mq=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{setReduced(mq.matches);if(mq.matches)setPlaying(false);};mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);},[]);
 useEffect(()=>{if(!playing||reduced)return;const timer=setInterval(()=>setStep(v=>(v+1)%3),2400);return()=>clearInterval(timer);},[playing,reduced]);
 const steps=[
  {title:d.group==='service'?'Jamoa va materiallar':d.group==='production'?'Xomashyo va uskuna':'Tovar va ombor',icon:Package,value:money(e.variable)+' so‘m',detail:d.group==='service'?`${d.input}: ${money(e.variable)} so‘m. Jamoa maoshi alohida ${money(e.wages)} so‘m.`:`${d.input}: ${money(e.variable)} so‘m tannarx. Ombordan ${money(e.stockUsed)} so‘m, qo‘shimcha xarid ${money(e.purchase)} so‘m.`},
  {title:d.group==='production'?'Ishlab chiqarish':d.group==='service'?'Xizmat ko‘rsatish':'Sotuv',icon:Users,value:`${money(e.units)} ${d.unit}`,detail:`Oyiga ${money(e.capacity)} ${d.unit} quvvatdan ${money(e.units)} tasi ishlatilishi kutilmoqda. Bir birlik narxi ${money(e.sell)} so‘m. ${!b.manager&&state.energy<25?'Quvvat pastligi unumdorlikni 35% kamaytiryapti.':b.manager?'Ish jarayonini boshqaruvchi yuritadi.':'Ish jarayonini o‘zingiz boshqarasiz.'}`},
  {title:'Pul tushumi',icon:Wallet,value:money(e.receipts)+' so‘m',detail:`Tushum ${money(e.revenue)} so‘m. Oy oxirida mijozlarda ${money(e.receivable)} so‘m qarz qoladi. Oldingi qarzlardan ${money(b.receivable)} so‘m undiriladi. Shu sabab kassaga ${money(e.receipts)} so‘m tushadi.`}
 ];
 const current=steps[step];
 return <section className="life-interior" aria-label="Biznes ichki sahnasi" data-sector={sector}>
  <header className="life-interior-heading"><button className="life-secondary" onClick={onBack}><ArrowLeft size={18}/> Shaharchaga qaytish</button><span>{owned?`${b.level}-bosqich · sizniki`:'Sotib olishdan oldingi ko‘rik'}</span></header>
  <h1>{d.name} ichida</h1><p>Joriy oy prognozi. Jarayonni ko‘rish pul yoki hafta sarflamaydi.</p>
  <div className="life-interior-art" role="img" aria-label={`${d.name}ning ichki ko‘rinishi`} style={{backgroundPosition:`${tile%3*50}% ${Math.floor(tile/3)*50}%`}}>
   <span className="life-interior-badge">{b.manager?'Boshqaruvchi bilan':'Egasi boshqaradi'}</span>
   <div className="life-interior-markers" aria-hidden="true">{steps.map((x,i)=><span key={x.title} className={step===i?'active':''}><x.icon size={22}/><strong>{i+1}</strong></span>)}</div>
  </div>
  <div className="life-interior-controls"><strong>Biznes qanday ishlaydi?</strong><button className="life-secondary" disabled={reduced} aria-pressed={playing} onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Animatsiyani to‘xtatish':'Jarayonni ko‘rsatish'}</button></div>
  {reduced&&<p className="life-interior-note">Kam harakat rejimi: bosqichlarni tugmalar orqali tanlang.</p>}
  <div className="life-process" role="group" aria-label="Biznes jarayoni bosqichlari">{steps.map((x,i)=><button key={x.title} aria-pressed={step===i} onClick={()=>{setPlaying(false);setStep(i);}}><x.icon size={20}/><span>{i+1}. {x.title}<strong>{x.value}</strong></span></button>)}</div>
  <article className="life-process-detail" aria-live={playing?'off':'polite'}><h2>{current.title}</h2><p>{current.detail}</p></article>
  <div className="life-interior-result"><div><span>Sof foyda / oy</span><strong className={e.profit<0?'life-negative':''}>{money(e.profit)} so‘m</strong></div><div><span>Naqd oqim / oy</span><strong className={e.cashFlow<0?'life-negative':''}>{money(e.cashFlow)} so‘m</strong></div></div>
  <p className="life-interior-note">{owned?'Boshqaruv qarorlarini biznes panelidan tanlang.':'Sotib olmaguningizcha bu biznes sizga daromad keltirmaydi.'} Sahna — jarayon izohi; pul oy yakunida hisoblanadi.</p>
 </section>;
}
