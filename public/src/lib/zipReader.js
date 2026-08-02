// Lightweight browser ZIP reader for image-import archives (stored/deflate entries).
// Avoids adding a runtime dependency and does not extract files outside the browser.
const u16=(v,o)=>v.getUint16(o,true),u32=(v,o)=>v.getUint32(o,true);
export async function readZipEntries(file){
  const buf=await file.arrayBuffer(), v=new DataView(buf), bytes=new Uint8Array(buf);
  let eocd=-1; for(let i=Math.max(0,buf.byteLength-65557);i<=buf.byteLength-22;i++) if(u32(v,i)===0x06054b50)eocd=i;
  if(eocd<0) throw new Error('ZIP غير صالح أو غير مدعوم.');
  const count=u16(v,eocd+10), central=u32(v,eocd+16); let p=central; const out=[];
  const dec=new TextDecoder('utf-8');
  for(let n=0;n<count;n++){
    if(u32(v,p)!==0x02014b50) throw new Error('تعذر قراءة فهرس ZIP.');
    const method=u16(v,p+10), compSize=u32(v,p+20), nameLen=u16(v,p+28), extraLen=u16(v,p+30), commentLen=u16(v,p+32), local=u32(v,p+42);
    const name=dec.decode(bytes.slice(p+46,p+46+nameLen)); p+=46+nameLen+extraLen+commentLen;
    if(name.endsWith('/')) continue;
    if(u32(v,local)!==0x04034b50) continue;
    const ln=u16(v,local+26), le=u16(v,local+28), start=local+30+ln+le, compressed=bytes.slice(start,start+compSize);
    out.push({name,async blob(){let data;if(method===0)data=compressed;else if(method===8){if(typeof DecompressionStream==='undefined')throw new Error('المتصفح لا يدعم فك ZIP. استخدم Chrome/Safari حديث.');const ds=new DecompressionStream('deflate-raw');data=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(ds)).arrayBuffer())}else throw new Error(`طريقة ضغط غير مدعومة داخل ZIP (${method}).`);return new Blob([data])}});
  }
  return out;
}
