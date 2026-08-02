import {useEffect,useMemo,useRef,useState} from 'react';
import * as XLSX from 'xlsx';
import {supabase} from '../lib/supabase';
import {auditERP} from '../lib/erpAudit';
import {usePermissions} from '../context/PermissionContext';
import {useAllowedBranches} from '../hooks/useAllowedBranches';
import {normProductSearch} from '../lib/productSearch';

const norm=v=>String(v??'').trim();
const pick=(r,names)=>{for(const n of names){const k=Object.keys(r).find(x=>norm(x).toLowerCase()===n.toLowerCase());if(k!=null)return r[k]}return ''};
const I='rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
const blankManual={productId:'',branch:'',quantity:'',serials:'',cost:''};

// تظليل الجزء المطابق من النص بلون مميز
function Highlight({text,q}){
 const s=String(text??'');const t=normProductSearch(q);
 if(!t)return <>{s}</>;
 const i=normProductSearch(s).indexOf(t);
 if(i<0)return <>{s}</>;
 return <>{s.slice(0,i)}<mark className="rounded bg-accent/30 px-0.5 font-black text-accent">{s.slice(i,i+t.length)}</mark>{s.slice(i+t.length)}</>;
}

export default function OpeningStockImportAdmin(){
 const {can}=usePermissions();
 const {branches:allowedBranches}=useAllowedBranches();
 const[products,setProducts]=useState([]),[cats,setCats]=useState([]),[brands,setBrands]=useState([]);
 const[rows,setRows]=useState([]),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 const[m,setM]=useState(blankManual);
 // البحث الذكي + الفلاتر
 const[q,setQ]=useState(''),[focus,setFocus]=useState(false);
 const[catQ,setCatQ]=useState(''),[catFocus,setCatFocus]=useState(false),[catId,setCatId]=useState('');
 const[brandQ,setBrandQ]=useState(''),[brandFocus,setBrandFocus]=useState(false),[brandId,setBrandId]=useState('');
 const boxRef=useRef(null);

 const load=async()=>{
  const [{data:p,error},{data:c},{data:b}]=await Promise.all([
   supabase.from('products').select('id,sku,barcode,name,serial_tracked,purchase_price,is_active,category_id,brand_id,product_categories(name),product_brands(name)').eq('is_active',true).order('name'),
   supabase.from('product_categories').select('id,name').order('name'),
   supabase.from('product_brands').select('id,name').order('name'),
  ]);
  setProducts(p||[]);setCats(c||[]);setBrands(b||[]);if(error)setMsg(error.message);
 };
 useEffect(()=>{load()},[]);

 // ===== فلاتر القسم والعلامة (بحث ذكي مع تلميحات) =====
 const catSug=useMemo(()=>{const t=normProductSearch(catQ);return (t?cats.filter(x=>normProductSearch(x.name).includes(t)):cats).slice(0,10)},[cats,catQ]);
 const brandSug=useMemo(()=>{const t=normProductSearch(brandQ);return (t?brands.filter(x=>normProductSearch(x.name).includes(t)):brands).slice(0,10)},[brands,brandQ]);

 // ===== البحث الذكي للصنف (يحترم الفلاتر) =====
 const pool=useMemo(()=>products.filter(p=>
   (!catId||String(p.category_id)===String(catId))&&
   (!brandId||String(p.brand_id)===String(brandId))
 ),[products,catId,brandId]);
 const suggestions=useMemo(()=>{
  const t=normProductSearch(q);
  const list=t?pool.filter(p=>[p.name,p.sku,p.barcode,p.product_brands?.name,p.product_categories?.name].some(v=>normProductSearch(v).includes(t))):pool;
  return list.slice(0,12);
 },[pool,q]);

 const mProd=useMemo(()=>products.find(p=>String(p.id)===String(m.productId)),[products,m.productId]);
 const mSerials=useMemo(()=>(m.serials||'').split(/[\n,]+/).map(s=>s.trim()).filter(Boolean),[m.serials]);
 const dupSerial=useMemo(()=>{const seen=new Set();for(const s of mSerials){const k=s.toLowerCase();if(seen.has(k))return s;seen.add(k)}return ''},[mSerials]);
 const mQty=mProd?.serial_tracked?mSerials.length:Number(m.quantity||0);

 const chooseProduct=p=>{setM(v=>({...blankManual,branch:v.branch,productId:String(p.id)}));setQ(p.name||p.sku||'');setFocus(false)};

 const postManual=async()=>{
   if(!can('can_erp_stock_opening'))return setMsg('ليس لديك صلاحية المخزون الافتتاحي.');
   if(!mProd)return setMsg('اختر الصنف.');
   if(!m.branch)return setMsg('اختر المخزن/الفرع.');
   if(!(mQty>0))return setMsg(mProd.serial_tracked?'أدخل سريال واحد على الأقل.':'الكمية غير صحيحة.');
   if(mProd.serial_tracked&&dupSerial)return setMsg(`السريال «${dupSerial}» مكرر في القائمة.`);
   setBusy(true);setMsg('');
   try{
     const {data,error}=await supabase.rpc('post_opening_stock',{
       p_product_id:mProd.id,p_branch:m.branch,p_quantity:mQty,
       p_serials:mProd.serial_tracked?mSerials:[],
       p_cost:m.cost===''?(Number(mProd.purchase_price)||0):Number(m.cost),
     });
     if(error)throw error;
     await auditERP('inventory','opening_stock_manual',{entityType:'opening_stock',entityId:data?.ref,documentNumber:data?.ref,details:{product_id:mProd.id,branch:m.branch,units:data?.units}});
     setM(blankManual);setQ('');
     setMsg(`تم ترحيل الرصيد الافتتاحي · ${data?.units??mQty} وحدة${data?.ref?` · ${data.ref}`:''}.`);
   }catch(err){setMsg(err.message)}finally{setBusy(false)}
 };

 // ===== استيراد Excel =====
 const downloadTemplate=()=>{const data=[['كود المنتج *','اسم المنتج','المخزن / الفرع *','الكمية *','Serial / IMEI','تكلفة الوحدة','يتتبع سيريال؟'],...products.map(p=>[p.sku,p.name,'',p.serial_tracked?1:'', '',p.purchase_price??0,p.serial_tracked?'نعم':'لا'])];const ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=[{wch:18},{wch:32},{wch:24},{wch:14},{wch:28},{wch:16},{wch:16}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'المخزون الافتتاحي');XLSX.writeFile(wb,'iShop_Opening_Stock_Template.xlsx')};
 const parse=async e=>{const file=e.target.files?.[0];if(!file)return;setMsg('');try{const wb=XLSX.read(await file.arrayBuffer());const raw=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});const bySku=new Map(products.map(p=>[norm(p.sku).toLowerCase(),p]));const localSerials=new Set();const mapped=raw.map((r,i)=>{const sku=norm(pick(r,['كود المنتج *','كود المنتج','الكود','sku'])),branch=norm(pick(r,['المخزن / الفرع *','المخزن / الفرع','المخزن','الفرع','branch'])),serial=norm(pick(r,['Serial / IMEI','serial','imei','السيريال']));const p=bySku.get(sku.toLowerCase());const qRaw=pick(r,['الكمية *','الكمية','quantity']),qn=Number(qRaw);const cRaw=pick(r,['تكلفة الوحدة','سعر الشراء','unit cost','cost']),cost=cRaw===''?(Number(p?.purchase_price)||0):Number(cRaw);const errors=[];if(!sku)errors.push('الكود مطلوب');if(!p&&sku)errors.push('المنتج غير موجود');if(!branch)errors.push('المخزن/الفرع مطلوب');if(!(qn>0))errors.push('الكمية غير صحيحة');if(p?.serial_tracked){if(qn!==1)errors.push('الصنف المتتبع بالسيريال: الكمية يجب أن تكون 1');if(!serial)errors.push('السيريال مطلوب')}else if(serial)errors.push('هذا الصنف لا يتتبع سيريال');if(serial){const key=serial.toLowerCase();if(localSerials.has(key))errors.push('السيريال مكرر داخل الملف');localSerials.add(key)}if(!(cost>=0))errors.push('التكلفة غير صحيحة');return{_row:i+2,product:p,sku,name:p?.name||norm(pick(r,['اسم المنتج','الاسم'])),branch,quantity:qn,serial,cost,errors}});const serials=mapped.map(x=>x.serial).filter(Boolean);if(serials.length){const{data}=await supabase.from('product_serials').select('serial_number').in('serial_number',serials);const existing=new Set((data||[]).map(x=>norm(x.serial_number).toLowerCase()));mapped.forEach(x=>{if(x.serial&&existing.has(x.serial.toLowerCase()))x.errors.push('السيريال مسجل مسبقًا')})}const ids=[...new Set(mapped.filter(x=>x.product).map(x=>x.product.id))];if(ids.length){const{data}=await supabase.from('product_movements').select('product_id,branch,serial_id').eq('movement_type','opening_balance').in('product_id',ids);const opened=new Set((data||[]).filter(x=>!x.serial_id).map(x=>`${x.product_id}|||${x.branch||''}`));mapped.forEach(x=>{if(x.product&&!x.product.serial_tracked&&opened.has(`${x.product.id}|||${x.branch}`))x.errors.push('تم ترحيل رصيد افتتاحي لهذا الصنف في هذا المخزن سابقًا')})}setRows(mapped);setOpen(true)}catch(err){setMsg('تعذر قراءة الملف: '+err.message)}finally{e.target.value=''}};
 const post=async()=>{if(!can('can_erp_stock_opening'))return setMsg('ليس لديك صلاحية المخزون الافتتاحي.');const good=rows.filter(x=>!x.errors.length);if(!good.length)return setMsg('لا توجد صفوف جاهزة للترحيل.');if(rows.some(x=>x.errors.length))return setMsg('صحح أخطاء الملف أولًا؛ لن يتم الترحيل الجزئي للمخزون الافتتاحي.');setBusy(true);setMsg('');try{const ref=`OPEN-${Date.now()}`;for(const x of good){let serialId=null;if(x.product.serial_tracked){const{data:s,error:se}=await supabase.from('product_serials').insert({product_id:x.product.id,serial_number:x.serial,status:'available'}).select('id').single();if(se)throw se;serialId=s.id}const{error}=await supabase.from('product_movements').insert({product_id:x.product.id,serial_id:serialId,movement_type:'opening_balance',quantity:x.quantity,reference_type:'opening_stock_import',reference_id:ref,branch:x.branch,notes:`رصيد افتتاحي · تكلفة ${x.cost}`});if(error)throw error}await auditERP('inventory','opening_stock_import',{entityType:'opening_stock_import',entityId:ref,documentNumber:ref,details:{rows:good.length,total_quantity:good.reduce((s,x)=>s+x.quantity,0)}});setOpen(false);setRows([]);setMsg(`تم ترحيل المخزون الافتتاحي بنجاح · ${good.length} صف.`)}catch(err){setMsg(err.message)}finally{setBusy(false)}};
 const stats=useMemo(()=>({ok:rows.filter(x=>!x.errors.length).length,bad:rows.filter(x=>x.errors.length).length,qty:rows.filter(x=>!x.errors.length).reduce((s,x)=>s+x.quantity,0)}),[rows]);

 return <div className="space-y-4">
  <div className="rounded-2xl border border-border p-4">
   <h3 className="font-black">إضافة رصيد افتتاحي (يدوي)</h3>
   <p className="mt-1 text-xs leading-6 text-muted">ابحث بالاسم أو الكود أو الباركود. الأصناف المتتبعة بالسيريال: أدخل سريال لكل قطعة والكمية تُحسب تلقائيًا.</p>

   {/* فلاتر القسم والعلامة التجارية */}
   <div className="mt-4 grid gap-3 md:grid-cols-2">
    <div className="relative">
     <label className="mb-1 block text-xs font-black text-muted">القسم</label>
     <input className={`${I} w-full`} value={catQ} placeholder="كل الأقسام — ابحث للتصفية"
       onChange={e=>{setCatQ(e.target.value);setCatId('');setCatFocus(true)}}
       onFocus={()=>setCatFocus(true)} onBlur={()=>setTimeout(()=>setCatFocus(false),150)} autoComplete="off"/>
     {catId&&<button type="button" onClick={()=>{setCatId('');setCatQ('')}} className="absolute left-2 top-8 text-xs font-black text-danger">✕</button>}
     {catFocus&&<div className="absolute z-[130] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card shadow-2xl">
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{setCatId('');setCatQ('');setCatFocus(false)}} className="block w-full border-b border-border px-3 py-2 text-right text-xs font-black text-muted hover:bg-surface">كل الأقسام</button>
      {catSug.map(c=><button type="button" key={c.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{setCatId(String(c.id));setCatQ(c.name);setCatFocus(false)}} className="block w-full border-b border-border px-3 py-2 text-right text-sm last:border-0 hover:bg-surface"><Highlight text={c.name} q={catQ}/></button>)}
      {!catSug.length&&<div className="p-3 text-xs text-muted">لا توجد أقسام مطابقة.</div>}
     </div>}
    </div>

    <div className="relative">
     <label className="mb-1 block text-xs font-black text-muted">العلامة التجارية</label>
     <input className={`${I} w-full`} value={brandQ} placeholder="كل العلامات — ابحث للتصفية"
       onChange={e=>{setBrandQ(e.target.value);setBrandId('');setBrandFocus(true)}}
       onFocus={()=>setBrandFocus(true)} onBlur={()=>setTimeout(()=>setBrandFocus(false),150)} autoComplete="off"/>
     {brandId&&<button type="button" onClick={()=>{setBrandId('');setBrandQ('')}} className="absolute left-2 top-8 text-xs font-black text-danger">✕</button>}
     {brandFocus&&<div className="absolute z-[130] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card shadow-2xl">
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{setBrandId('');setBrandQ('');setBrandFocus(false)}} className="block w-full border-b border-border px-3 py-2 text-right text-xs font-black text-muted hover:bg-surface">كل العلامات</button>
      {brandSug.map(b=><button type="button" key={b.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{setBrandId(String(b.id));setBrandQ(b.name);setBrandFocus(false)}} className="block w-full border-b border-border px-3 py-2 text-right text-sm last:border-0 hover:bg-surface"><Highlight text={b.name} q={brandQ}/></button>)}
      {!brandSug.length&&<div className="p-3 text-xs text-muted">لا توجد علامات مطابقة.</div>}
     </div>}
    </div>
   </div>

   {/* بحث ذكي للصنف */}
   <div className="relative mt-3" ref={boxRef}>
    <label className="mb-1 block text-xs font-black text-muted">الصنف * <span className="text-muted">({pool.length} صنف متاح)</span></label>
    <input className={`${I} w-full`} value={q} placeholder="ابحث بالاسم / الكود / الباركود"
      onChange={e=>{setQ(e.target.value);setM(v=>({...v,productId:''}));setFocus(true)}}
      onFocus={()=>setFocus(true)} onBlur={()=>setTimeout(()=>setFocus(false),150)} autoComplete="off"
      onKeyDown={e=>{if(e.key==='Enter'&&suggestions.length===1){e.preventDefault();chooseProduct(suggestions[0])}}}/>
    {mProd&&<span className="absolute left-2 top-8 text-[10px] font-black text-accent">✓ محدد</span>}
    {focus&&<div className="absolute z-[140] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card shadow-2xl">
     {suggestions.map(p=><button type="button" key={p.id} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseProduct(p)} className="block w-full border-b border-border px-3 py-2.5 text-right last:border-0 hover:bg-surface">
      <b className="block text-sm text-text"><Highlight text={p.name} q={q}/></b>
      <span className="text-[11px] text-muted"><Highlight text={p.sku||'بدون SKU'} q={q}/>{p.barcode?<> · <Highlight text={p.barcode} q={q}/></>:''}</span>
      <span className="mt-1 flex flex-wrap gap-2 text-[10px] font-black">
       {p.product_categories?.name&&<span className="rounded-full bg-surface px-2 py-0.5 text-muted">{p.product_categories.name}</span>}
       {p.product_brands?.name&&<span className="rounded-full bg-surface px-2 py-0.5 text-muted">{p.product_brands.name}</span>}
       {p.serial_tracked&&<span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">سيريال</span>}
      </span>
     </button>)}
     {!suggestions.length&&<div className="p-3 text-xs text-muted">لا توجد أصناف مطابقة.</div>}
    </div>}
   </div>

   <div className="mt-3 grid gap-3 md:grid-cols-2">
    <select className={I} value={m.branch} onChange={e=>setM(v=>({...v,branch:e.target.value}))}>
     <option value="">اختر المخزن/الفرع *</option>
     {allowedBranches.map(b=><option key={b} value={b}>{b}</option>)}
    </select>
    {mProd?.serial_tracked
     ? <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-bold">الكمية = عدد السريالات: <span className="text-accent">{mSerials.length}</span></div>
     : <input className={I} type="number" min="0" step="0.001" placeholder="الكمية *" value={m.quantity} onChange={e=>setM(v=>({...v,quantity:e.target.value}))}/>}
    <input className={I} type="number" min="0" step="0.01" placeholder={`تكلفة الوحدة${mProd?` (افتراضي ${mProd.purchase_price??0})`:''}`} value={m.cost} onChange={e=>setM(v=>({...v,cost:e.target.value}))}/>
   </div>

   {mProd?.serial_tracked&&<div className="mt-3">
    <div className="mb-1 flex items-center justify-between text-xs font-bold">
     <span>السريالات / IMEI — سريال لكل قطعة</span>
     <span className={dupSerial?'text-danger':'text-muted'}>{dupSerial?`مكرر: ${dupSerial}`:`${mSerials.length} سريال`}</span>
    </div>
    <textarea className={`${I} min-h-28 w-full font-mono`} placeholder={"مثال:\n356938035643809\n356938035643810"} value={m.serials} onChange={e=>setM(v=>({...v,serials:e.target.value}))}/>
   </div>}

   <button disabled={busy} onClick={postManual} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-black text-on-accent disabled:opacity-50">{busy?'جارٍ الترحيل…':'ترحيل الرصيد الافتتاحي'}</button>
   {msg&&<p className="mt-3 text-sm font-bold text-accent">{msg}</p>}
  </div>

  <div className="rounded-2xl border border-border p-4"><h3 className="font-black">استيراد المخزون الافتتاحي (Excel)</h3><p className="mt-2 text-sm leading-7 text-muted">يدعم نفس الصنف في أكثر من مخزن، والأصناف بدون سيريال بأي كمية، والأصناف المتتبعة بالسيريال بصف مستقل لكل Serial / IMEI وكمية 1.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={downloadTemplate} className="rounded-xl border border-accent-line px-4 py-2.5 text-sm font-black text-accent">تحميل قالب المخزون الذكي</button><label className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-black text-on-accent">استيراد الملف المحدث<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={parse}/></label></div></div>
  {open&&<div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"><div className="max-h-[90vh] w-full max-w-7xl overflow-auto rounded-2xl border border-border bg-bg p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">معاينة المخزون الافتتاحي</h3><p className="mt-1 text-xs text-muted">جاهز {stats.ok} · أخطاء {stats.bad} · كمية جاهزة {stats.qty}</p></div><button className="text-2xl" onClick={()=>setOpen(false)}>×</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1000px] text-right text-xs"><thead><tr className="border-b border-border text-muted"><th className="p-2">#</th><th>الكود</th><th>الصنف</th><th>المخزن</th><th>الكمية</th><th>Serial / IMEI</th><th>التكلفة</th><th>الحالة</th></tr></thead><tbody>{rows.map(r=><tr key={r._row} className="border-b border-border"><td className="p-2">{r._row}</td><td className="font-bold text-accent">{r.sku||'—'}</td><td>{r.name||'—'}</td><td>{r.branch||'—'}</td><td>{r.quantity||'—'}</td><td>{r.serial||'—'}</td><td>{Number.isFinite(r.cost)?r.cost:'—'}</td><td className={r.errors.length?'text-danger':'text-green-500'}>{r.errors.length?r.errors.join('، '):'جاهز ✓'}</td></tr>)}</tbody></table></div><div className="mt-4 flex gap-2"><button disabled={busy||stats.bad>0||!stats.ok} onClick={post} className="rounded-xl bg-accent px-5 py-2.5 font-black text-on-accent disabled:opacity-50">{busy?'جارٍ الترحيل…':'ترحيل المخزون الافتتاحي'}</button><button onClick={()=>setOpen(false)} className="rounded-xl border border-border px-4">إلغاء</button></div></div></div>}
 </div>;
}
