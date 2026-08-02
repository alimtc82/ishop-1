import { useEffect,useMemo,useState } from 'react';

export function useListPagination(items, resetKeys=[]){
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(30);
  useEffect(()=>setPage(1),[pageSize,...resetKeys]);
  const total=items.length;
  const totalPages=pageSize==='all'?1:Math.max(1,Math.ceil(total/pageSize));
  useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
  const visible=useMemo(()=>pageSize==='all'?items:items.slice((page-1)*pageSize,page*pageSize),[items,page,pageSize]);
  return {page,setPage,pageSize,setPageSize,total,totalPages,visible};
}

export default function ListPagination({page,setPage,pageSize,setPageSize,total,totalPages}){
  const start=total===0?0:(pageSize==='all'?1:(page-1)*pageSize+1);
  const end=total===0?0:(pageSize==='all'?total:Math.min(total,page*pageSize));
  const pages=Array.from({length:totalPages},(_,i)=>i+1).filter(n=>totalPages<=7||n===1||n===totalPages||Math.abs(n-page)<=2);
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-xs">
    <div className="flex items-center gap-2"><span className="text-muted">عدد المعروض</span><select className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text" value={pageSize} onChange={e=>setPageSize(e.target.value==='all'?'all':Number(e.target.value))}><option value={30}>30</option><option value={50}>50</option><option value={100}>100</option><option value="all">الكل</option></select><span className="text-muted">عرض {start}–{end} من {total}</span></div>
    {pageSize!=='all'&&totalPages>1&&<div className="flex items-center gap-1"><button type="button" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-border px-2 py-1.5 disabled:opacity-40">السابق</button>{pages.map((n,i)=><span key={n} className="contents">{i>0&&n-pages[i-1]>1&&<span className="px-1 text-muted">…</span>}<button type="button" onClick={()=>setPage(n)} className={`min-w-8 rounded-lg border px-2 py-1.5 ${n===page?'border-accent text-accent':'border-border'}`}>{n}</button></span>)}<button type="button" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-border px-2 py-1.5 disabled:opacity-40">التالي</button></div>}
  </div>
}
