import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export default function PartyAccountSummary({type='customer',partyId}){
 const customer=type==='customer'; const [balance,setBalance]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let alive=true;if(!partyId){setBalance(null);setError('');return()=>{alive=false}};(async()=>{setBalance(null);setError('');try{const id=Number(partyId),table=customer?'customers':'suppliers';const [{data:p,error:pe},{data:inv,error:ie},{data:ret,error:re},{data:mov,error:me}]=await Promise.all([
 supabase.from(table).select('opening_balance').eq('id',id).maybeSingle(),
 supabase.from(customer?'sales_invoices':'purchase_invoices').select('total,paid').eq(customer?'customer_id':'supplier_id',id).eq('status','posted'),
 supabase.from(customer?'sales_returns':'purchase_returns').select('total').eq(customer?'customer_id':'supplier_id',id).eq('status','posted'),
 supabase.from('financial_movements').select('movement_type,amount').eq('party_type',type).eq('party_id',id).neq('status','cancelled')]);
 if(pe)throw pe;if(ie)throw ie;if(re)throw re;if(me)throw me;let b=Number(p?.opening_balance||0);
 if(customer){(inv||[]).forEach(x=>b+=Number(x.total||0)-Number(x.paid||0));(ret||[]).forEach(x=>b-=Number(x.total||0));(mov||[]).forEach(x=>{if(x.movement_type==='receipt')b-=Number(x.amount||0);else if(x.movement_type==='payment')b+=Number(x.amount||0)})}
 else{(inv||[]).forEach(x=>b+=Number(x.total||0)-Number(x.paid||0));(ret||[]).forEach(x=>b-=Number(x.total||0));(mov||[]).forEach(x=>{if(x.movement_type==='payment')b-=Number(x.amount||0);else if(x.movement_type==='receipt')b+=Number(x.amount||0)})}
 if(alive)setBalance(b)}catch(e){if(alive)setError(e.message)}})();return()=>{alive=false}},[partyId,type,customer]);
 if(!partyId)return null;return <div className="rounded-xl border border-accent-line bg-accent-soft/30 px-3 py-2 text-sm"><span className="text-muted">صافي الحساب: </span><b className="text-accent">{balance===null&&!error?'جارٍ الحساب…':error?'تعذر حساب الرصيد':`${money(Math.abs(balance))} ${balance===0?'مسدد':customer?(balance>0?'لنا على العميل':'للعميل علينا'):(balance>0?'للمورد علينا':'لنا على المورد')}`}</b></div>
}
