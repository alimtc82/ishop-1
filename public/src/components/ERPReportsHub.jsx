import { useState } from 'react';
import { APP_VERSION } from '../lib/constants';
import ERPReportsAdmin from './ERPReportsAdmin';

const tabs=[['sales','تقارير المبيعات'],['purchases','تقارير المشتريات'],['inventory','تقارير المخزون'],['finance','التدفقات النقدية / Cash Flow']];
export default function ERPReportsHub({onExit}){
 const [type,setType]=useState('finance');
 return <div dir="rtl" className="min-h-[100dvh] w-full bg-bg px-3 py-4 sm:px-5">
  <header className="sticky top-0 z-30 -mx-3 -mt-4 mb-4 border-b border-border bg-card/95 px-3 py-3 shadow-sm backdrop-blur sm:-mx-5 sm:px-5"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div><div className="text-[11px] font-black text-accent">التقارير · {APP_VERSION}</div><h1 className="text-lg font-black text-text">مركز التقارير</h1></div><button onClick={onExit} className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-black">← رجوع إلى ERP</button></div></header>
  <main className="mx-auto max-w-6xl"><div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{tabs.map(([k,l])=><button key={k} onClick={()=>setType(k)} className={`rounded-xl border px-3 py-3 text-sm font-black ${type===k?'border-accent bg-accent text-on-accent':'border-border bg-card text-text'}`}>{l}</button>)}</div><section className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5"><div className="mb-5 border-b border-border pb-4"><div className="text-xs font-bold text-muted">ERP ← التقارير</div><h2 className="mt-1 text-xl font-black text-text">{tabs.find(x=>x[0]===type)?.[1]}</h2></div><ERPReportsAdmin type={type}/></section></main>
 </div>
}
