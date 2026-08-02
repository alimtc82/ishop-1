import {useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {usePermissions} from '../context/PermissionContext';

const OPTIONS=[
 ['transactions','حذف الحركات التجريبية فقط','فواتير البيع والشراء والمرتجعات وحركات المخزون والمالية والمصروفات والمستحقات والسريلات.'],
 ['business','تصفير بيانات ERP التشغيلية','كل ما سبق + المنتجات والعملاء والموردين وبيانات الأصناف + صور المنتجات من Storage.'],
];

export default function ERPResetAdmin(){
 const{can}=usePermissions();const[mode,setMode]=useState('transactions'),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[purge,setPurge]=useState(null),[purgeBusy,setPurgeBusy]=useState(false);
 const phrase=useMemo(()=>mode==='business'?'RESET ERP':'RESET TRANSACTIONS',[mode]);
 const clearProductImages=async()=>{
  const bucket=supabase.storage.from('product-images');let offset=0;const names=[];
  for(let page=0;page<100;page++){const{data,error}=await bucket.list('',{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw error;if(!data?.length)break;names.push(...data.filter(x=>x.name&&x.id).map(x=>x.name));if(data.length<100)break;offset+=100}
  for(let i=0;i<names.length;i+=100){const{error}=await bucket.remove(names.slice(i,i+100));if(error)throw error}
  return names.length;
 };
 const previewPurge=async()=>{if(!can('can_erp_reset'))return setMsg('ليس لديك صلاحية إعادة ضبط ERP.');setPurgeBusy(true);setMsg('');try{const{data,error}=await supabase.rpc('erp_unused_products_purge',{p_execute:false,p_confirmation:''});if(error)throw error;setPurge(data)}catch(e){setMsg(e.message)}finally{setPurgeBusy(false)}};
 const executePurge=async()=>{if(!purge?.deletable_products)return;if(!window.confirm(`سيتم حذف ${purge.deletable_products} صنف نهائيًا. الأصناف ذات الحركات التاريخية محمية. هل تريد المتابعة؟`))return;const phrase=window.prompt('للتأكيد اكتب DELETE UNUSED PRODUCTS');if(phrase!=='DELETE UNUSED PRODUCTS')return setMsg('تم إلغاء العملية: عبارة التأكيد غير صحيحة.');setPurgeBusy(true);setMsg('');try{const{data,error}=await supabase.rpc('erp_unused_products_purge',{p_execute:true,p_confirmation:phrase});if(error)throw error;setPurge(data);setMsg(`تم حذف ${data?.deleted_products||0} صنف غير مستخدم حذفًا نهائيًا. الأصناف المرتبطة بحركات لم يتم لمسها.`)}catch(e){setMsg(e.message)}finally{setPurgeBusy(false)}};
 const run=async()=>{if(!can('can_erp_reset'))return setMsg('ليس لديك صلاحية إعادة ضبط ERP.');if(confirm!==phrase)return setMsg(`اكتب ${phrase} حرفيًا للتأكيد.`);if(!window.confirm('تحذير: الحذف نهائي. هل تم تنزيل نسخة احتياطية حديثة؟'))return;setBusy(true);setMsg('');try{let imageCount=0;if(mode==='business')imageCount=await clearProductImages();const{data,error}=await supabase.rpc('erp_reset_business_data',{p_mode:mode,p_confirmation:phrase});if(error)throw error;setMsg(`تمت إعادة الضبط بنجاح. ${data?.message||''}${mode==='business'?` تم حذف ${imageCount} ملف من صور المنتجات.`:''}`);setConfirm('')}catch(e){setMsg('فشلت إعادة الضبط: '+(e?.message||e))}finally{setBusy(false)}};
 return <div className="space-y-5">
  <div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-black text-text">إعادة ضبط بيانات ERP</h3><p className="mt-2 text-sm leading-7 text-muted">مخصصة لمسح بيانات التجارب قبل التشغيل الفعلي. لا تحذف المستخدمين أو الأدوار أو الصلاحيات أو الفروع أو إعدادات النظام، ولا تمس بيانات نظام الأجهزة المستعملة.</p></div>
  <div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-black text-text">تنظيف الأصناف غير المستخدمة</h3><p className="mt-2 text-sm leading-7 text-muted">يحذف حذفًا نهائيًا الأصناف التي لم تدخل في أي مبيعات أو مشتريات أو مرتجعات أو حركات مخزون أو تحويلات أو جرد أو تسويات أو أوامر شراء أو سيريالات أو ضمانات. الأصناف ذات أي مرجع تاريخي محمية ولا يمكن حذفها بهذا الخيار.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={previewPurge} disabled={purgeBusy||!can('can_erp_reset')} className="rounded-xl border border-border px-4 py-2 text-sm font-black disabled:opacity-40">{purgeBusy?'جارٍ الفحص…':'معاينة بدون حذف'}</button>{purge&&<button type="button" onClick={executePurge} disabled={purgeBusy||!purge.deletable_products} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">حذف الأصناف غير المستخدمة نهائيًا</button>}</div>{purge&&<div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface p-3"><small className="block text-muted">إجمالي الأصناف</small><b>{purge.total_products}</b></div><div className="rounded-xl bg-surface p-3"><small className="block text-muted">محمي بحركات</small><b>{purge.protected_products}</b></div><div className="rounded-xl bg-surface p-3"><small className="block text-muted">قابل للحذف</small><b>{purge.deletable_products}</b></div></div>}</div>
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
