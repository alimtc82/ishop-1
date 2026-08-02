import { useCallback,useEffect,useRef,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemePanel';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import { fetchDevices,deviceImageUrl } from '../lib/api';
import { supabase } from '../lib/supabase';
import { publicMediaUrl } from '../lib/productMedia';
import { productMatches } from '../lib/productSearch';

const TAPS_NEEDED=3,TAP_WINDOW=2000;
function useSecretTaps(onUnlock){const count=useRef(0),timer=useRef(null);return useCallback(()=>{clearTimeout(timer.current);count.current+=1;if(count.current>=TAPS_NEEDED){count.current=0;onUnlock();return}timer.current=setTimeout(()=>count.current=0,TAP_WINDOW)},[onUnlock])}

function SectionTitle({title,sub,action}){return <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-black md:text-2xl">{title}</h2>{sub&&<p className="mt-1 text-xs text-muted md:text-sm">{sub}</p>}</div>{action}</div>}

// شريط ملاحة واحد — نفس الوجهات تظهر في الهيدر (ديسكتوب) والشريط السفلي (موبايل)
const NAV=[
 {label:'الرئيسية',href:'#home',glyph:'🏠'},
 {label:'الأقسام',href:'#categories',glyph:'▦'},
 {label:'المنتجات',href:'#products',glyph:'🛍️'},
 {label:'المستعمل',to:'/used',glyph:'📱'},
 {label:'تواصل معنا',href:'#contact',glyph:'🎧'},
];

export default function Landing({onStaffLogin}){
 const navigate=useNavigate(),onLogoTap=useSecretTaps(onStaffLogin);
 const {enterGuest}=useAuth();
 const [products,setProducts]=useState([]),[searchProducts,setSearchProducts]=useState([]),[stockMovements,setStockMovements]=useState([]),[recentProducts,setRecentProducts]=useState([]),[cats,setCats]=useState([]),[used,setUsed]=useState([]);
 const [search,setSearch]=useState(''),[searchOpen,setSearchOpen]=useState(false);
 useEffect(()=>{Promise.all([
  supabase.from('products').select('id,sku,barcode,name,images,category_id,brand_id,sale_price,created_at,product_brands(name)').eq('is_active',true),
  supabase.from('product_categories').select('id,name,image_path').eq('is_active',true).order('id',{ascending:false}),
  fetchDevices({guest:true}),
  supabase.from('storefront_positive_stock').select('product_id,available_stock'),
  supabase.from('product_movements').select('product_id,movement_type,quantity,branch,created_at')
 ]).then(([p,c,d,sv,m])=>{
  const all=p.data||[],publicStock=sv.data||[],movements=m.data||[];
  const stockMap=new Map(publicStock.map(x=>[String(x.product_id),Number(x.available_stock||0)]));
  setStockMovements(movements);
  // Storefront ERP products are driven by the public aggregate-stock view, never by raw movement visibility.
  const stocked=all.filter(x=>Number(stockMap.get(String(x.id))||0)>0);
  setSearchProducts(stocked);setProducts(stocked);
  const ins=new Map();for(const mv of movements){if(['purchase','transfer_in','adjustment_in','opening','opening_stock','opening_balance'].includes(String(mv.movement_type||'').toLowerCase())){const k=String(mv.product_id),v=String(mv.created_at||'');if(v>(ins.get(k)||''))ins.set(k,v)}}
  setRecentProducts([...stocked].sort((a,b)=>(ins.get(String(b.id))||String(b.created_at||'')).localeCompare(ins.get(String(a.id))||String(a.created_at||''))).slice(0,8));
  setCats((c.data||[]).sort((a,b)=>Number(Boolean(b.image_path))-Number(Boolean(a.image_path))).slice(0,8));setUsed(d||[]);
 }).catch(()=>{})},[]);
 const goUsed=()=>navigate('/used');
 const q=search.trim().toLocaleLowerCase('ar-EG');
 const searchResults=q?[
  ...searchProducts.filter(p=>productMatches(p,q)).slice(0,7).map(p=>({key:`p-${p.id}`,kind:'منتج',title:p.name,sub:[p.product_brands?.name,p.sku,p.barcode,`سعر البيع: ${Number(p.sale_price||0).toLocaleString()}`].filter(Boolean).join(' · '),go:()=>navigate(`/product/${p.id}`)})),
  ...used.filter(r=>[r.model,r.storage,r.color,r.device_code,r.brand].some(v=>String(v||'').toLocaleLowerCase('ar-EG').includes(q))).slice(0,7).map(r=>({key:`u-${r.id||r.device_code}`,kind:'مستعمل',title:r.model||'جهاز مستعمل',sub:[r.storage,r.color,r.device_code&&`#${r.device_code}`].filter(Boolean).join(' · '),go:async()=>{await enterGuest();navigate(`/d/${encodeURIComponent(r.device_code||r.id)}`)}})),
  ...([
   {title:'الضمان وما بعد البيع',sub:'خدمة الضمان ومتابعة حالة الضمان',go:()=>navigate('/warranty')},
   {title:'الدعم وخدمة ما بعد البيع',sub:'تواصل مع فريق MTC Group',go:()=>{location.hash='contact'}},
   {title:'الآراء والتقييمات',sub:'تقييمات وتجارب العملاء',go:()=>navigate('/reviews')},
  ].filter(x=>`${x.title} ${x.sub}`.toLocaleLowerCase('ar-EG').includes(q)).map((x,i)=>({...x,key:`s-${i}`,kind:'خدمة'})))
 ].slice(0,12):[];
 const chooseSearch=async r=>{setSearchOpen(false);setSearch('');await r.go()};

 return <div className="relative z-1 min-h-screen">
  <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
   <div className="mx-auto max-w-7xl px-4">
    <div className="flex min-h-16 items-center gap-2 py-2">
     <button onClick={onLogoTap} className="shrink-0 text-2xl font-black text-accent" aria-label="iShop">i<span className="text-text">Shop</span></button>
     <div className="relative min-w-0 flex-1 md:max-w-md">
      <div className="flex items-center rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
       <Icon name="search" size={17}/>
       <input value={search} onChange={e=>{setSearch(e.target.value);setSearchOpen(true)}} onFocus={()=>setSearchOpen(true)} onKeyDown={e=>{if(e.key==='Enter'&&searchResults[0])chooseSearch(searchResults[0])}} className="min-w-0 w-full bg-transparent px-2.5 py-2.5 text-[12px] outline-none sm:text-sm" placeholder="ابحث عن منتج، خدمة أو جهاز مستعمل..." autoComplete="off"/>
      </div>
      {searchOpen&&q&&<div className="absolute inset-x-0 top-full z-[80] mt-1 max-h-[60vh] overflow-auto rounded-xl border border-border bg-card shadow-2xl">
       {searchResults.length?searchResults.map(r=><button key={r.key} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>chooseSearch(r)} className="flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-start last:border-0 hover:bg-surface">
        <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-black ${r.kind==='مستعمل'?'bg-accent text-on-accent':r.kind==='خدمة'?'bg-surface text-muted':'bg-accent-soft text-accent'}`}>{r.kind}</span>
        <span className="min-w-0"><b className="block truncate text-xs">{r.title}</b>{r.sub&&<small className="block truncate text-[10px] text-muted">{r.sub}</small>}</span>
       </button>):<div className="p-3 text-xs text-muted">لا توجد نتائج مطابقة.</div>}
      </div>}
     </div>
     <div className="flex shrink-0 items-center gap-1.5"><ThemeToggle/><button className="grid size-10 place-items-center rounded-xl border border-border bg-surface" aria-label="السلة">🛒</button></div>
    </div>
    <nav className="flex items-center gap-1 overflow-x-auto border-t border-border py-2 md:justify-center md:border-t-0 md:py-0 md:absolute md:end-4 md:top-4 md:hidden">
     {NAV.map(n=>n.to?<button key={n.label} onClick={()=>navigate(n.to)} className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] font-black text-muted">{n.glyph} {n.label}</button>:<a key={n.label} href={n.href} className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] font-black text-muted">{n.glyph} {n.label}</a>)}
    </nav>
   </div>
  </header>

  <main id="home" className="mx-auto max-w-7xl px-4 pb-8">
   <section className="relative my-5 overflow-hidden rounded-[28px] border border-border bg-card md:my-8"><div className="md:grid md:min-h-[360px] md:grid-cols-2 md:items-center"><div className="relative z-10 p-7 md:p-12"><h1 className="text-4xl font-black leading-tight md:text-6xl">كل احتياجاتك<br/><span className="gold-text">التقنية في مكان واحد</span></h1><p className="mt-4 max-w-xl leading-7 text-muted">موبايلات، إكسسوارات ومنتجات مختارة، بالإضافة إلى قسم مستقل للأجهزة المستعملة الموثقة.</p><div className="mt-6 flex flex-wrap gap-3"><a href="#products" className="rounded-xl bg-accent px-6 py-3 text-sm font-black text-on-accent">تسوق الآن</a><button onClick={goUsed} className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-black">الأجهزة المستعملة</button></div></div><div className="relative overflow-hidden border-t border-border md:h-full md:min-h-[360px] md:border-t-0"><img src="/hero.jpg" alt="iShop" className="block w-full object-contain md:absolute md:inset-0 md:h-full md:w-full md:object-cover"/><div className="absolute inset-0 hidden bg-gradient-to-l from-transparent via-transparent to-card md:block"/></div></div></section>

   <section id="categories" className="py-6"><SectionTitle title="تسوق حسب الأقسام" sub="اختار القسم ووصل لمنتجاتك أسرع" action={<button onClick={()=>navigate('/categories')} className="text-xs font-black text-accent">عرض الكل</button>}/><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{cats.length?cats.map(c=><button type="button" key={c.id} onClick={()=>navigate(`/products?category=${c.id}`)} className="group rounded-2xl border border-border bg-card p-3 text-center transition hover:-translate-y-1 hover:border-accent-line active:scale-[.99]" aria-label={`عرض قسم ${c.name}`}>{c.image_path?<img src={publicMediaUrl('category-images',c.image_path)} className="mx-auto aspect-square w-full rounded-xl object-cover" alt={c.name}/>:<div className="mx-auto grid aspect-square w-full place-items-center rounded-xl bg-surface text-3xl">▦</div>}<b className="mt-2 block text-sm">{c.name}</b></button>):['موبايلات','شواحن','كابلات','سماعات','إكسسوارات','اسكرينات','جرابات','المزيد'].map(x=><div key={x} className="rounded-2xl border border-border bg-card p-5 text-center"><div className="text-2xl">▦</div><b className="mt-2 block text-sm">{x}</b></div>)}</div></section>

   <section id="products" className="py-8"><SectionTitle title="المنتجات المميزة" sub="منتجات متاحة حاليًا في iShop" action={<button type="button" onClick={()=>navigate('/products')} className="text-xs font-bold text-accent">عرض الكل</button>}/><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{products.length?products.slice(0,8).map(p=><button type="button" key={p.id} onClick={()=>navigate(`/product/${p.id}`)} className="overflow-hidden rounded-2xl border border-border bg-card text-start transition active:scale-[.99]" aria-label={`عرض ${p.name}`}><div className="aspect-square bg-surface">{p.images?.[0]?<img src={publicMediaUrl('product-images',p.images[0])} className="size-full object-cover" alt={p.name} onError={e=>{e.currentTarget.style.display='none';e.currentTarget.parentElement?.classList.add('product-image-failed')}}/>:<div className="grid size-full place-items-center text-5xl opacity-30">📦</div>}</div><div className="p-3"><p className="text-[10px] font-bold text-muted">{p.product_brands?.name||'iShop'}</p><h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-black">{p.name}</h3><span className="mt-3 block w-full rounded-xl border border-accent-line bg-accent-soft py-2 text-center text-xs font-black text-accent">عرض المنتج</span></div></button>):[1,2,3,4].map(x=><div key={x} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface"/>)}</div></section>

   <section id="recent-products" className="py-8"><SectionTitle title="المضاف حديثًا" sub="أحدث الأصناف التي تم شراؤها أو إضافتها إلى المخزون"/><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{recentProducts.length?recentProducts.map(p=><button key={p.id} onClick={()=>navigate(`/product/${p.id}`)} className="overflow-hidden rounded-2xl border border-border bg-card text-start"><div className="aspect-square bg-surface">{p.images?.[0]?<img src={publicMediaUrl('product-images',p.images[0])} className="size-full object-cover" alt={p.name}/>:<div className="grid size-full place-items-center text-5xl opacity-30">📦</div>}</div><div className="p-3"><p className="text-[10px] font-bold text-muted">{p.product_brands?.name||'iShop'}</p><h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-black">{p.name}</h3><span className="mt-3 block rounded-xl border border-accent-line bg-accent-soft py-2 text-center text-xs font-black text-accent">عرض التفاصيل</span></div></button>):<div className="col-span-full rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted">لا توجد أصناف مضافة حديثًا ومتاحة بالمخزون.</div>}</div></section>

   <section className="py-8"><SectionTitle title="أجهزة مستعملة مختارة" sub="قسم الأجهزة المستعملة أصبح جزءًا من متجر iShop" action={<button onClick={goUsed} className="text-xs font-black text-accent">عرض كل الأجهزة</button>}/><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{used.slice(0,4).map(r=><button key={r.id||r.device_code} onClick={async()=>{await enterGuest();navigate(`/d/${encodeURIComponent(r.device_code||r.id)}`)}} className="overflow-hidden rounded-2xl border border-border bg-card text-start"><div className="aspect-square bg-surface">{r.images?.[0]?<img src={deviceImageUrl(r.images[0])} className="size-full object-cover"/>:<div className="grid size-full place-items-center text-4xl">📱</div>}</div><div className="p-3"><h3 className="truncate text-sm font-black">{r.model}</h3><p className="mt-1 text-xs text-muted">{r.storage}{r.color&&r.color!=='-'?` · ${r.color}`:''}</p><span className="mt-2 inline-block text-xs font-black text-accent">عرض التفاصيل ←</span></div></button>)}</div></section>

   <section className="grid gap-3 py-8 sm:grid-cols-2 lg:grid-cols-4">{[['🛡️','ضمان حقيقي','ضمان موثق على المنتجات المؤهلة'],['✓','منتجات موثوقة','بيانات واضحة قبل الشراء'],['🚚','خدمة سريعة','تجربة شراء أسهل وأسرع'],['🎧','دعم ما بعد البيع','فريق MTC Group معك']].map(([i,t,d])=><div key={t} className="rounded-2xl border border-border bg-card p-5"><span className="text-2xl">{i}</span><b className="mt-3 block">{t}</b><p className="mt-1 text-xs text-muted">{d}</p></div>)}</section>

   <section id="brands" className="py-6"><SectionTitle title="العلامات التجارية"/><div className="flex flex-wrap justify-center gap-3">{['Apple','Samsung','Anker','Xiaomi','Huawei','Baseus','UGREEN'].map(b=><span key={b} className="rounded-xl border border-border bg-card px-6 py-3 font-black">{b}</span>)}</div></section>
   <div id="contact"><SiteFooter/></div>
  </main>

 </div>
}
