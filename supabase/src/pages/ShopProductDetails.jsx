import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {publicMediaUrl} from '../lib/productMedia';
import {stockQty} from '../lib/productSearch';
import {usePermissions} from '../context/PermissionContext';
import ShareBar from '../components/ShareBar';

export default function ShopProductDetails(){
 const id=window.location.pathname.split('/').filter(Boolean)[1]||'',nav=useNavigate(),{isAdmin}=usePermissions(),[p,setP]=useState(null),[loading,setLoading]=useState(true),[image,setImage]=useState(0),[stock,setStock]=useState(null);
 useEffect(()=>{
  let alive=true;
  setLoading(true);
  setP(null);
  (async()=>{
   const {data:product,error}=await supabase.from('products').select('*').eq('id',id).eq('is_active',true).maybeSingle();
   if(!alive)return;
   if(error||!product){setP(null);setLoading(false);return}
   let product_brands=null,product_categories=null;
   if(product.brand_id){const {data}=await supabase.from('product_brands').select('name').eq('id',product.brand_id).maybeSingle();product_brands=data||null}
   if(product.category_id){const {data}=await supabase.from('product_categories').select('name').eq('id',product.category_id).maybeSingle();product_categories=data||null}
   if(alive){setP({...product,product_brands,product_categories});setLoading(false)}
  })();
  return()=>{alive=false};
 },[id]);
 useEffect(()=>{if(!isAdmin()){setStock(null);return}supabase.from('product_movements').select('product_id,movement_type,quantity,branch').eq('product_id',id).then(({data,error})=>setStock(error?null:stockQty(data||[],id)))},[id,isAdmin]);
 if(loading)return <div className="grid min-h-screen place-items-center bg-bg text-text">جارٍ التحميل…</div>;
 if(!p)return <div className="grid min-h-screen place-items-center bg-bg text-text"><div className="text-center"><b>المنتج غير موجود أو غير متاح.</b><button onClick={()=>nav('/products')} className="mt-4 block text-accent">العودة للمنتجات</button></div></div>;
 const imgs=p.images||[];
 return <div className="min-h-screen bg-bg text-text" dir="rtl"><header className="sticky top-0 z-30 border-b border-border bg-card/95 p-4 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between"><button onClick={()=>nav('/')} className="text-xl font-black text-accent">iShop</button><button onClick={()=>nav(-1)} className="text-sm font-black">← رجوع</button></div></header><main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-2"><div><div className="aspect-square overflow-hidden rounded-3xl border border-border bg-surface">{imgs[image]?<img src={publicMediaUrl('product-images',imgs[image])} alt={p.name} className="size-full object-contain"/>:<div className="grid size-full place-items-center text-7xl opacity-30">📦</div>}</div>{imgs.length>1&&<div className="mt-3 flex gap-2 overflow-x-auto">{imgs.map((x,i)=><button key={x} onClick={()=>setImage(i)} className={`size-16 shrink-0 overflow-hidden rounded-xl border ${i===image?'border-accent':'border-border'}`}><img src={publicMediaUrl('product-images',x)} className="size-full object-cover"/></button>)}</div>}</div><div className="rounded-3xl border border-border bg-card p-5 md:p-7"><p className="text-xs font-bold text-muted">{p.product_brands?.name||'iShop'}</p><h1 className="mt-2 text-2xl font-black md:text-3xl">{p.name}</h1>{p.sku&&<p className="mt-2 text-xs text-muted">كود المنتج: {p.sku}</p>}<div className="mt-5 grid gap-3"><div className="rounded-xl border border-border bg-surface p-3"><span className="text-xs text-muted">القسم</span><b className="mt-1 block">{p.product_categories?.name||'—'}</b></div>{isAdmin()&&stock!==null&&<div className="rounded-xl border border-accent-line bg-accent-soft p-3"><span className="text-xs text-muted">الرصيد الحالي — للإدارة فقط</span><b className="mt-1 block text-lg text-accent">{Number(stock.toFixed(3)).toLocaleString('ar-EG')}</b></div>}{p.notes&&<div className="rounded-xl border border-border bg-surface p-3"><span className="text-xs text-muted">التفاصيل</span><p className="mt-1 whitespace-pre-wrap text-sm leading-7">{p.notes}</p></div>}</div><ShareBar url={window.location.href} text={`منتج: ${p.name}`} /><button onClick={()=>nav(`/products${p.category_id?`?category=${p.category_id}`:''}`)} className="mt-5 w-full rounded-xl border border-accent-line bg-accent-soft py-3 text-sm font-black text-accent">عرض منتجات القسم</button></div></main></div>
}
