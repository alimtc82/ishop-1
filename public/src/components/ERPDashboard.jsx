import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const money = n => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
export default function ERPDashboard(){
 const [s,setS]=useState({sales:0,purchases:0,expenses:0,treasury:0,duesIn:0,duesOut:0,stock:0,loading:true});
 useEffect(()=>{(async()=>{
  const today=new Date().toISOString().slice(0,10);
  const [sales,purchases,expenses,treasuries,dues,moves]=await Promise.all([
   supabase.from('sales_invoices').select('total').eq('status','posted').eq('invoice_date',today),
   supabase.from('purchase_invoices').select('total').eq('status','posted').eq('invoice_date',today),
   supabase.from('expenses').select('amount').eq('status','posted').eq('expense_date',today),
   supabase.from('treasuries').select('opening_balance'),
   supabase.from('dues').select('due_type,amount,settled_amount').neq('status','cancelled'),
   supabase.from('product_movements').select('quantity,movement_type')
  ]);
  const sum=(rows,k)=> (rows||[]).reduce((a,r)=>a+Number(r[k]||0),0);
  const ds=dues.data||[]; const mv=moves.data||[];
  setS({sales:sum(sales.data,'total'),purchases:sum(purchases.data,'total'),expenses:sum(expenses.data,'amount'),treasury:sum(treasuries.data,'opening_balance'),duesIn:ds.filter(x=>x.due_type==='receivable').reduce((a,x)=>a+Number(x.amount||0)-Number(x.settled_amount||0),0),duesOut:ds.filter(x=>x.due_type==='payable').reduce((a,x)=>a+Number(x.amount||0)-Number(x.settled_amount||0),0),stock:mv.reduce((a,x)=>a+(String(x.movement_type).includes('out')?-Number(x.quantity||0):Number(x.quantity||0)),0),loading:false});
 })()},[]);
 const cards=[['مبيعات اليوم',s.sales],['مشتريات اليوم',s.purchases],['مصروفات اليوم',s.expenses],['الرصيد الافتتاحي للخزائن',s.treasury],['مستحقات لنا',s.duesIn],['مستحقات علينا',s.duesOut]];
 if(s.loading)return <div className="py-16 text-center text-muted">جارٍ تحميل مؤشرات ERP…</div>;
 return <div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([l,v])=><div key={l} className="rounded-2xl border border-border bg-surface p-4"><div className="text-xs font-bold text-muted">{l}</div><div className="mt-2 text-2xl font-black text-text">{money(v)}</div></div>)}</div><div className="mt-4 rounded-2xl border border-border bg-surface p-4"><div className="text-xs font-bold text-muted">صافي كمية المخزون من سجل الحركات</div><div className="mt-2 text-3xl font-black text-accent">{money(s.stock)}</div></div></div>;
}
