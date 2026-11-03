/** 香遇 artwork export. Canvas-only, no remote assets, no HTML interpolation.
 * createArtwork({state,recipe,mood,beads,palettes}, 'card'|'bracelet') -> Promise<Blob>
 * recipe.rows uses bead-count percentages, never a manufacturing formula.
 */
const INK = '#193c56';
const RED = '#c7503e';
const PAPER = '#f6f0e6';
const SERIF = '"Songti SC","STSong","Noto Serif CJK SC",serif';
const SANS = '"PingFang SC","Microsoft YaHei",sans-serif';
const hex = (value, fallback = '#9b7050') => typeof value === 'string' && /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(value) ? value : fallback;
const clean = (value, fallback = '', length = 60) => [...String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, '')].slice(0, length).join('');
const lookup = (collection, id) => Array.isArray(collection) ? collection.find(item => item.id === id) : collection?.[id];
function rng(seed) { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); }
function hash(value) { let n = 2166136261; for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function text(ctx, value, x, y, size, color = INK, family = SANS, weight = '400') {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${family}`; ctx.fillText(clean(value), x, y);
}
function fit(ctx, value, x, y, max, size, color = INK, family = SANS, weight = '400') {
  const v = clean(value, '', 40); let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(v).width > max && s > 20) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
  ctx.fillStyle = color; ctx.fillText(v, x, y);
}
function splitLines(ctx, value, maxWidth) {
  const lines = []; let line = '';
  for (const char of value) {
    if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line); line = ''; }
    line += char;
  }
  if (line) lines.push(line);
  return lines;
}
/** Fit the complete validated title before drawing; names use Unicode code points. */
export function layoutTitle(ctx, value, {maxWidth = 335, maxLines = 3, maxSize = 62, minSize = 24} = {}) {
  const title = clean(value, '我的心情香串', 24); let size = maxSize, lines;
  do {
    ctx.font = `600 ${size}px ${SERIF}`;
    lines = splitLines(ctx, title, maxWidth);
    if (lines.length <= maxLines || size <= minSize) break;
    size = Math.max(minSize, size - 2);
  } while (true);
  return {title, lines, size, lineHeight: Math.ceil(size * 1.28)};
}
function wrap(ctx, value, x, y, maxWidth, lineHeight, maxLines = 3) {
  const allLines = splitLines(ctx, clean(value, '', 120), maxWidth);
  const lines = allLines.slice(0, maxLines);
  if (allLines.length > maxLines && lines.length) {
    let tail = [...lines.at(-1)];
    while (tail.length && ctx.measureText(tail.join('') + '…').width > maxWidth) tail.pop();
    lines[lines.length - 1] = tail.join('') + '…';
  }
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
}
function paper(ctx, w, h) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
  const rand = rng(1742); for (let i = 0; i < 12500; i++) { ctx.fillStyle = i % 2 ? 'rgba(55,36,14,.025)' : 'rgba(255,255,255,.15)'; ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.3, 1 + rand() * 1.3); }
  ctx.strokeStyle = '#d5cabb'; ctx.lineWidth = 1.5; ctx.strokeRect(30, 30, w - 60, h - 60);
}
function beadPath(ctx, radius, shape) {
  ctx.beginPath();
  if (shape === 'faceted') { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const x = Math.cos(a) * radius, y = Math.sin(a) * radius; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); } ctx.closePath(); }
  else ctx.ellipse(0, 0, shape === 'oval' ? radius * 0.81 : radius, shape === 'oval' ? radius * 1.08 : radius, 0, 0, Math.PI * 2);
}
/** One tactile bead, drawn with deterministic grain to keep exports consistent. */
export function drawBead(ctx, bead, x, y, radius, angle = 0, seed = 0) {
  const color = hex(bead.color); const shape = ['round','oval','faceted'].includes(bead.shape) ? bead.shape : 'round';
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.shadowColor = 'rgba(38,25,15,.27)'; ctx.shadowBlur = radius * .35; ctx.shadowOffsetY = radius * .18;
  beadPath(ctx, radius, shape); ctx.fillStyle = color; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); beadPath(ctx, radius, shape); ctx.clip();
  const shade = ctx.createRadialGradient(-radius * .36, -radius * .42, radius * .05, radius * .18, radius * .24, radius * 1.24);
  shade.addColorStop(0, 'rgba(255,255,255,.46)'); shade.addColorStop(.43, 'rgba(255,255,255,.03)'); shade.addColorStop(1, 'rgba(22,14,8,.55)'); ctx.fillStyle = shade; ctx.fillRect(-radius*1.3,-radius*1.3,radius*2.6,radius*2.6);
  const rand = rng(seed + 97); ctx.lineWidth = Math.max(.45, radius * .018);
  for (let j = 0; j < 16; j++) { const yy = (rand() * 2 - 1) * radius; ctx.strokeStyle = j % 2 ? 'rgba(30,19,9,.12)' : 'rgba(255,246,212,.14)'; ctx.beginPath(); ctx.moveTo(-radius*1.2,yy); ctx.bezierCurveTo(-radius*.3,yy-radius*.22, radius*.3,yy+radius*.2,radius*1.2,yy-radius*.05); ctx.stroke(); }
  for(let j=0;j<45;j++) { ctx.fillStyle = j % 3 ? 'rgba(23,14,7,.08)' : 'rgba(255,250,235,.22)'; ctx.beginPath(); ctx.arc((rand()*2-1)*radius,(rand()*2-1)*radius,.5+rand()*radius*.018,0,Math.PI*2); ctx.fill(); }
  if (shape === 'faceted') { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(12,20,28,.07)'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*radius,Math.sin(a)*radius); ctx.lineTo(Math.cos(a+Math.PI*.2)*radius,Math.sin(a+Math.PI*.2)*radius); ctx.closePath(); ctx.fill(); } }
  ctx.restore();
  beadPath(ctx, radius, shape); ctx.strokeStyle = 'rgba(35,25,16,.14)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-radius*.28,-radius*.42,radius*.24,radius*.1,-.4,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,.27)';ctx.fill();
  ctx.beginPath(); ctx.ellipse(0,-radius*.9,radius*.08,radius*.045,0,0,Math.PI*2); ctx.fillStyle='rgba(24,16,10,.3)';ctx.fill();
  ctx.restore();
}
function bracelet(ctx, state, catalog, cx, cy, ringRadius) {
  const arr = Array.isArray(state.beads) ? state.beads.slice(0, 30) : [];
  const n = Math.max(1, arr.length || Number(state.size) || 20);
  ctx.save();
  // A cut-paper mat under the rendered string.
  ctx.beginPath();ctx.ellipse(cx,cy,ringRadius+79,ringRadius+69,-.08,0,Math.PI*2);ctx.fillStyle='#e5e2d4';ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,ringRadius+57,0,Math.PI*2);ctx.fillStyle='#eeebe0';ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,ringRadius,0,Math.PI*2);ctx.strokeStyle='#c2a678';ctx.lineWidth=3;ctx.stroke();
  const br = Math.min(46, ringRadius * Math.sin(Math.PI / n) * .91);
  for (let i=0;i<n;i++) {
    const a = -Math.PI / 2 + i / n * Math.PI * 2;
    const x = cx + Math.cos(a) * ringRadius, y = cy + Math.sin(a) * ringRadius;
    const item = arr[i];
    if (item) { const meta = lookup(catalog,item.id); drawBead(ctx,{...item,color:hex(item.color,meta?.color || '#9b7050')},x,y,br,a+Math.PI/2,hash(`${i}:${item.id}:${item.color}`)); }
    else { ctx.beginPath();ctx.arc(x,y,br*.72,0,Math.PI*2);ctx.setLineDash([3,6]);ctx.strokeStyle='rgba(100,96,80,.2)';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]); }
  }
  ctx.restore();
}
function normalRows(recipe, state, catalog) {
  let rows = Array.isArray(recipe) ? recipe : recipe?.rows || recipe?.items || recipe?.ingredients;
  if (!Array.isArray(rows)) {
    const counts = new Map(); for (const item of state.beads || []) if (item?.id) counts.set(item.id,(counts.get(item.id)||0)+1);
    const total = [...counts.values()].reduce((a,b)=>a+b,0);
    rows = [...counts].map(([id,count])=>({id,name:lookup(catalog,id)?.name||id,count,percent:Math.round(count/total*100),color:lookup(catalog,id)?.color}));
  }
  return rows.slice(0,12).map(row => ({name:clean(row.name || lookup(catalog,row.id)?.name || row.id, '香珠', 16), count:Number(row.count)||0, percent:Number.isFinite(Number(row.percent))?Number(row.percent):0, color:hex(row.color,lookup(catalog,row.id)?.color||'#9b7050')}));
}
function card(ctx, data) {
  const {state, recipe, mood, beads} = data; const w=1080,h=1440;paper(ctx,w,h);
  text(ctx,'香遇',70,110,38,INK,SERIF,'600');text(ctx,'XIANGYU  /  SCENT & SOUL',185,107,16,INK,SANS,'600');
  ctx.beginPath();ctx.moveTo(70,136);ctx.lineTo(1010,136);ctx.strokeStyle=INK;ctx.lineWidth=1.3;ctx.stroke();
  text(ctx,'把这一刻，串成一缕香。',72,188,22,'#68747a');
  fit(ctx, state.name || mood?.title || '我的心情香串',70,278,800,72,INK,SERIF,'600');
  ctx.save();ctx.translate(936,232);ctx.rotate(.13);ctx.fillStyle=RED;rounded(ctx,-55,-55,110,110,7);ctx.fill();text(ctx,'随心',-34,-2,27,'#fff9ef',SERIF);text(ctx,'合香',-34,34,27,'#fff9ef',SERIF);ctx.restore();
  bracelet(ctx,state,beads,540,590,228);
  ctx.textAlign='center';text(ctx,'一珠一香 · 随心成串',540,575,24,INK,SERIF);text(ctx,'MADE BY ME',540,611,12,'#7d8074',SANS,'600');ctx.textAlign='left';
  const total=(state.beads||[]).filter(Boolean).length;
  ctx.fillStyle=INK;rounded(ctx,315,905,450,58,29);ctx.fill();ctx.textAlign='center';text(ctx,`${clean(mood?.name || mood?.title || '随心', '', 14)}  ·  ${total} 颗香珠`,540,943,22,'#fffaf0',SANS,'500');ctx.textAlign='left';
  const rows=normalRows(recipe,state,beads);text(ctx,'我的合香灵感',70,1024,28,INK,SERIF,'600');text(ctx,'按香珠颗数记录',789,1024,17,'#7a7d78');
  ctx.beginPath();ctx.moveTo(70,1045);ctx.lineTo(1010,1045);ctx.strokeStyle='#ccc4b7';ctx.stroke();
  const cols=rows.length>6?3:2;const colw=940/cols;const rowGap=rows.length>9?50:66;
  for(let i=0;i<rows.length;i++) { const r=rows[i],x=70+(i%cols)*colw,y=1087+Math.floor(i/cols)*rowGap;ctx.beginPath();ctx.arc(x+10,y-8,9,0,Math.PI*2);ctx.fillStyle=r.color;ctx.fill();fit(ctx,r.name,x+29,y,colw-150,21);text(ctx,`${r.count}颗 · ${r.percent}%`,x+colw-120,y,17,'#727970'); }
  const noteY=Math.max(1268,1087+Math.ceil(rows.length/cols)*rowGap+15);
  ctx.font=`19px ${SERIF}`;ctx.fillStyle='#5d706a';wrap(ctx,mood?.story||mood?.note||'给日常留一点属于自己的气味。',70,Math.min(noteY,1292),920,27,1);
  text(ctx,'游戏搭配示意 · 非实际配方 · 不代表实际成品',70,1356,17,'#808079');text(ctx,'仙作汇 × 香遇合香工坊',70,1385,15,'#808079');
}
function effect(ctx,data) {
  const {state,recipe,mood,beads}=data;paper(ctx,1400,1100);
  ctx.save();ctx.translate(128,100);ctx.rotate(-.045);ctx.fillStyle=INK;ctx.fillRect(-20,-27,285,71);text(ctx,'香遇 · 合香工坊',0,18,28,'#fff7e7',SERIF);ctx.restore();
  text(ctx,'MY SCENT, MY MOMENT.',110,230,17,RED,SANS,'600');
  const titleLayout=layoutTitle(ctx,state.name||mood?.title||'我的心情香串');ctx.fillStyle=INK;
  titleLayout.lines.forEach((line,i)=>ctx.fillText(line,106,330+i*titleLayout.lineHeight));
  text(ctx,`${clean(mood?.name||'随心')} / ${(state.beads||[]).filter(Boolean).length} 颗`,110,632,24,INK);
  ctx.font=`22px ${SERIF}`;ctx.fillStyle='#63726b';wrap(ctx,mood?.story||mood?.note||'让心情，有一处柔软的停靠。',110,690,320,36,3);
  bracelet(ctx,state,beads,916,533,290);
  const rows=normalRows(recipe,state,beads);const names=rows.map(r=>`${r.name} ${r.count}颗`).join(' · ');ctx.font=`20px ${SANS}`;ctx.fillStyle=INK;wrap(ctx,names,110,955,1170,32,2);
  text(ctx,'游戏搭配示意 · 非实际配方 · 不代表实际成品',110,1050,17,'#808079');
}
export async function createArtwork(data, kind='card') {
  if (!data?.state || !Array.isArray(data.state.beads)) throw new Error('缺少手串数据，请先完成一串。');
  if (!data.state.beads.some(Boolean)) throw new Error('先放入一颗香珠，再导出作品。');
  const canvas=document.createElement('canvas');canvas.width=kind==='bracelet'?1400:1080;canvas.height=kind==='bracelet'?1100:1440;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前浏览器暂不支持图片导出。');
  if(kind==='bracelet')effect(ctx,data);else card(ctx,data);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片生成失败，请重试。')),'image/png'));
}
export function downloadBlob(blob, filename='香遇_我的香方卡.png') {
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=clean(filename,'香遇_作品.png',100);a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
