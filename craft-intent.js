/* A bounded design-intent contract. These are visual choices, never an ingredient formula. */
(()=>{'use strict';
const moods=new Map([
 ['slow',{name:'留白',key:'settle',family:'wood'}],
 ['focus',{name:'山序',key:'focus',family:'herbal'}],
 ['fresh',{name:'朝光',key:'spark',family:'fresh'}],
 ['warm',{name:'暖枝',key:'warm',family:'floral'}],
 ['joy',{name:'若喜',key:'joy',family:'floral'}]
]);
const beads=new Map([
 ['sandalwood','檀香意象'],['cedar','雪松意象'],['citrus','陈皮意象'],
 ['osmanthus','桂花意象'],['jasmine','茉莉意象'],['mugwort','艾草意象'],
 ['agar','沉香意象'],['amber','琥珀色点缀']
]);
const palettes=new Map([['natural','原木日光'],['blue','山青月白'],['red','朱红暖枝'],['lilac','微醺花园']]);
const shapes=new Map([['round','圆珠'],['oval','米珠'],['faceted','切面珠']]);
const sizes=new Set([16,20,24]);
const hex=/^#[0-9a-f]{6}$/i,workId=/^[A-Za-z0-9_-]{1,80}$/;
function plain(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);}
function safeName(value,fallback){return [...value.replace(/[\u0000-\u001f\u007f]/g,'').trim()].slice(0,24).join('')||fallback;}
function normalize(payload){
 try{
  if(!plain(payload)||payload.type!=='xiangyu-craft-transfer'||payload.v!==1||typeof payload.workId!=='string'||!workId.test(payload.workId))return null;
  const raw=payload.state;
  if(!plain(raw)||raw.v!==1||!moods.has(raw.mood)||!palettes.has(raw.palette)||!shapes.has(raw.shape)||!sizes.has(raw.size))return null;
  if(raw.mode!=='free'&&raw.mode!=='challenge')return null;
  if(!Number.isInteger(raw.challenge)||raw.challenge<0||raw.challenge>=4)return null;
  if(typeof raw.name!=='string'||[...raw.name].length>24||!Array.isArray(raw.beads)||raw.beads.length!==raw.size)return null;
  const cleanBeads=[];let hasScented=false;
  for(const b of raw.beads){
   // Partial bracelets can remain game drafts, but cannot become purchase intentions.
   if(!plain(b)||!beads.has(b.id)||!shapes.has(b.shape)||typeof b.color!=='string'||!hex.test(b.color))return null;
   if(b.id!=='amber')hasScented=true;
   cleanBeads.push({id:b.id,shape:b.shape,color:b.color.toLowerCase()});
  }
  if(!hasScented)return null;
  const mood=moods.get(raw.mood);
  const state={v:1,mood:raw.mood,palette:raw.palette,shape:raw.shape,size:raw.size,beads:cleanBeads,name:safeName(raw.name,mood.name),mode:'free',challenge:0};
  const rows=[];
  for(const [id,name] of beads){
   const selected=cleanBeads.filter(b=>b.id===id);if(!selected.length)continue;
   const shapeCounts={round:0,oval:0,faceted:0},colors=[];
   for(const b of selected){shapeCounts[b.shape]++;if(!colors.includes(b.color))colors.push(b.color);}
   rows.push({id,name,count:selected.length,shapeCounts,colors});
  }
  return {v:1,workId:payload.workId,state,summary:{name:state.name,moodKey:mood.key,moodName:mood.name,familyKey:mood.family,paletteName:palettes.get(state.palette),count:state.size,rows}};
 }catch{return null;}
}
function text(value){
 // Rebuild summary from the bounded state; never trust cached or caller-written prose.
 const clean=normalize(value&&{type:'xiangyu-craft-transfer',v:value.v,workId:value.workId,state:value.state});
 if(!clean)return '';
 const {state,summary}=clean;
 return [
  '工坊数字作品｜'+summary.name,
  '作品编号：'+clean.workId,
  '心境：'+summary.moodName,
  '配色意向：'+summary.paletteName,
  '总珠位：'+summary.count+' 颗（游戏画面数量，非实际尺寸或重量）',
  '按珠数的视觉选择：',
  ...summary.rows.map(r=>r.name+' '+r.count+' 颗；珠型：'+Object.entries(r.shapeCounts).filter(([,n])=>n>0).map(([id,n])=>shapes.get(id)+' '+n+'颗').join('、')+'；配色：'+r.colors.join('、')),
  '逐颗顺序（从第1位起）：',
  ...state.beads.map((b,i)=>String(i+1).padStart(2,'0')+'. '+beads.get(b.id)+' / '+shapes.get(b.shape)+' / '+b.color),
  '以上仅为游戏视觉设计意向，香材名称用于气味联想，不代表本店实际材料清单。',
  '实际香方、规格、混合可制作性由店主确认；非实际原料配比。'
 ].join('\n');
}
window.XYCraft=Object.freeze({normalize,text});
})();
