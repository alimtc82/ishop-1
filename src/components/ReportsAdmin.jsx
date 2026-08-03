import {useEffect,useMemo,useState} from 'react';
import * as XLSX from 'xlsx';
import {supabase} from '../lib/supabase';
import {useAllowedBranches} from '../hooks/useAllowedBranches';
import InvoiceQuickView from './InvoiceQuickView';
import FinancialMovementQuickView from './FinancialMovementQuickView';

const REPORTS=[
 ['profit','الربح / الخسارة'],['sales-purchases','المشتريات والمبيعات'],['stagnant','المنتجات الراكدة'],
 ['user','تقرير المستخدم'],['shifts','الورديات'],['expenses','المصروفات'],['collections','التحصيلات النقدية'],
 ['top-products','المنتجات الأكثر مبيعًا'],['inventory','المخزون']
];
const I='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
const money=n=>Number(n||0).toLocaleString('ar-EG',{maximumFractionDigits:2});
const n=v=>Number(v||0);
const inDate=(d,from,to)=>!d||((!from||String(d).slice(0,10)>=from)&&(!to||String(d).slice(0,10)<=to));
const branchOf=x=>x?.branch||x?.treasuries?.branch||'';
const userOf=x=>x?.created_by||x?.user_id||x?.auth_id||'';

export default function ReportsAdmin({initialType='profit',standalone=false}){
 const{branches,canAccessBranch}=useAllowedBranches();
 const[type,setType]=useState(initialType),[from,setFrom]=useState(''),[to,setTo]=useState(''),[branch,setBranch]=useState(''),[user,setUser]=useState('');
 const[server,setServer]=useState(null),[serverBusy,setServerBusy]=useState(false),[users,setUsers]=useState([]),[sales,setSales]=useState([]),[purchases,setPurchases]=useState([]),[saleReturns,setSaleReturns]=useState([]),[expenses,setExpenses]=useState([]),[moves,setMoves]=useState([]),[dues,setDues]=useState([]),[products,setProducts]=useState([]),[groups,setGroups]=useState([]),[prices,setPrices]=useState([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState(''),[valuation,setValuation]=useState('purchase'),[viewInvoice,setViewInvoice]=useState(null),[viewMovement,setViewMovement]=useState(null);
 const load=async()=>{setLoading(true);setMsg('');try{
  const qs=await Promise.all([
   supabase.from('sales_invoices').select('*,sales_invoice_items(*,products(id,name,sku,purchase_price,sale_price))').eq('status','posted'),
   supabase.from('purchase_invoices').select('*,purchase_invoice_items(*,products(id,name,sku))').eq('status','posted'),
   supabase.from('sales_returns').select('*').eq('status','posted'),
   supabase.from('expenses').select('*,treasuries(name,branch)').neq('status','cancelled'),
   supabase.from('financial_movements').select('*,treasuries(name,branch)').neq('status','cancelled'),
   supabase.from('dues').select('*').eq('due_type','receivable'),
   supabase.from('products').select('id,name,sku,purchase_price,sale_price,is_active'),
   supabase.from('sale_price_groups').select('id,name,app_code').eq('is_active',true).order('name'),
   supabase.from('product_sale_prices').select('product_id,price_group_id,sale_price'),
   supabase.from('ishop_users').select('auth_id,display_name,username').eq('is_active',true).order('display_name')
  ]);
  const err=qs.find(x=>x.error)?.error;if(err)throw err;
  setSales(qs[0].data||[]);setPurchases(qs[1].data||[]);setSaleReturns(qs[2].data||[]);setExpenses(qs[3].data||[]);setMoves(qs[4].data||[]);setDues(qs[5].data||[]);setProducts(qs[6].data||[]);setGroups(qs[7].data||[]);setPrices(qs[8].data||[]);setUsers(qs[9].data||[]);
 }catch(e){setMsg(e.message)}finally{setLoading(false)}};useEffect(()=>{load()},[]);
 useEffect(()=>{ setServer(null); setServerBusy(false); },[type,from,to,branch,user,valuation]);
 const ok=x=>canAccessBranch(branchOf(x))&&(!branch||branchOf(x)===branch)&&(!user||userOf(x)===user);
 const fs=useMemo(()=>sales.filter(x=>ok(x)&&inDate(x.invoice_date||x.created_at,from,to)),[sales,from,to,branch,user]);
 const fp=useMemo(()=>purchases.filter(x=>ok(x)&&inDate(x.invoice_date||x.created_at,from,to)),[purchases,from,to,branch,user]);
 const fr=useMemo(()=>saleReturns.filter(x=>ok(x)&&inDate(x.return_date||x.created_at,from,to)),[saleReturns,from,to,branch,user]);
 const fe=useMemo(()=>expenses.filter(x=>ok(x)&&inDate(x.expense_date||x.created_at,from,to)),[expenses,from,to,branch,user]);
 const fm=useMemo(()=>moves.filter(x=>ok(x)&&inDate(x.movement_date||x.created_at,from,to)),[moves,from,to,branch,user]);

 const salesGross=fs.reduce((s,x)=>s+n(x.subtotal||x.total)+n(x.discount),0);
 const invoiceDiscount=fs.reduce((s,x)=>s+n(x.discount),0);
 const lineDiscount=fs.flatMap(x=>x.sales_invoice_items||[]).reduce((s,x)=>s+n(x.discount),0);
 const salesCost=fs.flatMap(x=>x.sales_invoice_items||[]).reduce((s,x)=>s+n(x.quantity)*n(x.products?.purchase_price),0);
 const customerDiscount=fs.reduce((s,x)=>s+n(x.customer_discount),0);
 const shipping=fs.reduce((s,x)=>s+n(x.shipping_fee||x.shipping_cost),0);
 const expenseTotal=fe.reduce((s,x)=>s+n(x.amount),0);
 const grossProfit=salesGross-salesCost;
 const netProfit=grossProfit-(customerDiscount+shipping+invoiceDiscount+lineDiscount+expenseTotal);

 const productMovement=useMemo(()=>{const m=new Map();for(const x of [...fs,...fp])for(const i of (x.sales_invoice_items||x.purchase_invoice_items||[])){const id=String(i.product_id);m.set(id,(m.get(id)||0)+n(i.quantity))}return m},[fs,fp]);
 const sold=useMemo(()=>{const m=new Map();for(const x of fs)for(const i of x.sales_invoice_items||[]){const id=String(i.product_id),old=m.get(id)||{id,name:i.products?.name||id,sku:i.products?.sku||'',qty:0,total:0};old.qty+=n(i.quantity);old.total+=n(i.quantity)*n(i.unit_price)-n(i.discount);m.set(id,old)}return [...m.values()].sort((a,b)=>b.qty-a.qty)},[fs]);
 const stock=useMemo(()=>{const m=new Map(products.map(p=>[String(p.id),0]));for(const x of purchases.filter(ok))for(const i of x.purchase_invoice_items||[])m.set(String(i.product_id),(m.get(String(i.product_id))||0)+n(i.quantity));for(const x of sales.filter(ok))for(const i of x.sales_invoice_items||[])m.set(String(i.product_id),(m.get(String(i.product_id))||0)-n(i.quantity));return m},[products,purchases,sales,branch,user]);


 const userReport=useMemo(()=>{
  const userName=id=>users.find(u=>String(u.auth_id)===String(id))?.display_name||users.find(u=>String(u.auth_id)===String(id))?.username||'—';
  const cashSales=fs.filter(x=>x.payment_type==='cash');
  const creditSales=fs.filter(x=>x.payment_type==='credit');
  const collections=fm.filter(x=>x.movement_type==='receipt'&&(x.party_type==='customer'||x.reference_type==='customer_collection'));
  const dueByInvoice=new Map();
  for(const d of dues){
   if(d.reference_type==='sales_invoice'&&d.reference_id!=null)dueByInvoice.set(String(d.reference_id),d);
  }
  const uncollected=creditSales.map(x=>{
   const d=dueByInvoice.get(String(x.id));
   const remaining=d?Math.max(0,n(d.amount)-n(d.settled_amount)):Math.max(0,n(x.total)-n(x.paid));
   return {...x,remaining};
  }).filter(x=>x.remaining>0);
  const cashTotal=cashSales.reduce((s,x)=>s+n(x.total),0);
  const creditTotal=creditSales.reduce((s,x)=>s+n(x.total),0);
  const collectionTotal=collections.reduce((s,x)=>s+n(x.amount),0);
  const uncollectedTotal=uncollected.reduce((s,x)=>s+n(x.remaining),0);
  return{cashSales,creditSales,collections,uncollected,cashTotal,creditTotal,collectionTotal,uncollectedTotal,commissionBase:cashTotal+collectionTotal,userName};
 },[fs,fm,dues,users]);

 const report=useMemo(()=>{
  if(type==='profit')return{head:['البيان','القيمة'],rows:[['إجمالي سعر البيع',money(salesGross)],['إجمالي سعر الشراء / التكلفة',money(salesCost)],['إجمالي الربح',money(grossProfit)],['خصم العملاء',money(customerDiscount)],['رسوم الشحن',money(shipping)],['خصم الفواتير',money(invoiceDiscount+lineDiscount)],['المصروفات',money(expenseTotal)],['صافي الربح / الخسارة',money(netProfit)]]};
  if(type==='sales-purchases'){const pc=fp.filter(x=>x.payment_type==='cash'),pd=fp.filter(x=>x.payment_type==='credit'),sc=fs.filter(x=>x.payment_type==='cash'),sd=fs.filter(x=>x.payment_type==='credit');return{head:['النوع','عدد الفواتير','الإجمالي'],rows:[['مشتريات نقدية',pc.length,money(pc.reduce((s,x)=>s+n(x.total),0))],['مشتريات آجلة',pd.length,money(pd.reduce((s,x)=>s+n(x.total),0))],['مبيعات نقدية',sc.length,money(sc.reduce((s,x)=>s+n(x.total),0))],['مبيعات آجلة',sd.length,money(sd.reduce((s,x)=>s+n(x.total),0))]]};}
  if(type==='stagnant'){const rows=products.filter(p=>(stock.get(String(p.id))||0)>0&&!productMovement.has(String(p.id))).map(p=>[p.sku,p.name,money(stock.get(String(p.id)))]);return{head:['SKU','الصنف','الرصيد'],rows}};
  if(type==='user')return{head:['البيان','الإجمالي'],rows:[['المبيعات النقدية',money(userReport.cashTotal)],['المبيعات الآجلة',money(userReport.creditTotal)],['تحصيلات العملاء',money(userReport.collectionTotal)],['المبيعات غير المحصلة',money(userReport.uncollectedTotal)],['المستحق عنه عمولة',money(userReport.commissionBase)]]};
  if(type==='shifts'){const rows=fm.filter(x=>['shift_open','shift_close'].includes(x.reference_type)||['shift_open','shift_close'].includes(x.movement_type)).map(x=>[x.movement_date||String(x.created_at).slice(0,10),x.party_name||'—',branchOf(x)||'—',x.reference_type||x.movement_type,money(x.amount)]);return{head:['التاريخ','المستخدم','الفرع','الحركة','القيمة'],rows}};
  if(type==='expenses')return{head:['التاريخ','الفرع','المستفيد','المبلغ','ملاحظات'],rows:fe.map(x=>[x.expense_date,branchOf(x)||'—',x.payee_name||'—',money(x.amount),x.notes||'—'])};
  if(type==='collections')return{head:['التاريخ','الفرع','العميل','المبلغ','المرجع'],rows:fm.filter(x=>x.movement_type==='receipt'&&(x.party_type==='customer'||x.reference_type==='customer_collection')).map(x=>[x.movement_date,branchOf(x)||'—',x.party_name||'—',money(x.amount),x.movement_number||'—'])};
  if(type==='top-products')return{head:['SKU','الصنف','الكمية المباعة','قيمة المبيعات'],rows:sold.map(x=>[x.sku,x.name,money(x.qty),money(x.total)])};
  const price=(p)=>{if(valuation==='purchase'||valuation==='last_purchase')return n(p.purchase_price);if(valuation==='base')return n(p.sale_price);const pr=prices.find(x=>String(x.product_id)===String(p.id)&&String(x.price_group_id)===valuation.replace('group:',''));return n(pr?.sale_price)};
  return{head:['SKU','الصنف','الرصيد','سعر التقييم','قيمة المخزون'],rows:products.filter(p=>(stock.get(String(p.id))||0)!==0).map(p=>{const q=stock.get(String(p.id))||0,v=price(p);return[p.sku,p.name,money(q),money(v),money(q*v)]})};
 },[type,fs,fp,fr,fe,fm,products,groups,prices,valuation,salesGross,salesCost,grossProfit,customerDiscount,shipping,invoiceDiscount,lineDiscount,expenseTotal,netProfit,stock,productMovement,sold,users,userReport]);


 const serverReport=useMemo(()=>{
  if(!server)return null;
  if(type==='profit')return{head:['البيان','القيمة'],rows:[['إجمالي سعر البيع',money(server.gross_sales)],['تكلفة البضاعة المباعة التاريخية',money(server.cogs)],['إجمالي الربح',money(server.gross_profit)],['خصم الفواتير',money(n(server.invoice_discount)+n(server.line_discount))],['المصروفات',money(server.expenses)],['صافي الربح / الخسارة',money(server.net_profit)]]};
  if(type==='sales-purchases')return{head:['النوع','عدد الفواتير','الإجمالي'],rows:[['مشتريات نقدية',server.purchase_cash?.count||0,money(server.purchase_cash?.total)],['مشتريات آجلة',server.purchase_credit?.count||0,money(server.purchase_credit?.total)],['مبيعات نقدية',server.sales_cash?.count||0,money(server.sales_cash?.total)],['مبيعات آجلة',server.sales_credit?.count||0,money(server.sales_credit?.total)]]};
  if(type==='expenses')return{head:['التاريخ','الفرع','المستفيد','المبلغ','ملاحظات'],rows:(Array.isArray(server)?server:[]).map(x=>[x.expense_date,x.branch||'—',x.payee_name||'—',money(x.amount),x.notes||'—'])};
  if(type==='collections')return{head:['التاريخ','الفرع','العميل','المبلغ','المرجع'],rows:(Array.isArray(server)?server:[]).map(x=>[x.movement_date,x.branch||'—',x.party_name||'—',money(x.amount),x.reference_id||'—'])};
  if(type==='top-products')return{head:['SKU','الصنف','الكمية المباعة','قيمة المبيعات'],rows:(Array.isArray(server)?server:[]).map(x=>[x.sku,x.name,money(x.qty),money(x.sales)])};
  if(type==='inventory')return{head:['SKU','الصنف','الرصيد','سعر التقييم','قيمة المخزون'],rows:(Array.isArray(server)?server:[]).map(x=>{let v=valuation==='base'?n(x.base_price):valuation.startsWith('group:')?n(x.group_price):n(x.purchase_price);return[x.sku,x.name,money(x.qty),money(v),money(n(x.qty)*v)]})};
  return null;
 },[server,type,valuation]);
 const finalReport=serverReport||report;
 const exportX=()=>{
  const wb=XLSX.utils.book_new();
  if(type==='user'){
   const summary=[['البيان','الإجمالي'],['المبيعات النقدية',userReport.cashTotal],['المبيعات الآجلة',userReport.creditTotal],['تحصيلات العملاء',userReport.collectionTotal],['المبيعات غير المحصلة',userReport.uncollectedTotal],['المستحق عنه عمولة',userReport.commissionBase]];
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'ملخص المستخدم');
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['الفاتورة','التاريخ','العميل','الفرع','المستخدم','الإجمالي'],...userReport.cashSales.map(x=>[x.invoice_number,x.invoice_date,x.customer_name||'عميل نقدي',x.branch||'',userReport.userName(x.created_by),n(x.total)])]),'مبيعات نقدية');
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['الفاتورة','التاريخ','العميل','الفرع','المستخدم','الإجمالي'],...userReport.creditSales.map(x=>[x.invoice_number,x.invoice_date,x.customer_name||'عميل نقدي',x.branch||'',userReport.userName(x.created_by),n(x.total)])]),'مبيعات آجلة');
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['السند','التاريخ','العميل','الخزينة','الفرع','المستخدم','المبلغ'],...userReport.collections.map(x=>[x.movement_number||x.id,x.movement_date,x.party_name||'',x.treasuries?.name||'',x.treasuries?.branch||'',userReport.userName(x.created_by||x.user_id||x.auth_id),n(x.amount)])]),'تحصيلات العملاء');
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['الفاتورة','التاريخ','العميل','الفرع','المستخدم','الإجمالي','غير المحصل'],...userReport.uncollected.map(x=>[x.invoice_number,x.invoice_date,x.customer_name||'عميل نقدي',x.branch||'',userReport.userName(x.created_by),n(x.total),n(x.remaining)])]),'غير محصل');
  }else XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([finalReport.head,...finalReport.rows]),'التقرير');
  XLSX.writeFile(wb,`APPTECH_${type}_Report.xlsx`)
 };
 const printReport=()=>window.print();
 return <div className="space-y-5"><div><h1 className="text-2xl font-black text-accent">تقارير ERP</h1><p className="mt-1 text-sm text-muted">كل التقارير تخضع للفترة والفرع والمستخدم، مع احترام الفروع المسموحة للمستخدم الحالي.</p></div>
 {!standalone&&<div className="flex flex-wrap gap-2">{REPORTS.map(([k,l])=><button key={k} onClick={()=>setType(k)} className={`rounded-xl border px-3 py-2 text-xs font-black ${type===k?'border-accent bg-accent text-black':'border-border bg-card text-muted'}`}>{l}</button>)}</div>}
 <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"><div><label className="text-xs font-bold text-muted">من</label><input className={I} type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div><div><label className="text-xs font-bold text-muted">إلى</label><input className={I} type="date" value={to} onChange={e=>setTo(e.target.value)}/></div><div><label className="text-xs font-bold text-muted">الفرع</label><select className={I} value={branch} onChange={e=>setBranch(e.target.value)}><option value="">كل الفروع المسموحة</option>{branches.map(b=><option key={b}>{b}</option>)}</select></div><div><label className="text-xs font-bold text-muted">المستخدم</label><select className={I} value={user} onChange={e=>setUser(e.target.value)}><option value="">كل المستخدمين</option>{users.map(u=><option key={u.auth_id} value={u.auth_id}>{u.display_name||u.username}</option>)}</select></div></div>
 {type==='inventory'&&<div className="rounded-2xl border border-border bg-card p-4"><label className="text-xs font-bold text-muted">تقييم المخزون</label><select className={`${I} mt-1 max-w-md`} value={valuation} onChange={e=>setValuation(e.target.value)}><option value="purchase">بسعر الشراء المسجل</option><option value="last_purchase">بآخر سعر شراء</option><option value="base">بسعر البيع الافتراضي Base Price</option>{groups.map(g=><option key={g.id} value={`group:${g.id}`}>سعر البيع — {g.name}</option>)}</select></div>}
 {msg&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-400">{msg}</div>}
 <div className="flex justify-end gap-2 print:hidden"><button onClick={printReport} className="rounded-xl border border-border px-4 py-2 text-xs font-black text-text">طباعة التقرير</button><button onClick={exportX} className="rounded-xl border border-accent-line px-4 py-2 text-xs font-black text-accent">تصدير Excel</button></div>
 {(loading||serverBusy)?<div className="h-40 animate-pulse rounded-2xl bg-surface"/>:type==='user'?<UserReportView data={userReport} money={money} onInvoice={id=>setViewInvoice(id)} onMovement={id=>setViewMovement(id)}/>:<Table {...finalReport}/>}
 {viewInvoice&&<InvoiceQuickView type="sales" invoiceId={viewInvoice} onClose={()=>setViewInvoice(null)}/>}
 {viewMovement&&<FinancialMovementQuickView movementId={viewMovement} onClose={()=>setViewMovement(null)}/>}
 </div>
}
function Table({head,rows}){return <div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[680px] text-right text-sm"><thead className="bg-surface text-xs text-muted"><tr>{head.map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-border">{r.map((c,j)=><td key={j} className={`p-3 ${j===0?'font-bold text-text':'text-muted'}`}>{c}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={head.length} className="p-10 text-center text-muted">لا توجد بيانات مطابقة للفلاتر.</td></tr>}</tbody></table></div>}

function UserReportView({data,money,onInvoice,onMovement}){
 const Card=({title,value,accent=false})=><div className={`rounded-2xl border p-4 ${accent?'border-accent-line bg-accent-soft':'border-border bg-card'}`}><div className="text-xs font-bold text-muted">{title}</div><div className={`mt-1 text-xl font-black ${accent?'text-accent':'text-text'}`}>{money(value)}</div></div>;
 const SalesTable=({rows,credit=false,remaining=false})=><div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[800px] text-right text-sm"><thead className="bg-surface text-xs text-muted"><tr><th className="p-3">الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الفرع</th><th>المستخدم</th><th>الإجمالي</th>{credit&&<th>المحصل</th>}{remaining&&<th>غير المحصل</th>}</tr></thead><tbody>{rows.map(x=><tr key={x.id} className="border-t border-border"><td className="p-3"><button onClick={()=>onInvoice(x.id)} className="font-black text-accent">{x.invoice_number}</button></td><td>{x.invoice_date}</td><td>{x.customer_name||'عميل نقدي'}</td><td>{x.branch||'—'}</td><td>{data.userName(x.created_by)}</td><td className="font-bold">{money(x.total)}</td>{credit&&<td>{money(Math.max(0,Number(x.total||0)-Number(x.remaining??Math.max(0,Number(x.total||0)-Number(x.paid||0)))))}</td>}{remaining&&<td className="font-black text-accent">{money(x.remaining)}</td>}</tr>)}{!rows.length&&<tr><td colSpan="9" className="p-6 text-center text-muted">لا توجد بيانات.</td></tr>}</tbody></table></div>;
 return <div className="space-y-5">
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Card title="إجمالي المبيعات النقدية" value={data.cashTotal}/><Card title="إجمالي المبيعات الآجلة" value={data.creditTotal}/><Card title="إجمالي التحصيلات من العملاء" value={data.collectionTotal}/><Card title="إجمالي المبيعات غير المحصلة" value={data.uncollectedTotal}/><Card title="إجمالي المستحق عنه عمولة" value={data.commissionBase} accent/></div>
  <div className="rounded-2xl border border-accent-line bg-accent-soft p-3 text-sm font-black text-accent">المستحق عنه عمولة = إجمالي المبيعات النقدية + إجمالي التحصيلات النقدية من العملاء</div>
  <section className="space-y-2"><h3 className="font-black text-text">تفصيل المبيعات النقدية — {money(data.cashTotal)}</h3><SalesTable rows={data.cashSales}/></section>
  <section className="space-y-2"><h3 className="font-black text-text">تفصيل المبيعات الآجلة — {money(data.creditTotal)}</h3><SalesTable rows={data.creditSales} credit/></section>
  <section className="space-y-2"><h3 className="font-black text-text">تفصيل تحصيلات العملاء — {money(data.collectionTotal)}</h3><div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[800px] text-right text-sm"><thead className="bg-surface text-xs text-muted"><tr><th className="p-3">سند التحصيل</th><th>التاريخ</th><th>العميل</th><th>الخزينة</th><th>الفرع</th><th>المستخدم</th><th>المبلغ</th></tr></thead><tbody>{data.collections.map(x=><tr key={x.id} className="border-t border-border"><td className="p-3"><button onClick={()=>onMovement(x.id)} className="font-black text-accent">{x.movement_number||x.id}</button></td><td>{x.movement_date}</td><td>{x.party_name||'—'}</td><td>{x.treasuries?.name||'—'}</td><td>{x.treasuries?.branch||'—'}</td><td>{data.userName(x.created_by||x.user_id||x.auth_id)}</td><td className="font-black">{money(x.amount)}</td></tr>)}{!data.collections.length&&<tr><td colSpan="7" className="p-6 text-center text-muted">لا توجد تحصيلات.</td></tr>}</tbody></table></div></section>
  <section className="space-y-2"><h3 className="font-black text-text">تفصيل المبيعات غير المحصلة — {money(data.uncollectedTotal)}</h3><SalesTable rows={data.uncollected} credit remaining/></section>
 </div>
}
