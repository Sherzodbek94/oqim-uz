import type {Place} from './engine';
export const NODES:Record<string,{x:number;y:number}>={home:{x:29,y:72},office:{x:28,y:36},market:{x:49,y:33},factory:{x:72,y:40},studio:{x:69,y:70},bank:{x:50,y:82},school:{x:52,y:56},west:{x:36,y:49},south:{x:37,y:66},east:{x:63,y:50},southeast:{x:62,y:73}};
export const EDGES=[['home','south'],['south','west'],['west','office'],['office','market'],['market','east'],['east','factory'],['east','school'],['school','west'],['school','south'],['south','bank'],['bank','southeast'],['southeast','studio'],['studio','east']];
export const DESTINATIONS:Record<Place,string>={home:'home',office:'office',market:'market',factory:'factory',studio:'studio',bank:'bank',school:'school'};
export function route(from:string,to:string):string[]{
 if(!NODES[from]||!NODES[to])return [];
 const distance:Record<string,number>={[from]:0},previous:Record<string,string>={},open=new Set(Object.keys(NODES));
 while(open.size){const current=[...open].sort((a,b)=>(distance[a]??Infinity)-(distance[b]??Infinity))[0];if(current===to)break;open.delete(current);
  for(const edge of EDGES){if(!edge.includes(current))continue;const next=edge[0]===current?edge[1]:edge[0],a=NODES[current],b=NODES[next],cost=(distance[current]??Infinity)+Math.hypot(a.x-b.x,a.y-b.y);if(cost<(distance[next]??Infinity)){distance[next]=cost;previous[next]=current;}}
 }
 if(from!==to&&!previous[to])return [];
 const result=[to];while(result[0]!==from)result.unshift(previous[result[0]]);return result;
}
