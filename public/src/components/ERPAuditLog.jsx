import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ListPagination,{useListPagination} from './ui/ListPagination';
export default function ERPAuditLog(){
 const [rows,setRows]=useState([]); const [q,setQ]=useState('');
 useEffect(()=>{supabase.from('erp_audit_log').select('*').order('created_at',{ascending:false}).limit(300).then(({data})=>setRows(data||[]))},[]);
 const f=rows.filter(r=>!q||[r.display_name,r.username,r.module,r.action,r.document_number,r.entity_type].some(v=>String(v||'').toLowerCase().includes(q.toLowerCase())));
 const pager=useListPagination(f,[q]);
 return <div><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-black text-text">سجل عمليات ERP</h3><p className="text-xs text-muted">آخر 300 عملية مسجلة</p></div><input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث…" className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"/></div><div className="overflow-x-auto"><table className="w-full text-right text-xs"><thead><tr className="border-b border-border text-muted"><th className="p-2">الوقت</th><th className="p-2">المستخدم</th><th className="p-2">الوحدة</th><th className="p-2">العملية</th><th className="p-2">المستند</th></tr></thead><tbody>{pager.visible.map(r=><tr key={r.id} className="border-b border-border/60"><td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString('ar-EG')}</td><td className="p-2">{r.display_name||r.username||'—'}</td><td className="p-2">{r.module}</td><td className="p-2 font-bold text-accent">{r.action}</td><td className="p-2">{r.document_number||r.entity_id||'—'}</td></tr>)}</tbody></table></div><ListPagination {...pager}/></div>;
}