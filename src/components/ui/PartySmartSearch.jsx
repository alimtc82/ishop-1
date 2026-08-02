import {useMemo,useState} from 'react';
const norm=v=>String(v??'').trim().toLowerCase();
export default function PartySmartSearch({parties=[],type='customer',value='',onSelect,placeholder}){
 const [q,setQ]=useState(''),[open,setOpen]=useState(false); const selected=parties.find(x=>String(x.id)===String(value));
 const name=p=>type==='customer'?p.display_name:p.name;
 const shown=useMemo(()=>{const s=norm(q);if(!s)return[];return parties.filter(p=>norm(`${name(p)} ${p.code||''} ${p.phone||''} ${p.business_name||''}`).includes(s)).slice(0,8)},[q,parties,type]);
 return <div className="relative"><input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-accent" value={open?q:(selected?name(selected):q)} placeholder={placeholder} onFocus={()=>{setQ(selected?name(selected):q);setOpen(true)}} onChange={e=>{setQ(e.target.value);setOpen(true);if(!e.target.value)onSelect?.(null)}} autoComplete="off"/>{open&&q&&<div className="absolute z-[80] mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-2xl">{shown.map(p=><button type="button" key={p.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{onSelect?.(p);setQ(name(p));setOpen(false)}} className="block w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-surface"><b>{name(p)}</b>{p.phone&&<span className="mr-2 text-xs text-muted">{p.phone}</span>}</button>)}{!shown.length&&<div className="p-3 text-xs text-muted">لا توجد نتائج مطابقة</div>}</div>}</div>
}
