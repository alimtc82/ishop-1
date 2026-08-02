import { useState } from 'react';
import ERPDocumentViewer from './ERPDocumentViewer';

const aliases={
 sales:'sales_invoice',sale:'sales_invoice',sales_invoice:'sales_invoice',sale_invoice:'sales_invoice',
 purchase:'purchase_invoice',purchases:'purchase_invoice',purchase_invoice:'purchase_invoice',
 sales_return:'sales_return',sale_return:'sales_return',
 purchase_return:'purchase_return',
 customer_collection:'customer_collection',collection:'customer_collection',receipt:'financial_movement',
 supplier_payment:'supplier_payment',payment:'financial_movement',
 expense:'expense',income:'financial_movement',financial_movement:'financial_movement',treasury_transfer:'financial_movement',transfer:'financial_movement'
};
export function normalizeDocumentType(type){return aliases[String(type||'').toLowerCase()]||null}
export default function DocumentLink({type,id,number,label,className=''}){
 const [open,setOpen]=useState(false); const normalized=normalizeDocumentType(type); const target=id??number;
 const text=label??number??id??'—';
 if(!normalized||target===null||target===undefined||target==='') return <span>{text}</span>;
 return <><button type="button" onClick={()=>setOpen(true)} className={`font-bold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent ${className}`}>{text}</button>{open&&<ERPDocumentViewer type={normalized} id={id} number={number} onClose={()=>setOpen(false)}/>}</>;
}
