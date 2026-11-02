const symbols=['✧','♡','♧','✶','◇'];

export function invitationIdFromPath(pathname,defaultId=1){const part=String(pathname||'').split('/').filter(Boolean)[0];return !part?String(defaultId):/^\d+$/.test(part)?part:null}

export function createGuestPatch(record,id,guest){
  const numericId=Number(id);if(!record||!Number.isInteger(numericId)||numericId<1||!guest?.name)throw new Error('invalid-guest-patch');
  const previous=Array.isArray(record.guests)?record.guests:[];
  const attending=Boolean(guest.is_attending);
  return {id:numericId,languages:record.languages,names:record.names,date:record.date,invitation:record.invitation,wish_block:record.wish_block,ceremonies:record.ceremonies,venue:record.venue,rsvp:record.rsvp,guests:[...previous,{name:String(guest.name).trim(),wish:String(guest.wish||'').trim(),guests_count:attending?Math.max(1,Number(guest.guests_count)||1):0,is_attending:attending}]};
}

function iso(value){const text=String(value||'');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text))throw new Error('invalid-date');return /(?:Z|[+-]\d{2}:\d{2})$/.test(text)?text:`${text}+06:00`}
function deadlineFrom(date){const d=new Date(`${date.slice(0,10)}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-14);return d.toISOString().slice(0,10)}
const pick=(object,language,defaultLanguage='ru')=>object?.[language]||object?.[defaultLanguage]||object?.ru||Object.values(object||{})[0]||{};

export function adaptXanoInvitation(record,fallback){
  const id=Number(record?.id??record?.priglosi_id),names=record?.names||{},first=names.groom??names.has,second=names.bride??names.wife;
  if(!Number.isInteger(id)||!first||!second||!Array.isArray(record.ceremonies))throw new Error('invalid-invitation');
  const date=iso(record.date),datePart=date.slice(0,10),ordered=[...record.ceremonies].sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
  const lastTime=ordered.at(-1)?.time||'23:00',endDate=iso(`${datePart}T${lastTime}:00`);
  const enabled=[...new Set((record.languages?.enabled||['ru']).filter(x=>['ru','ky','kk'].includes(x)))];if(!enabled.length)enabled.push('ru');
  const defaultLanguage=enabled.includes(record.languages?.default)?record.languages.default:enabled[0],locales={};
  for(const language of ['ru','ky','kk']){
    const base=fallback.locales?.[language]||fallback.locales?.ru||{},invitation=pick(record.invitation,language,defaultLanguage),venue=pick(record.venue?.content,language,defaultLanguage),wish=pick(record.wish_block?.content,language,defaultLanguage);
    locales[language]={...base,welcome:String(invitation.text||base.welcome||''),welcomeTitle:String(invitation.title||''),wishTitle:String(wish.title||''),wishText:String(wish.text||''),venue:{...(base.venue||{}),name:String(venue.name||''),type:String(venue.type||''),city:'',address:String(venue.address||'')},schedule:ordered.map((item,index)=>{const content=pick(item.content,language,defaultLanguage);return{time:String(item.time||''),title:String(content.title||''),description:String(content.text||''),symbol:symbols[index%symbols.length]}})};
  }
  const map=record.venue?.map||{};
  return {...fallback,backendId:id,dataDemo:false,names:{first:String(first),second:String(second)},date,endDate,rsvpDeadline:deadlineFrom(date),guests:Array.isArray(record.guests)?record.guests:[],enabledLanguages:enabled,defaultLanguage,wishBlock:{enabled:record.wish_block?.enabled===true},music:record.music||{enabled:false},map:{enabled:map.enabled===true,googleUrl:String(map.google_url||''),twoGisUrl:String(map.two_gis_url||'')},rsvp:{enabled:record.rsvp?.enabled!==false,allowGuestWish:record.rsvp?.allow_guest_wish!==false,maxGuests:Math.max(1,Number(record.rsvp?.max_guests)||10)},locales};
}
