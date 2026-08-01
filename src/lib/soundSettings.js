export const SOUND_EVENTS=[
 ['systemSuccess','نجاح أي عملية','success'],['systemFailure','فشل أي عملية','failure'],['notification','إشعار جديد','notify'],['warning','تحذير','warning'],
 ['itemAdd','إضافة صنف إلى الفاتورة','pop'],['itemRemove','حذف صنف من الفاتورة','remove'],['saleSuccess','نجاح إتمام البيع','cash'],['barcodeSuccess','قراءة باركود ناجحة','scan'],['paymentSuccess','تحصيل / دفع ناجح','cash']
];
export const SOUND_LIBRARY=[
 {id:'success',name:'نجاح كلاسيكي',group:'نجاح',notes:[[659,.06],[880,.09],[1047,.14]]},{id:'successSoft',name:'نجاح هادئ',group:'نجاح',notes:[[523,.07],[659,.12]]},{id:'sparkle',name:'نجاح لامع',group:'نجاح',notes:[[784,.05],[988,.06],[1319,.11]]},
 {id:'failure',name:'فشل واضح',group:'فشل',notes:[[330,.09],[247,.16]]},{id:'failureSoft',name:'فشل هادئ',group:'فشل',notes:[[294,.08],[262,.13]]},{id:'errorDeep',name:'خطأ عميق',group:'فشل',notes:[[220,.10],[165,.18]]},
 {id:'notify',name:'إشعار',group:'إشعارات',notes:[[740,.06],[988,.10]]},{id:'bell',name:'جرس',group:'إشعارات',notes:[[988,.08],[1319,.16]]},{id:'chime',name:'رنين',group:'إشعارات',notes:[[523,.05],[784,.07],[1047,.13]]},
 {id:'warning',name:'تحذير',group:'تحذيرات',notes:[[392,.10],[392,.10]]},{id:'warningHigh',name:'تحذير مرتفع',group:'تحذيرات',notes:[[622,.08],[466,.08],[622,.12]]},{id:'alert',name:'تنبيه سريع',group:'تحذيرات',notes:[[880,.06],[660,.06],[880,.09]]},
 {id:'pop',name:'إضافة سريعة',group:'عمليات',notes:[[880,.07]]},{id:'remove',name:'حذف سريع',group:'عمليات',notes:[[420,.08]]},{id:'scan',name:'باركود',group:'عمليات',notes:[[760,.05],[920,.06]]},{id:'cash',name:'إتمام / دفع',group:'عمليات',notes:[[880,.05],[1109,.06],[1397,.12]]}
];
const KEY='ishop_sound_settings_v2';
const defaults=()=>({enabled:true,volume:.65,...Object.fromEntries(SOUND_EVENTS.flatMap(([k,,sound])=>[[k,true],[`${k}Sound`,sound]]))});
export function getSoundSettings(){try{return{...defaults(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaults()}}
export function setSoundSettings(v){localStorage.setItem(KEY,JSON.stringify(v));window.dispatchEvent(new Event('ishop-sound-settings'))}
export function playLibrarySound(id,volume){const sound=SOUND_LIBRARY.find(x=>x.id===id)||SOUND_LIBRARY[0];try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();let at=c.currentTime;for(const[f,d]of sound.notes){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(Math.max(.001,.075*volume),at);g.gain.exponentialRampToValueAtTime(.001,at+d);o.connect(g);g.connect(c.destination);o.start(at);o.stop(at+d);at+=d*.72}setTimeout(()=>c.close(),Math.max(250,(at-c.currentTime)*1000+200))}catch{}}
export function playSystemSound(kind='systemSuccess'){const s=getSoundSettings();if(!s.enabled||s[kind]===false)return;playLibrarySound(s[`${kind}Sound`]||'notify',Number(s.volume??.65))}
