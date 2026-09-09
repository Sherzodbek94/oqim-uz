import {useEffect,useRef,useState} from 'react';
import {Check,MapPin,Minus,Plus,LocateFixed} from 'lucide-react';
import {places} from './places';
import type {Place} from './engine';
import {route,DESTINATIONS,NODES} from './navigation';
export default function TownMap({place,onArrive,onWalking,owned}:{place:Place;onArrive:(p:Place)=>void;onWalking:(v:boolean)=>void;owned:(p:Place)=>boolean}){
 const [node,setNode]=useState(DESTINATIONS[place]);
 const [pos,setPos]=useState(NODES[node]);
 const [path,setPath]=useState<string[]>([]);
 const [target,setTarget]=useState<Place|null>(null);
 const [frame,setFrame]=useState(0),[direction,setDirection]=useState(1);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});
 const viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
 const callbacks=useRef({onArrive,onWalking});
 useEffect(()=>{callbacks.current={onArrive,onWalking};},[onArrive,onWalking]);
 useEffect(()=>()=>callbacks.current.onWalking(false),[]);
 useEffect(()=>{
  if(!target||!path.length)return;
  const points=path.map(n=>NODES[n]),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  const total=lengths.reduce((a,b)=>a+b,0),duration=reduced?0:Math.max(450,total*28);
  let handle=0;const begin=performance.now();
  function tick(now:number){
   const ratio=duration?Math.min(1,(now-begin)/duration):1;let traveled=total*ratio,i=0;
   while(i<lengths.length-1&&traveled>lengths[i]){traveled-=lengths[i];i++;}
   const from=points[i],to=points[Math.min(i+1,points.length-1)],t=lengths[i]?Math.min(1,traveled/lengths[i]):1;
   setPos({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t});setFrame(Math.floor((now-begin)/140)%4);setDirection(to.x>=from.x?(to.y>=from.y?1:0):(to.y>=from.y?2:3));
   if(ratio<1){handle=requestAnimationFrame(tick);return;}
   setNode(DESTINATIONS[target!]);setFrame(1);setTarget(null);setPath([]);callbacks.current.onWalking(false);callbacks.current.onArrive(target!);
  }
  handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
 },[target,path,reduced]);
 function go(p:Place){if(target)return;setTarget(p);setPath(route(node,DESTINATIONS[p]));onWalking(true);}
 function resize(next:number){setZoom(Math.max(1,Math.min(1.8,next)));setPan({x:0,y:0});}
 return <><div className="life-camera-tools"><span><MapPin size={16}/> Binoni tanlang — qahramon yetib boradi.</span><button onClick={()=>resize(zoom-.2)} disabled={zoom<=1} aria-label="Xaritani uzoqlashtirish"><Minus size={18}/></button><output aria-label="Xarita masshtabi">{Math.round(zoom*100)}%</output><button onClick={()=>resize(zoom+.2)} disabled={zoom>=1.8} aria-label="Xaritani yaqinlashtirish"><Plus size={18}/></button><button onClick={()=>resize(1)} aria-label="Xaritani tiklash"><LocateFixed size={18}/></button><label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Kam harakat</label></div>
 <div ref={viewport} className="life-map" aria-label="Boshqariladigan shaharcha xaritasi" style={{touchAction:zoom>1?'none':'pan-y'}}
 onPointerDown={e=>{if(zoom<=1||(e.target as HTMLElement).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};e.currentTarget.setPointerCapture(e.pointerId);}}
 onPointerMove={e=>{if(!drag.current||!viewport.current)return;const w=viewport.current.clientWidth*(zoom-1)/2,h=viewport.current.clientHeight*(zoom-1)/2;setPan({x:Math.max(-w,Math.min(w,drag.current.px+e.clientX-drag.current.x)),y:Math.max(-h,Math.min(h,drag.current.py+e.clientY-drag.current.y))});}}
 onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
 <div className="life-world" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
 <img className="life-map-art" src="/life-city.webp" draggable={false} alt="Yo‘llar bilan bog‘langan uy, ish joyi va bizneslar"/>
 {path.length>1&&<svg className="life-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={path.map(n=>`${NODES[n].x},${NODES[n].y}`).join(' ')} fill="none" stroke="#fff" strokeWidth="1.2"/><polyline points={path.map(n=>`${NODES[n].x},${NODES[n].y}`).join(' ')} fill="none" stroke="#0b816a" strokeWidth=".55" strokeDasharray="1 1"/></svg>}
 {places.map(p=><button key={p.id} className={`life-place ${place===p.id?'is-selected':''} ${owned(p.id)?'is-owned':''}`} style={{left:`${p.x}%`,top:`${p.y}%`}} disabled={!!target} onClick={()=>go(p.id)} aria-pressed={place===p.id} aria-label={`${p.name}${owned(p.id)?' — sizniki':''}`}><span className="life-place-icon"><p.icon size={21}/>{owned(p.id)&&<Check size={13} className="life-owned-check"/>}</span><strong>{p.name}</strong><small>{owned(p.id)?'Sizning aktivingiz':p.hint}</small></button>)}
 <div className="life-walker" data-moving={!!target} aria-label={target?'Qahramon yo‘lda':'Qahramon yetib keldi'} style={{left:`${pos.x}%`,top:`${pos.y}%`}}><span style={{backgroundPosition:`${frame*100/3}% ${direction*100/3}%`}}/></div>
 </div></div><p className="life-travel-status" role="status">{target?`${places.find(p=>p.id===target)?.name} tomon yo‘ldasiz…`:`${places.find(p=>p.id===place)?.name}: qaror qabul qilish mumkin.`}</p>
 <div className="life-mobile-places">{places.map(p=><button key={p.id} disabled={!!target} onClick={()=>go(p.id)} aria-label={`O‘tish: ${p.name}`}><p.icon size={18}/>{p.name}{owned(p.id)&&<Check size={15}/>}</button>)}</div></>;
}
