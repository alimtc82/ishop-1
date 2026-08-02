import {useEffect,useState} from 'react';
import * as XLSX from 'xlsx';
import {supabase} from '../lib/supabase';
import {publicMediaUrl,uploadMedia} from '../lib/productMedia';
import {usePermissions} from '../context/PermissionContext';
import Button from './ui/Button';

export default function ProductLookupAdmin({table,title,symbol=false}){
  const {can}=usePermissions();
  const [rows,setRows]=useState([]),[name,setName]=useState(''),[sym,setSym]=useState(''),[image,setImage]=useState(''),[editId,setEditId]=useState(null),[uploading,setUploading]=useState(false),[saving,setSaving]=useState(false),[deleting,setDeleting]=useState(null),[importing,setImporting]=useState(false),[msg,setMsg]=useState(''),[isError,setIsError]=useState(false);
  const category=table==='product_categories';
  const canCreate=can('can_erp_product_create'),canEdit=can('can_erp_product_edit');

  const load=async()=>{
    const {data,error}=await supabase.from(table).select('*').order('name');
    if(error){setIsError(true);setMsg(`تعذر تحميل ${title}: ${error.message}`);return;}
    setRows(data||[]);
  };
  useEffect(()=>{setMsg('');setEditId(null);setName('');setSym('');setImage('');load()},[table]);

  const pick=async e=>{
    const f=e.target.files?.[0]; if(!f)return;
    setUploading(true);setMsg('');setIsError(false);
    try{setImage(await uploadMedia('category-images',f,'categories'));setMsg(`تم رفع الصورة، اضغط ${editId?'حفظ التعديل':'إضافة'} لتثبيتها.`);}
    catch(err){setIsError(true);setMsg(`تعذر رفع الصورة: ${err.message}`);}
    finally{setUploading(false);e.target.value='';}
  };

  const beginEdit=r=>{
    if(!canEdit){setIsError(true);setMsg(`ليس لديك صلاحية تعديل ${title}.`);return;}
    setEditId(r.id);setName(r.name||'');setSym(r.symbol||'');setImage(category?(r.image_path||''):'');setMsg('');setIsError(false);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const cancelEdit=()=>{setEditId(null);setName('');setSym('');setImage('');setMsg('');setIsError(false)};

  const save=async e=>{
    e.preventDefault();
    const allowed=editId?canEdit:canCreate;
    if(!allowed){setIsError(true);setMsg(`ليس لديك صلاحية ${editId?'تعديل':'إضافة'} ${title}.`);return;}
    if(!name.trim()){setIsError(true);setMsg(`اسم ${title} مطلوب.`);return;}
    if(uploading||saving)return;
    setSaving(true);setMsg('');setIsError(false);
    try{
      const payload=symbol?{name:name.trim(),symbol:sym.trim()||null}:category?{name:name.trim(),image_path:image||null}:{name:name.trim()};
      const q=editId?supabase.from(table).update(payload).eq('id',editId):supabase.from(table).insert(payload);
      const {error}=await q;if(error)throw error;
      const wasEdit=!!editId;setEditId(null);setName('');setSym('');setImage('');await load();
      setMsg(`تم ${wasEdit?'تعديل':'إنشاء'} ${title} بنجاح.`);
    }catch(err){setIsError(true);setMsg(`تعذر ${editId?'تعديل':'إنشاء'} ${title}: ${err.message}`);}
    finally{setSaving(false);}
  };

  const remove=async r=>{
    if(!canEdit){setIsError(true);setMsg(`ليس لديك صلاحية حذف ${title}.`);return;}
    if(!confirm(`هل تريد حذف ${title} "${r.name}"؟\nلن يتم الحذف إذا كان مرتبطًا بمنتجات أو بيانات أخرى تحميها قاعدة البيانات.`))return;
    setDeleting(r.id);setMsg('');setIsError(false);
    try{
      const {error}=await supabase.from(table).delete().eq('id',r.id);if(error)throw error;
      if(editId===r.id)cancelEdit();await load();setMsg(`تم حذف ${title} بنجاح.`);
    }catch(err){
      setIsError(true);
      const linked=/foreign key|violates|constraint|referenced/i.test(String(err.message||''));
      setMsg(linked?`لا يمكن حذف ${title} لأنه مرتبط بمنتجات أو بيانات أخرى. يمكنك تعديله بدلًا من الحذف.`:`تعذر حذف ${title}: ${err.message}`);
    }finally{setDeleting(null);}
  };

  const normalize=v=>String(v??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
  const downloadTemplate=()=>{
    const headers=symbol?['الاسم *','الرمز']:['الاسم *'];
    const sample=symbol?['قطعة','PCS']:['Apple'];
    const ws=XLSX.utils.aoa_to_sheet([headers,sample]);ws['!cols']=headers.map(()=>({wch:28}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,title);
    XLSX.writeFile(wb,`iShop_${table}_Template.xlsx`);
  };
  const importFile=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!canCreate){setIsError(true);setMsg(`ليس لديك صلاحية إضافة ${title}.`);e.target.value='';return;}
    setImporting(true);setMsg('');setIsError(false);
    try{
      const wb=XLSX.read(await file.arrayBuffer());
      const raw=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
      const val=(r,keys)=>{for(const k of keys)if(r[k]!==undefined)return String(r[k]).trim();return''};
      const parsed=raw.map(r=>({name:val(r,['الاسم','الاسم *','name','Name']),symbol:symbol?val(r,['الرمز','symbol','Symbol']):''})).filter(x=>x.name);
      if(!parsed.length)throw Error('لا توجد صفوف صالحة للاستيراد.');
      const existing=new Set(rows.map(r=>normalize(r.name)));
      const seen=new Set(),unique=[];let duplicateFile=0,duplicateSystem=0;
      for(const x of parsed){
        const key=normalize(x.name);
        if(seen.has(key)){duplicateFile++;continue}
        seen.add(key);
        if(existing.has(key)){duplicateSystem++;continue}
        unique.push(symbol?{name:x.name,symbol:x.symbol||null}:{name:x.name});
      }
      if(unique.length){const{error}=await supabase.from(table).insert(unique);if(error)throw error;await load();}
      setMsg(`تمت قراءة ${parsed.length} صف. تمت إضافة ${unique.length} ${title}${unique.length===1?'':'/عناصر'}، وتم تجاهل ${duplicateSystem+duplicateFile} مكرر (${duplicateSystem} موجود بالنظام + ${duplicateFile} مكرر داخل الملف).`);
    }catch(err){setIsError(true);setMsg(`فشل استيراد ${title}: ${err.message}`);}
    finally{setImporting(false);e.target.value='';}
  };

  return <div className="max-w-3xl">
    <div className="mb-4 flex flex-wrap gap-2">
      <button type="button" onClick={downloadTemplate} className="rounded-xl border border-accent-line px-3 py-2 text-xs font-black text-accent">تحميل قالب Excel</button>
      <label className={`rounded-xl bg-accent px-3 py-2 text-xs font-black text-black ${importing||!canCreate?'cursor-not-allowed opacity-50':'cursor-pointer'}`}>{importing?'جارٍ الاستيراد…':'استيراد Excel'}<input hidden disabled={importing||!canCreate} type="file" accept=".xlsx,.xls,.csv" onChange={importFile}/></label>
    </div>

    <form onSubmit={save} className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><b>{editId?`تعديل ${title}`:`إضافة ${title}`}</b>{editId&&<button type="button" onClick={cancelEdit} className="text-xs font-bold text-muted">إلغاء التعديل</button>}</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="flex gap-2"><input className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-text" placeholder={`اسم ${title}`} value={name} onChange={e=>setName(e.target.value)}/>{symbol&&<input className="w-28 rounded-xl border border-border bg-surface px-3 py-2 text-text" placeholder="الرمز" value={sym} onChange={e=>setSym(e.target.value)}/>}</div>
        {category&&<div className="flex items-center gap-2">{image&&<img src={publicMediaUrl('category-images',image)} className="size-12 rounded-xl border border-border object-cover" alt="معاينة"/>}<label className={`flex-1 rounded-xl border border-dashed border-accent-line px-4 py-2 text-center text-sm font-bold text-accent ${uploading||!(editId?canEdit:canCreate)?'cursor-not-allowed opacity-50':'cursor-pointer'}`}>{uploading?'جارٍ رفع الصورة…':image?'تغيير الصورة':'إضافة صورة'}<input hidden disabled={uploading||saving||!(editId?canEdit:canCreate)} type="file" accept="image/*" onChange={pick}/></label>{image&&<button type="button" onClick={()=>setImage('')} className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400">إزالة</button>}</div>}
        <Button type="submit" loading={saving} disabled={uploading||!(editId?canEdit:canCreate)}>{saving?'جارٍ الحفظ…':editId?'حفظ التعديل':'إضافة'}</Button>
      </div>
    </form>

    {msg&&<div className={`mb-4 rounded-xl border px-3 py-2 text-sm font-bold ${isError?'border-red-500/30 bg-red-500/10 text-red-400':'border-accent-line bg-accent-soft text-accent'}`}>{msg}</div>}

    <div className="overflow-hidden rounded-2xl border border-border">
      {rows.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 last:border-0">
        <div className="flex min-w-0 items-center gap-3">{category&&<div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface">{r.image_path?<img src={publicMediaUrl('category-images',r.image_path)} className="size-full object-cover" alt={r.name}/>:<span className="text-lg">▦</span>}</div>}<div className="min-w-0"><b className="block truncate">{r.name}</b><span className="text-xs text-muted">{r.symbol||''} {r.symbol?'· ':''}{r.is_active===false?'موقوف':'نشط'}</span></div></div>
        <div className="flex gap-2"><button type="button" onClick={()=>beginEdit(r)} disabled={!canEdit} className="rounded-lg border border-accent-line px-3 py-2 text-xs font-black text-accent disabled:opacity-40">تعديل</button><button type="button" onClick={()=>remove(r)} disabled={!canEdit||deleting===r.id} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-black text-red-400 disabled:opacity-40">{deleting===r.id?'جارٍ الحذف…':'حذف'}</button></div>
      </div>)}
      {!rows.length&&<div className="p-6 text-center text-sm text-muted">لا توجد بيانات.</div>}
    </div>
  </div>;
}
