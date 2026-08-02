import {supabase} from './supabase';
export async function auditERP(module,action,{entityType=null,entityId=null,documentNumber=null,details={}}={}){
 try{await supabase.from('erp_audit_log').insert({module,action,entity_type:entityType,entity_id:entityId==null?null:String(entityId),document_number:documentNumber,details});}catch{/* سجل المراجعة لا يعطل العملية الأصلية */}
}
