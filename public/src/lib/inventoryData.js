import {supabase} from './supabase';

// Supabase/PostgREST returns at most 1000 rows by default. Inventory must never
// calculate balances from a truncated movement ledger, so fetch it page-by-page.
export async function fetchAllProductMovements(columns='product_id,movement_type,quantity,branch'){
  const pageSize=1000, rows=[];
  for(let from=0;;from+=pageSize){
    const {data,error}=await supabase.from('product_movements').select(columns).order('id',{ascending:true}).range(from,from+pageSize-1);
    if(error)throw error;
    rows.push(...(data||[]));
    if(!data||data.length<pageSize)break;
  }
  return rows;
}
