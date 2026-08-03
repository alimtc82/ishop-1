import {useEffect,useMemo,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {publicMediaUrl} from '../lib/productMedia';
import ProductSmartSearch from '../components/ui/ProductSmartSearch';
import {productMatches} from '../lib/productSearch';

export default function ShopProducts(){
 const nav=useNavigate(),[sp]=useSearchParams(),category=sp.get('category')||'';
 const [products,setProducts]=useState([]),[cats,setCats]=useState([]),[q,setQ]=useState('');
 useEffect(()=>{Promise.all([
  supabase.from('products').select('id,sku,barcode,name,images,category_id,brand_id,product_brands(name)').eq('is_active',true).order('created_at',{ascending:false}),
  supabase.from('product_categories').select('id,name').eq('is_active',true).order('name'),
  supabase.from('storefront_positive_stock').select('product_id,available_stock')
 ]).then(([p,c,m])=>{const ids=new Set((m.data||[]).filter(x=>Number(x.available_stock||0)>0).map(x=>String(x.product_id)));setProducts((p.data||[]).filter(x=>ids.has(String(x.id))));setCats(c.data||[])})},[]);
 const shown=useMemo(()=>products.filter(p=>(!category||String(p.category_id)===category)&&productMatches(p,q)),[products,category,q]);
 const cat=cats.find(c=>String(c.id)===category);
 return <div className="min-h-screen bg-bg text-text" dir="rtl"><header className="sticky top-0 z-30 border-b border-border bg-card/95 p-4 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between"><button onClick={()=>nav('/')} className="text-xl font-black text-accent">APP TECH</button><button onClick={()=>nav('/')} className="text-sm font-black">← الرئيسية</button></div></header><main className="mx-auto max-w-7xl px-4 py-6"><div className="mb-5"><h1 className="text-2xl font-black">{cat?cat.name:'كل المنتجات'}</h1><p className="mt-1 text-xs text-muted">{shown.length} منتج</p></div><div className="mb-5 flex flex-wrap gap-2"><ProductSmartSearch products={products} value={q} onChange={setQ} onSelect={p=>nav(`/product/${p.id}`)} className="min-w-[220px] flex-1" placeholder="ابحث باسم الصنف / SKU / الباركود"/>{category&&<button onClick={()=>nav('/products')} className="rounded-xl border border-border px-4 py-2 text-sm font-black">عرض كل المنتجات</button>}</div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{shown.map(p=><button key={p.id} onClick={()=>nav(`/product/${p.id}`)} className="overflow-hidden rounded-2xl border border-border bg-card text-right transition active:scale-[.99]"><div className="aspect-square bg-surface">{p.images?.[0]?<img src={publicMediaUrl('product-images',p.images[0])} alt={p.name} className="size-full object-cover"/>:<div className="grid size-full place-items-center text-5xl opacity-30">📦</div>}</div><div className="p-3"><p className="text-[10px] font-bold text-muted">{p.product_brands?.name||'APP TECH'}</p><h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-black">{p.name}</h2><span className="mt-3 block rounded-xl border border-accent-line bg-accent-soft py-2 text-center text-xs font-black text-accent">عرض المنتج</span></div></button>)}</div>{!shown.length&&<div className="py-20 text-center text-muted">لا توجد منتجات مطابقة.</div>}</main></div>
}
