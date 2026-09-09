import {useState} from 'react';
import {act, economics, money, quote} from './engine';
import type {Action, Sector, State} from './engine';

type Decision='market'|'expand'|'manager'|'price';
export default function DecisionPreview({state,sector,onConfirm}:{state:State;sector:Sector;onConfirm:(action:Action)=>void}){
 const [choice,setChoice]=useState<Decision>('market');
 const action:Action={type:choice,sector},q=quote(state,action),business=state.businesses.find(b=>b.sector===sector);
 if(!business)return null;
 const before=economics(state,business),next=q.reason?null:act(state,action),after=next?economics(next,next.businesses.find(b=>b.sector===sector)!):null;
 const rows=after&&next?[['Naqd zaxira',state.cash,next.cash,'so‘m'],['Oylik sof foyda',before.profit,after.profit,'so‘m'],['Biznes naqd oqimi',before.cashFlow,after.cashFlow,'so‘m'],['Sotuv / xizmat hajmi',before.units,after.units,'birlik']]:[];
 return <section className="life-decision-preview" aria-label="Qaror natijasini oldindan ko‘rish"><h2>Qaror nimani o‘zgartiradi?</h2><label>Qarorni sinab ko‘ring<select value={choice} onChange={e=>setChoice(e.target.value as Decision)}><option value="market">Reklama</option><option value="expand">Kengaytirish</option><option value="manager">Boshqaruvchi</option><option value="price">Narxni oshirish</option></select></label>
 {q.reason?<p role="status">{q.reason}</p>:<><p>Hozirgi talab bo‘yicha prognoz. {money(q.cost)} so‘m va 1 hafta sarflanadi. Tanlashning o‘zi o‘yinni o‘zgartirmaydi.</p><div className="life-comparison-wrap" tabIndex={0} role="region" aria-label="Oldin va keyin jadvali; tor ekranda yon tomonga suring"><table><caption>{q.label}: oldin va keyin</caption><thead><tr><th scope="col">Ko‘rsatkich</th><th scope="col">Hozir</th><th scope="col">Qarordan keyin</th></tr></thead><tbody>{rows.map(([name,oldValue,newValue,unit])=><tr key={name}><th scope="row">{name}<small>{unit}</small></th><td>{money(Number(oldValue))}</td><td>{money(Number(newValue))}</td></tr>)}</tbody></table></div><button className="life-primary" onClick={()=>onConfirm(action)}>Shu qarorni qo‘llash</button></>}
 </section>;
}
