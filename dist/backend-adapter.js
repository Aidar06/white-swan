const symbols=['✧','♡','♧','✶','◇'];

export function invitationIdFromPath(pathname,defaultId){
  const parts=String(pathname||'').split('/').filter(Boolean);
  if(!parts.length)return String(defaultId);
  const candidate=parts[0];
  return /^\d+$/.test(candidate)?candidate:null;
}

export function createGuestPatch(record,id,guest){
  const numericId=Number(id);
  if(!record||!Number.isInteger(numericId)||numericId<1||!guest?.name)throw new Error('invalid-guest-patch');
  const previous=Array.isArray(record.guests)?record.guests:[];
  return {...record,id:numericId,priglosi_id:Number(record.priglosi_id||numericId),guests:[...previous,{name:String(guest.name).trim(),wish:String(guest.wish||'').trim(),guests_count:Math.max(1,Number(guest.guests_count)||1),is_attending:Boolean(guest.is_attending)}]};
}

function bishkekIso(value){
  const text=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/.test(text))throw new Error('invalid-date');
  const withSeconds=text.length===16?text+':00':text;
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(withSeconds)?withSeconds:withSeconds+'+06:00';
}

function deadlineFrom(dateText){
  const date=new Date(dateText.slice(0,10)+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()-14);
  return date.toISOString().slice(0,10);
}

export function adaptXanoInvitation(record,fallback){
  if(!record||!Number.isInteger(record.priglosi_id)||!record.names?.has||!record.names?.wife||!Array.isArray(record.ceremonies)||!record.adress)throw new Error('invalid-invitation');
  const date=bishkekIso(record.date),datePart=date.slice(0,10),lastTime=record.ceremonies.at(-1)?.time||'23:00';
  const endDate=bishkekIso(`${datePart}T${lastTime}:00`);
  const city=String(record.adress.adrr||'').match(/(?:г\.\s*)?([^,]+)/i)?.[1]?.trim()||'Бишкек';
  const schedule=(locale)=>record.ceremonies.map((item,index)=>({time:String(item.time||''),title:String(item[locale==='ru'?'ceremony_ru':'ceremony_kg']||item.ceremony_ru||''),description:String(item[locale==='ru'?'text_ru':'text_kg']||item.text_ru||''),symbol:symbols[index%symbols.length]}));
  const venueRu={name:String(record.adress.name||''),type:String(record.adress.pl||''),city,address:String(record.adress.adrr||'')};
  const venueKy={...venueRu,type:venueRu.type==='Банкетный зал'?'Банкеттик зал':venueRu.type};
  return {...fallback,backendId:record.priglosi_id,dataDemo:false,names:{first:String(record.names.has),second:String(record.names.wife)},date,endDate,rsvpDeadline:deadlineFrom(date),guests:Array.isArray(record.guests)?record.guests:[],locales:{ru:{...fallback.locales.ru,venue:venueRu,schedule:schedule('ru')},ky:{...fallback.locales.ky,venue:venueKy,schedule:schedule('ky')}}};
}
