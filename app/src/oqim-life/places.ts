import {BookOpen,BriefcaseBusiness,Building2,Factory,Home,Landmark,Store} from 'lucide-react';
import type {Place} from './engine';
export const places:{id:Place;name:string;hint:string;x:number;y:number;icon:typeof Home}[]=[
 {id:'home',name:'Mening uyim',hint:'Dam olish va hayot',x:20,y:73,icon:Home},
 {id:'office',name:'Ish va karyera',hint:'Daromad topish',x:22,y:27,icon:BriefcaseBusiness},
 {id:'market',name:'Mahalla bozori',hint:'Savdo biznesi',x:48,y:25,icon:Store},
 {id:'factory',name:'Nonvoyxona',hint:'Ishlab chiqarish',x:78,y:29,icon:Factory},
 {id:'studio',name:'Dizayn studiyasi',hint:'Xizmat biznesi',x:77,y:66,icon:Building2},
 {id:'bank',name:'Bank va aktivlar',hint:'Kredit va ijara',x:50,y:75,icon:Landmark},
 {id:'school',name:'Bilim markazi',hint:'Malaka oshirish',x:47,y:48,icon:BookOpen},
];
