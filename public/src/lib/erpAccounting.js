import { supabase } from './supabase';
const now=()=>Date.now();
export async function postInvoiceAccounting({kind,id,number,date,total,paymentType,treasuryId,partyId,partyName,branch}){
 if(!['purchase','sale'].includes(kind)) throw Error('نوع فاتورة غير صالح.');
 if(!['cash','credit'].includes(paymentType)) throw Error('حدد طريقة الدفع نقدي أو آجل.');
 const ref=kind==='purchase'?'purchase_invoice':'sales_invoice';
 if(paymentType==='cash'){
  if(!treasuryId) throw Error(kind==='purchase'?'حدد الخزينة المدفوع منها.':'حدد الخزينة المستلمة.');
  const {error}=await supabase.from('financial_movements').insert({movement_number:`FM-${now()}`,treasury_id:Number(treasuryId),movement_type:kind==='purchase'?'payment':'receipt',movement_date:date,amount:Number(total),party_type:kind==='purchase'?'supplier':'customer',party_id:partyId||null,party_name:partyName||null,reference_type:ref,reference_id:String(id),notes:`${kind==='purchase'?'سداد':'تحصيل'} ${number}`}); if(error)throw error;
 }else{
  if(!partyId) throw Error(kind==='purchase'?'المورد مطلوب للبيع الآجل.':'العميل مطلوب للبيع الآجل.');
  const {error}=await supabase.from('dues').insert({due_number:`DUE-${now()}`,due_type:kind==='purchase'?'payable':'receivable',party_type:kind==='purchase'?'supplier':'customer',party_id:partyId,party_name:partyName||null,branch:branch||null,due_date:date,amount:Number(total),reference_type:ref,reference_id:String(id),notes:`${kind==='purchase'?'فاتورة شراء':'فاتورة بيع'} آجلة ${number}`}); if(error)throw error;
 }
}
export async function postReturnAccounting({kind,id,number,date,total,settlementType,treasuryId,partyId,partyName,branch,originalInvoiceId}){
 if(!['purchase','sale'].includes(kind)) throw Error('نوع مرتجع غير صالح.');
 if(!['cash','credit'].includes(settlementType)) throw Error('حدد تسوية المرتجع نقدي أو على الحساب.');
 const ref=kind==='purchase'?'purchase_return':'sales_return';
 if(settlementType==='cash'){
  if(!treasuryId) throw Error(kind==='purchase'?'حدد الخزينة المستلمة من المورد.':'حدد الخزينة التي سيتم رد المبلغ منها.');
  const {error}=await supabase.from('financial_movements').insert({movement_number:`FM-${now()}`,treasury_id:Number(treasuryId),movement_type:kind==='purchase'?'receipt':'payment',movement_date:date,amount:Number(total),party_type:kind==='purchase'?'supplier':'customer',party_id:partyId||null,party_name:partyName||null,reference_type:ref,reference_id:String(id),notes:`تسوية نقدية للمرتجع ${number}`}); if(error)throw error; return;
 }
 const invoiceRef=kind==='purchase'?'purchase_invoice':'sales_invoice';
 const {data:due,error:de}=await supabase.from('dues').select('*').eq('reference_type',invoiceRef).eq('reference_id',String(originalInvoiceId)).neq('status','cancelled').maybeSingle(); if(de)throw de;
 let left=Number(total);
 if(due){const remaining=Math.max(0,Number(due.amount)-Number(due.settled_amount));const applied=Math.min(left,remaining);if(applied>0){const settled=Number(due.settled_amount)+applied;const {error}=await supabase.from('dues').update({settled_amount:settled,status:settled>=Number(due.amount)?'settled':'partial'}).eq('id',due.id);if(error)throw error;left-=applied}}
 if(left>0){const {error}=await supabase.from('dues').insert({due_number:`DUE-${now()}`,due_type:kind==='purchase'?'receivable':'payable',party_type:kind==='purchase'?'supplier':'customer',party_id:partyId||null,party_name:partyName||null,branch:branch||null,due_date:date,amount:left,reference_type:ref,reference_id:String(id),notes:`رصيد ناتج عن المرتجع ${number}`});if(error)throw error}
}
