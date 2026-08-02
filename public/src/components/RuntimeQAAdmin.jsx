import { APP_VERSION } from '../lib/constants';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useAllowedBranches} from '../hooks/useAllowedBranches';

const checks=[
 ['products','المنتجات','id'],
 ['customers','العملاء','id'],
 ['suppliers','الموردون','id'],
 ['sales_invoices','فواتير البيع','id'],
 ['purchase_invoices','فواتير الشراء','id'],
 ['product_movements','حركات المخزون','id'],
 ['product_serials','السيريالات','id'],
 ['treasuries','الخزائن','id'],
 ['financial_movements','الحركات المالية','id'],
 ['dues','المستحقات','id'],
];
export default function RuntimeQAAdmin(){
 const {branches}=useAllowedBranches();const[rows,setRows]=useState([]),[busy,setBusy]=useState(false),[ran,setRan]=useState('');
 const run=async()=>{setBusy(true);const out=[];for(const [table,label,col] of checks){const{count,error}=await supabase.from(table).select(col,{count:'exact',head:true});out.push({label,table,ok:!error,detail:error?.message||`${count??0} سجل`})}out.unshift({label:'صلاحيات الفروع',table:'branch_access',ok:Array.isArray(branches),detail:`${branches.length} فرع متاح للمستخدم`});setRows(out);setRan(new Date().toLocaleString('ar-EG'));setBusy(false)};
 useEffect(()=>{run()},[]);
 const ok=rows.filter(x=>x.ok).length;
 return <div className="space-y-4"><div className="rounded-2xl border border-border bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-text">Runtime QA — فحص جاهزية ERP</h3><p className="mt-1 text-xs text-muted">فحص قراءة آمن للتأكد من وصول الوحدات الأساسية لقاعدة البيانات وصلاحيات الفروع. لا ينشئ أو يعدل بيانات.</p></div><button disabled={busy} onClick={run} className="rounded-xl bg-accent px-4 py-2 text-sm font-black text-on-accent disabled:opacity-50">{busy?'جارٍ الفحص…':'إعادة الفحص'}</button></div>{ran&&<div className="mt-3 text-xs text-muted">آخر فحص: {ran} · ناجح {ok}/{rows.length}</div>}</div>
 <div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right text-sm"><thead className="bg-surface text-xs text-muted"><tr><th className="p-3">الوحدة</th><th className="p-3">المصدر</th><th className="p-3">النتيجة</th><th className="p-3">التفاصيل</th></tr></thead><tbody>{rows.map(r=><tr key={r.table} className="border-t border-border"><td className="p-3 font-bold">{r.label}</td><td className="p-3 font-mono text-xs">{r.table}</td><td className={`p-3 font-black ${r.ok?'text-accent':'text-danger'}`}>{r.ok?'✓ ناجح':'✕ يحتاج مراجعة'}</td><td className="p-3 text-xs text-muted">{r.detail}</td></tr>)}</tbody></table></div></div>
 <div className="rounded-2xl border border-border p-4"><h4 className="font-black">سيناريو الاختبار التشغيلي {APP_VERSION}</h4><p className="mt-2 text-sm leading-7 text-muted">نفّذ على بيانات اختبار: شراء نقدي وآجل → مراجعة المخزون والسيريال → تحويل بين فرعين → بيع نقدي وآجل → مرتجع بيع وشراء → مراجعة الخزائن والمستحقات → جرد وتسوية → مراجعة التقارير وDocument Trace. يجب أن يتطابق الشق المخزني مع الشق المحاسبي في كل مستند.</p></div></div>;
}
