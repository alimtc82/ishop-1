export const normProductSearch=v=>String(v??'').trim().toLocaleLowerCase('ar-EG');
export const productMatches=(p,q)=>{
 const t=normProductSearch(q);if(!t)return true;
 return [p?.name,p?.sku,p?.barcode,p?.product_brands?.name].some(v=>normProductSearch(v).includes(t));
};
export const stockQty=(movements,productId,branch='')=>(movements||[]).filter(m=>String(m.product_id)===String(productId)&&(!branch||m.branch===branch)).reduce((s,m)=>{
 const q=Number(m.quantity||0),type=String(m.movement_type||'').toLowerCase();
 if(['purchase','transfer_in','adjustment_in','sale_return','opening','opening_stock','opening_balance'].includes(type))return s+q;
 if(['sale','transfer_out','adjustment_out','purchase_return'].includes(type))return s-q;
 return s+q; // existing movement tables may already store signed quantities
},0);
export const hasPositiveStock=(movements,productId,branch='')=>stockQty(movements,productId,branch)>0;
