import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import ListPagination,{useListPagination} from './ui/ListPagination';
import {fetchAllProductMovements} from '../lib/inventoryData';

const OUT = new Set(['sale','purchase_return','transfer_out','adjustment_out']);
const signed = r => OUT.has(r.movement_type) ? -Number(r.quantity||0) : Number(r.quantity||0);
export default function InventoryStockAdmin(){
  const [products,setProducts]=useState([]),[movements,setMovements]=useState([]),[q,setQ]=useState(''),[branch,setBranch]=useState(''),[msg,setMsg]=useState('');
  const load=async()=>{setMsg('');const [{data:p,error:pe},{data:m,error:me}]=await Promise.all([
    supabase.from('products').select('id,sku,name,serial_tracked,is_active,product_units(name,symbol)').order('name'),
    fetchAllProductMovements('id,product_id,movement_type,quantity,branch,created_at').then(data=>({data,error:null})).catch(error=>({data:[],error}))
  ]); if(pe||me)setMsg((pe||me).message); setProducts(p||[]);setMovements(m||[])};
  useEffect(()=>{load()},[]);
  const branches=useMemo(()=>[...new Set(movements.map(x=>x.branch).filter(Boolean))].sort(),[movements]);
  const rows=useMemo(()=>products.map(p=>{const ms=movements.filter(m=>m.product_id===p.id&&(!branch||(m.branch||'')===branch));const qty=ms.reduce((s,m)=>s+signed(m),0);const incoming=ms.filter(m=>signed(m)>0).reduce((s,m)=>s+signed(m),0);const outgoing=Math.abs(ms.filter(m=>signed(m)<0).reduce((s,m)=>s+signed(m),0));return {...p,qty,incoming,outgoing,last:ms.at(-1)?.created_at};}).filter(r=>`${r.sku} ${r.name}`.toLowerCase().includes(q.toLowerCase())),[products,movements,q,branch]);
  const total=rows.reduce((s,r)=>s+r.qty,0), active=rows.filter(r=>r.qty>0).length;
  const input='rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
 
 const pager=useListPagination(rows);
 return <div><div className="mb-4 grid gap-3 md:grid-cols-4"><input className={input} placeholder="بحث بالاسم أو SKU" value={q} onChange={e=>setQ(e.target.value)}/><select className={input} value={branch} onChange={e=>setBranch(e.target.value)}><option value="">كل الفروع</option>{branches.map(b=><option key={b}>{b}</option>)}</select><div className="rounded-xl border border-border bg-surface px-4 py-2 text-center"><div className="text-[11px] text-muted">إجمالي الوحدات</div><b className="text-accent">{total}</b></div><div className="rounded-xl border border-border bg-surface px-4 py-2 text-center"><div className="text-[11px] text-muted">أصناف لها رصيد</div><b className="text-accent">{active}</b></div></div>{msg&&<p className="mb-3 text-xs font-bold text-danger">{msg}</p>}<div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-surface text-xs text-muted"><tr><th className="p-3">SKU</th><th className="p-3">الصنف</th><th className="p-3">الوحدة</th><th className="p-3">وارد</th><th className="p-3">صادر</th><th className="p-3">الرصيد الحالي</th><th className="p-3">آخر حركة</th></tr></thead><tbody>{pager.visible.map(r=><tr key={r.id} className="border-t border-border"><td className="p-3 font-mono text-xs">{r.sku}</td><td className="p-3"><b>{r.name}</b>{r.serial_tracked&&<div className="text-[11px] text-muted">متتبع بالسريال</div>}</td><td className="p-3">{r.product_units?.symbol||r.product_units?.name||'—'}</td><td className="p-3 text-accent">+{r.incoming}</td><td className="p-3 text-danger">-{r.outgoing}</td><td className={`p-3 text-lg font-black ${r.qty<0?'text-danger':'text-text'}`}>{r.qty}</td><td className="p-3 text-xs">{r.last?new Date(r.last).toLocaleString('ar-EG'):'—'}</td></tr>)}{!rows.length&&<tr><td colSpan="7" className="p-8 text-center text-muted">لا توجد أصناف مطابقة.</td></tr>}</tbody></table></div><ListPagination {...pager}/></div>;
}