import {useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {usePermissions} from '../context/PermissionContext';

const OPTIONS=[
 ['transactions','حذف الحركات التجريبية فقط','فواتير البيع والشراء والمرتجعات وحركات المخزون والمالية والمصروفات والمستحقات والسريلات.'],
 ['business','تصفير بيانات ERP التشغيلية','كل ما سبق + المنتجات والعملاء والموردين وبيانات الأصناف.'],
];

export default function ERPResetAdmin(){
 const{can}=usePermissions();const[mode,setMode]=useState('transactions'),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const phrase=useMemo(()=>mode==='business'?'RESET ERP':'RESET TRANSACTIONS',[mode]);
 const run=async()=>{if(!can('can_erp_reset'))return setMsg('ليس لديك صلاحية إعادة ضبط ERP.');if(confirm!==phrase)return setMsg(`اكتب ${phrase} حرفيًا للتأكيد.`);if(!window.confirm('تحذير: الحذف نهائي. هل تم تنزيل نسخة احتياطية حديثة؟'))return;setBusy(true);setMsg('');try{const{data,error}=await supabase.rpc('erp_reset_business_data',{p_mode:mode,p_confirmation:phrase});if(error)throw error;setMsg(`تمت إعادة الضبط بنجاح. ${data?.message||''}`);setConfirm('')}catch(e){setMsg(e.message)}finally{setBusy(false)}};
 return <div className="space-y-5">
  <div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-black text-text">إعادة ضبط بيانات ERP</h3><p className="mt-2 text-sm leading-7 text-muted">مخصصة لمسح بيانات التجارب قبل التشغيل الفعلي. لا تحذف المستخدمين أو الأدوار أو الصلاحيات أو الفروع أو إعدادات النظام، ولا تمس بيانات نظام الأجهزة المستعملة.</p></div>
  <div className="rounded-2xl border border-red-500/30 bg-card p-5">
   <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-bold">قبل التنفيذ: افتح «النسخ الاحتياطي» ونزّل نسخة JSON حديثة. إعادة الضبط لا يمكن التراجع عنها من هذه الشاشة.</div>
   <div className="grid gap-3">{OPTIONS.map(([v,title,desc])=><label key={v} className="flex cursor-pointer gap-3 rounded-xl border border-border p-4"><input type="radio" checked={mode===v} onChange={()=>{setMode(v);setConfirm('');setMsg('')}}/><span><b className="block text-text">{title}</b><small className="mt-1 block leading-6 text-muted">{desc}</small></span></label>)}</div>
   <label className="mt-5 block text-sm font-black text-text">تأكيد العملية</label><p className="mt-1 text-xs text-muted">اكتب <b>{phrase}</b> للمتابعة.</p>
   <input value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off" className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-left font-mono text-sm text-text" dir="ltr"/>
   <button onClick={run} disabled={busy||!can('can_erp_reset')||confirm!==phrase} className="mt-4 w-full rounded-xl bg-red-600 px-5 py-3 font-black text-white disabled:opacity-40">{busy?'جارٍ إعادة الضبط…':'تنفيذ إعادة الضبط'}</button>
   {msg&&<p className="mt-3 text-sm font-bold text-accent">{msg}</p>}
  </div>
 </div>
}
