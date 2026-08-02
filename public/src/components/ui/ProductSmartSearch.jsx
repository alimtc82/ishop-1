import {useMemo,useState} from 'react';
import {productMatches} from '../../lib/productSearch';
import {usePermissions} from '../../context/PermissionContext';
import BarcodeScanner from '../BarcodeScanner';

export default function ProductSmartSearch({products=[],value='',onChange,onSelect,placeholder='بحث باسم الصنف / SKU / الباركود',disabled=false,className='',getStock=null,inputRef=null,clearOnSelect=false}) {
 const [focus,setFocus]=useState(false),[scan,setScan]=useState(false);
 const perms=usePermissions();
 const showStock=perms.can('can_erp_suggestion_view_stock');
 const showSalePrice=perms.can('can_erp_suggestion_view_sale_price');
 const suggestions=useMemo(()=>{const q=String(value||'').trim();if(!q)return[];return products.filter(p=>productMatches(p,q)).slice(0,10)},[products,value]);
 const exact=useMemo(()=>products.find(p=>[p.barcode,p.sku].some(v=>String(v||'').trim()&&String(v).trim()===String(value||'').trim())),[products,value]);
 const choose=p=>{const accepted=onSelect?.(p);if(accepted===false)return;onChange?.(clearOnSelect?'':(p.name||p.sku||p.barcode||''));setFocus(false)};
 const key=e=>{if(e.key==='Enter'){e.preventDefault();if(exact)choose(exact);else if(suggestions.length===1)choose(suggestions[0])}};
 const detected=code=>{setScan(false);const p=products.find(x=>[x.barcode,x.sku].some(v=>String(v||'').trim()===String(code||'').trim()));if(p)choose(p);else{onChange?.(String(code||''));setFocus(true)}};
 return <div className={`relative ${className}`}><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input ref={inputRef} disabled={disabled} value={value} onChange={e=>{onChange?.(e.target.value);setFocus(true)}} onFocus={()=>setFocus(true)} onBlur={()=>setTimeout(()=>setFocus(false),120)} onKeyDown={key} placeholder={placeholder} autoComplete="off" className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-accent disabled:opacity-50"/><button type="button" disabled={disabled} onClick={()=>setScan(true)} className="rounded-xl border border-accent-line px-3 font-black text-accent disabled:opacity-40" title="مسح الباركود بكاميرا الموبايل">📷</button></div>
 {focus&&String(value||'').trim()&&<div className="absolute z-[120] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card shadow-2xl">{suggestions.map(p=><button type="button" key={p.id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(p)} className="block w-full border-b border-border px-3 py-2.5 text-right last:border-0 hover:bg-surface"><b className="block text-sm text-text">{p.name}</b><span className="text-[11px] text-muted">{p.sku||'بدون SKU'}{p.barcode?` · ${p.barcode}`:''}</span><span className="mt-1 flex flex-wrap gap-2 text-[10px] font-black">{showStock&&<span className="text-accent">الرصيد: {getStock?getStock(p):Number(p.available_stock??0)}</span>}{showSalePrice&&<span className="text-muted">سعر البيع: {Number(p.sale_price||0).toLocaleString()}</span>}</span></button>)}{!suggestions.length&&<div className="p-3 text-xs text-muted">لا توجد نتائج مطابقة.</div>}</div>}{scan&&<BarcodeScanner label="باركود الصنف" onDetected={detected} onClose={()=>setScan(false)}/>}</div>
}
