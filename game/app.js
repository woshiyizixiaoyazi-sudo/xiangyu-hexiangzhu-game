import { MOODS,BEADS,PALETTES,SHAPES,CHALLENGES,createState,validateState,addBead,deriveRecipe,getRecommendation,checkChallenge,getAchievements,encodeShare,decodeShare } from './game-core.js';
import { createArtwork,downloadBlob } from './card-export.js';
import { PATTERNS,createPattern,mirrorBeads } from './patterns.js';
import { readSave,writeSave,readPrevious } from './storage.js';
const $=id=>document.getElementById(id), BM=Object.fromEntries(BEADS.map(b=>[b.id,b]));
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=createState(), works=[], completed=[], sound=false, storageOK=true, history=[], selected=null, activeBead='sandalwood', selectedColor=null, toastTimer, audio, artURL, busy=false, resultId=null;
let sharedIncoming=null, modalVersion=0, previewGeneration=0, previewTimer, planTransfer=null, planTransferSerial=0;
let imageBusy=false, readyCard=null, collectionQuery='', collectionMood='all', collectionSort='newest';
function isCompleteWork(raw){const clean=validateState(raw);return clean&&clean.beads.every(Boolean)&&deriveRecipe(clean).scentedTotal>0?clean:null;}
function progressFrom(raw){return Array.isArray(raw)?[...new Set(raw.filter(x=>Number.isInteger(x)&&x>=0&&x<CHALLENGES.length))]:[];}
function clearSharedHash(){try{window.history.replaceState(null,'',location.pathname+location.search);}catch{}}
let restoredPrevious=false;
try{const saved=readSave(localStorage);storageOK=!['invalid','unavailable'].includes(saved.status);restoredPrevious=saved.status==='recovered';if(saved.data){({draft:state,works,completed,sound}=saved.data);}}catch{storageOK=false;}
const hash=new URLSearchParams(location.hash.slice(1));if(hash.has('design')){const incoming=decodeShare(hash.get('design'));if(incoming)sharedIncoming={...incoming,mode:'free'};else setTimeout(()=>toast('分享内容不完整，已打开你的工坊。'),300);}
function save(){let saved;try{saved=writeSave(localStorage,{v:1,draft:state,works,completed,sound});}catch{saved={ok:false};}storageOK=saved.ok;$('saveStatus').textContent=saved.ok?(saved.backupOK?'草稿已自动保存':'草稿已保存，建议导出备份'):'暂无法存档，请导出备份';updateCount();}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function tone(kind='bead'){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const now=audio.currentTime;const notes=kind==='finish'?[523.25,659.25,783.99]:kind==='undo'?[330]:[440+Math.random()*160];notes.forEach((freq,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,now+i*.1);g.gain.linearRampToValueAtTime(.065,now+i*.1+.01);g.gain.exponentialRampToValueAtTime(.001,now+i*.1+.3);o.connect(g);g.connect(audio.destination);o.start(now+i*.1);o.stop(now+i*.1+.32);});}catch{sound=false;renderSound();save();toast('此浏览器暂不支持音效。');}}
function renderSound(){$('soundToggle').setAttribute('aria-pressed',String(sound));$('soundToggle').setAttribute('aria-label',sound?'关闭音效':'开启音效');$('soundToggle').innerHTML=`♫<span>音效${sound?'开':'关'}</span>`;}
function updateCount(){$('workCount').textContent=works.length;}
function commit(next,{animate=null,quiet=false}={}){if(busy){toast('正在合香，请稍候。');return false;}const clean=validateState(next);if(!clean)return;history.push(clone(state));if(history.length>60)history.shift();state=clean;resultId=null;render(animate);save();if(!quiet)tone();}
function beadVisual(b,shape='round',color){return `<span class="bead-visual shape-${esc(shape)}" style="--bead-color:${color||b.color}"></span>`;}
function renderControls(){const mood=getRecommendation(state.mood);$('moodOptions').innerHTML=MOODS.map(m=>`<button class="mood-chip" data-mood="${m.id}" aria-pressed="${m.id===state.mood}" title="${m.name}"><span class="mood-icon" aria-hidden="true">${m.icon}</span>${({slow:'想慢下来',focus:'专注一点',fresh:'来点新鲜',warm:'温柔陪伴',joy:'记录开心'})[m.id]}</button>`).join('');$('recommendation').innerHTML=`<span class="rec-tag">今日推荐</span><p>${esc(mood.title)} · ${esc(mood.scent)}</p><p>${esc(mood.story)}</p><p>试试 ${mood.beadIds.map(id=>esc(BM[id].name)).join(' + ')}</p>`;$('beadOptions').innerHTML=BEADS.map(b=>`<button class="bead-tile" data-bead="${b.id}" aria-pressed="${activeBead===b.id}" aria-label="添加${b.name}" title="${b.info}">${beadVisual(b)}<b>${b.id==='amber'?'琥珀点缀':b.name}</b><small>${b.family}${!b.scented?' · 无香':''}</small></button>`).join('');$('activeBeadInfo').textContent=BM[activeBead].info;$('shapeOptions').innerHTML=SHAPES.map(s=>`<button data-shape="${s.id}" aria-pressed="${s.id===state.shape}">${s.name}</button>`).join('');$('paletteOptions').innerHTML=PALETTES.map(p=>`<button data-palette="${p.id}" aria-pressed="${p.id===state.palette}"><i class="palette-dot" style="background:${p.colors[0]}"></i>${p.name.slice(0,2)}</button>`).join('');renderColors();$('sizeSelect').value=state.size;}
function renderColors(){const p=PALETTES.find(p=>p.id===state.palette);if(selectedColor&&!p.colors.includes(selectedColor))selectedColor=null;$('colorOptions').innerHTML=`<button data-color="natural" title="保留香珠原色" aria-label="保留香珠原色" aria-pressed="${selectedColor===null}" style="background:conic-gradient(#b68e5e,#799578,#e4dfca,#b68e5e)"></button>`+p.colors.map((c,i)=>`<button data-color="${c}" title="${p.name}色 ${i+1}" aria-label="${p.name}点缀色 ${i+1}" aria-pressed="${selectedColor===c}" style="background:${c}"></button>`).join('');$('paletteLabel').textContent=p.name;}
function rememberFocus(){
  const active=document.activeElement;
  if(!active?.dataset)return null;
  for(const key of ['slot','mood','shape','palette','bead','color'])if(active.dataset[key]!==undefined)return {key,value:active.dataset[key]};
  return null;
}
function returnFocus(saved){if(saved)document.querySelector(`[data-${saved.key}="${saved.value}"]`)?.focus({preventScroll:true});}
function ringSVG(design,small=false){
  const n=design.size,rad=34,d=rad*Math.sin(Math.PI/n)*.95;
  const beads=design.beads.map((b,i)=>{const a=i/n*Math.PI*2-Math.PI/2,x=50+Math.cos(a)*rad,y=50+Math.sin(a)*rad;
    if(!b)return `<circle cx="${x}" cy="${y}" r="${d*.65}" fill="none" stroke="#b5bbad" stroke-width=".6" stroke-dasharray="1 2"/>`;
    if(b.shape==='oval')return `<ellipse cx="${x}" cy="${y}" rx="${d*.8}" ry="${d}" fill="${b.color}" stroke="#203d5028" stroke-width=".5"/>`;
    if(b.shape==='faceted')return `<polygon points="${Array.from({length:8},(_,j)=>{const t=j*Math.PI/4;return `${x+Math.cos(t)*d},${y+Math.sin(t)*d}`;}).join(' ')}" fill="${b.color}" stroke="#203d5028" stroke-width=".5"/>`;
    return `<circle cx="${x}" cy="${y}" r="${d}" fill="${b.color}" stroke="#203d5028" stroke-width=".5"/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" ${small?'class="mini-string"':'class="work-ring"'} aria-hidden="true"><circle cx="50" cy="50" r="34" fill="none" stroke="#bca47a" stroke-width=".7"/>${beads}</svg>`;
}
function render(animate){const savedFocus=rememberFocus();renderControls();const r=deriveRecipe(state), mood=getRecommendation(state.mood);const d=state.size===24?8.6:state.size===20?10.3:12.8;const radius=33;const slots=state.beads.map((b,i)=>{const a=(i/state.size*Math.PI*2)-Math.PI/2;return `<button class="slot ${b?'filled':'empty'} ${selected===i?'selected':''} ${animate===i?'just-added':''}" data-slot="${i}" aria-label="第 ${i+1} 颗：${b?BM[b.id].name+'，点击选中':'空位，点击选择'}" aria-pressed="${selected===i}" style="left:${50+Math.cos(a)*radius}%;top:${50+Math.sin(a)*radius}%;--d:${d}%">${b?beadVisual(BM[b.id],b.shape,b.color):''}</button>`;}).join('');$('bracelet').innerHTML=slots;$('beadCount').textContent=`${r.total} / ${state.size} 颗`;$('centerTitle').innerHTML=r.full?`${esc(state.name)}<br>今日已成串`:'一颗一颗<br>慢慢来';$('centerTitle').classList.toggle('long-name',r.full&&[...state.name].length>8);$('centerIcon').textContent=r.full?'✧':mood.icon;$('pieceTitle').textContent=r.total?state.name:'给今天，起个名字。';$('pieceInfo').textContent=r.full?`${r.scentKinds} 种香珠 · ${r.decorativeTotal} 颗点缀 · 等你落款`:r.total?`还有 ${state.size-r.total} 颗，把喜欢慢慢放进去。`:'填满珠圈，就能合成你的专属香方。';$('undoButton').disabled=!history.length;$('removeButton').disabled=selected===null||!state.beads[selected];$('clearButton').disabled=!r.total;$('rotateButton').disabled=!r.total;$('fillButton').disabled=r.full;$('synthesizeButton').textContent=r.full?'合成香方 ↗':`合成香方 (${r.total}/${state.size})`;$('freeMode').setAttribute('aria-pressed',String(state.mode==='free'));$('step2').classList.toggle('active',r.total>0);$('step3').classList.toggle('active',r.full);renderChallenge();renderSound();updateCount();if(!storageOK)$('saveStatus').textContent='暂无法存档，请导出备份';$('mirrorButton').disabled=!r.total;$('liveString').innerHTML=`${ringSVG(state,true)}<div><strong>${r.total} / ${state.size} 颗</strong><small>${selected===null?'挑下一颗喜欢的香':`正在调整第 ${selected+1} 颗`}</small></div><button id="jumpToStage">查看珠圈 ↑</button>`;$('jumpToStage').onclick=()=>scrollToStage();returnFocus(savedFocus);}
function renderChallenge(){const p=$('challengePanel');p.hidden=state.mode!=='challenge';if(p.hidden)return;const c=CHALLENGES[state.challenge],v=checkChallenge(state);p.innerHTML=`<h3>第 ${state.challenge+1} 章 · ${esc(c.name)} ${completed.includes(state.challenge)?'✓ 已完成':''}</h3><p>${esc(c.description)}</p><div class="challenge-checks">${v.checks.map(x=>`<span class="${x.ok?'ok':''}">${x.ok?'✓':'○'} ${esc(x.label)}</span>`).join('')}</div><div class="progress-track"><i style="width:${v.progress/v.target*100}%"></i></div>`;}
function place(id,index){if(busy)return;const target=index??(selected!==null?selected:state.beads.indexOf(null));if(target<0){toast('珠圈已满，点选一颗后可替换。');return;}activeBead=id;selected=null;commit(addBead(state,id,target,{color:selectedColor||BM[id].color,shape:state.shape}),{animate:target});}
$('moodOptions').addEventListener('click',e=>{const b=e.target.closest('[data-mood]');if(!b)return;const m=getRecommendation(b.dataset.mood);selectedColor=null;commit({...state,mood:m.id,palette:m.palette,name:state.name===getRecommendation(state.mood).title?m.title:state.name},{quiet:true});toast(`为你推荐「${m.title}」· ${m.scent}`);});
$('shapeOptions').addEventListener('click',e=>{const b=e.target.closest('[data-shape]');if(b)commit({...state,shape:b.dataset.shape},{quiet:true});});
$('paletteOptions').addEventListener('click',e=>{const b=e.target.closest('[data-palette]');if(!b)return;const p=PALETTES.find(x=>x.id===b.dataset.palette);selectedColor=p.colors[0];commit({...state,palette:p.id},{quiet:true});toast('点缀色已选，下一颗会用这个颜色。');});
$('colorOptions').addEventListener('click',e=>{const b=e.target.closest('[data-color]');if(!b)return;selectedColor=b.dataset.color==='natural'?null:b.dataset.color;const focused=rememberFocus();renderColors();returnFocus(focused);});
$('bracelet').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(!b)return;const i=Number(b.dataset.slot);selected=selected===i?null:i;render();if(selected!==null)toast(state.beads[i]?`已选第 ${i+1} 颗，点香珠可替换。`:`已选第 ${i+1} 位，挑一颗香珠放进来。`);});
let drag=null,suppressClick=false;
$('beadOptions').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-bead]');if(!b||e.button!==0||busy||drag||e.isPrimary===false)return;drag={id:b.dataset.bead,x:e.clientX,y:e.clientY,pointerId:e.pointerId,moved:false};b.setPointerCapture(e.pointerId);});
$('beadOptions').addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8)drag.moved=true;if(!drag.moved)return;e.preventDefault();const ghost=$('dragGhost');ghost.hidden=false;ghost.innerHTML=beadVisual(BM[drag.id],state.shape,selectedColor||BM[drag.id].color);ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';document.body.classList.add('dragging-body');document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]')?.classList.add('drop-hover');});
function stopDrag(e,cancel=false){if(!drag||drag.pointerId!==e.pointerId)return;const current=drag;drag=null;$('dragGhost').hidden=true;document.body.classList.remove('dragging-body');document.querySelectorAll('.drop-hover').forEach(x=>x.classList.remove('drop-hover'));if(current.moved){suppressClick=true;setTimeout(()=>suppressClick=false,350);if(cancel)return;const target=document.elementFromPoint(e.clientX,e.clientY);const slot=target?.closest('[data-slot]');if(slot)place(current.id,Number(slot.dataset.slot));else if(target?.closest('#stage'))place(current.id);else toast('拖到珠圈里，就能串入。');}}
$('beadOptions').addEventListener('pointerup',e=>stopDrag(e));$('beadOptions').addEventListener('pointercancel',e=>stopDrag(e,true));$('beadOptions').addEventListener('lostpointercapture',e=>stopDrag(e,true));$('beadOptions').addEventListener('click',e=>{if(suppressClick)return;const b=e.target.closest('[data-bead]');if(b)place(b.dataset.bead);});
$('undoButton').onclick=()=>{if(busy){toast('正在合香，请稍候。');return;}if(!history.length)return;state=history.pop();selected=null;resultId=null;render();save();tone('undo');};
$('removeButton').onclick=()=>{if(selected===null)return;const beads=clone(state.beads);beads[selected]=null;commit({...state,beads});};
$('rotateButton').onclick=()=>{selected=null;commit({...state,beads:[state.beads.at(-1),...state.beads.slice(0,-1)]});};
$('fillButton').onclick=()=>{const ids=getRecommendation(state.mood).recipe;const beads=state.beads.map((b,i)=>b||{id:ids[i%ids.length],shape:state.shape,color:selectedColor||BM[ids[i%ids.length]].color});selected=null;commit({...state,beads});toast('灵感已补齐，仍可以逐颗调整。');};
$('clearButton').onclick=()=>{selected=null;commit({...state,beads:Array(state.size).fill(null)},{quiet:true});toast('珠圈已清空，可点撤销恢复。');};
$('sizeSelect').onchange=e=>{const size=Number(e.target.value);const removed=state.beads.slice(size).filter(Boolean).length;selected=null;commit({...state,size,beads:Array.from({length:size},(_,i)=>state.beads[i]||null)},{quiet:true});if(removed)toast(`已调整颗数，收起 ${removed} 颗；可撤销恢复。`);};
$('soundToggle').onclick=()=>{sound=!sound;renderSound();save();if(sound)tone();};
$('freeMode').onclick=()=>{commit({...state,mode:'free'},{quiet:true});toast('自由创作：怎么喜欢，就怎么搭。');};
function notifyModal(open){if(window.parent===window)return;try{const origin=window.parent.location.origin;window.parent.postMessage({type:'xiangyu-game-modal',open},origin==='null'?'*':origin);}catch{}}
const modal=$('modal');function resetPreview(){cancelPlanTransfer();modalVersion++;previewGeneration++;clearTimeout(previewTimer);if(artURL){URL.revokeObjectURL(artURL);artURL=null;}}function openModal(html){resetPreview();$('modalContent').innerHTML=html;if(!modal.open)modal.showModal();notifyModal(true);}function closeModal(){resetPreview();notifyModal(false);modal.close();}$('closeModal').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});modal.addEventListener('close',()=>{resetPreview();if(!modal.open)notifyModal(false);});
function quietMotion(){return matchMedia('(prefers-reduced-motion: reduce)').matches||!!document.documentElement.classList?.contains('xyg-parent-paused');}
function confetti(){if(quietMotion())return;for(let i=0;i<22;i++){const c=document.createElement('i');c.className='confetti';c.style.left=Math.random()*100+'vw';c.style.background=['#d9503e','#efc457','#a58ea8','#447f78'][i%4];c.style.animationDelay=Math.random()*.4+'s';c.style.setProperty('--drift',(Math.random()-.5)*180+'px');document.body.appendChild(c);setTimeout(()=>c.remove(),2200);}}
function artworkArgs(design=state){return {state:design,recipe:deriveRecipe(design),mood:getRecommendation(design.mood),beads:BEADS,palettes:PALETTES};}
function upsertWork(){if(resultId){const w=works.find(w=>w.id===resultId);if(w){w.state=clone(state);save();return;}}const duplicate=works.find(w=>JSON.stringify(w.state)===JSON.stringify(state));if(duplicate){resultId=duplicate.id;return;}resultId=globalThis.crypto?.randomUUID?.()||`work-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;works.unshift({id:resultId,date:new Date().toISOString(),state:clone(state)});if(works.length>24)works.pop();save();}
$('synthesizeButton').onclick=async()=>{if(busy)return;const r=deriveRecipe(state);if(!r.full){toast(`还差 ${state.size-r.total} 颗香珠，试试「灵感补齐」。`);return;}if(!r.scentedTotal){toast('这串只有装饰珠，加入一颗香珠再合香吧。');return;}if(state.mode==='challenge'&&!checkChallenge(state).passed){toast('再看看关卡条件，完成后就能合香。');$('challengePanel').scrollIntoView({behavior:'smooth',block:'center'});return;}busy=true;$('stage').classList.add('synthesizing');tone('finish');setTimeout(async()=>{try{if(state.mode==='challenge'&&!completed.includes(state.challenge)){completed.push(state.challenge);toast(`第 ${state.challenge+1} 章完成，新的寻香手记已解锁。`);}upsertWork();confetti();busy=false;await showResult();}catch{toast('生成遇到问题，作品已保存在香匣，可重试。');}finally{busy=false;$('stage').classList.remove('synthesizing');}},quietMotion()?30:700);};
async function refreshPreview(){const img=$('cardPreview');if(!img)return;const s=JSON.stringify(state),version=modalVersion,generation=++previewGeneration;try{const blob=await createArtwork(artworkArgs(),'card');if(!modal.open||$('cardPreview')!==img||version!==modalVersion||generation!==previewGeneration||s!==JSON.stringify(state))return;if(artURL)URL.revokeObjectURL(artURL);artURL=URL.createObjectURL(blob);img.src=artURL;img.alt='你的专属香方卡';if($('previewHint'))$('previewHint').textContent='当前为香方卡，长按图片可保存。';readyCard={signature:s,blob};}catch{if(version===modalVersion&&generation===previewGeneration&&s===JSON.stringify(state)&&$('cardPreview')===img&&$('previewHint'))$('previewHint').textContent='预览暂不可用，仍可复制香方或分享作品。';}}
async function showResult(){const recipe=deriveRecipe(state),mood=getRecommendation(state.mood);openModal(`<h2 id="modalTitle" class="dialog-title">${state.mode==='challenge'?'这一章，圆满了。':'你的心情，成串了。'}</h2><p class="dialog-copy">${esc(mood.story)} 已收藏进我的香匣。</p><div class="result-layout"><div><img id="cardPreview" class="artwork-preview" alt="你的专属香方卡"><p id="previewHint" class="recipe-note">长按图片可保存；也可使用下方下载按钮。</p></div><div><label class="field-label" for="workName">给这串香，留一个名字</label><input id="workName" class="name-input" maxlength="24" value="${esc(state.name)}"><div>${recipe.rows.map(r=>`<div class="recipe-row"><span><i style="--c:${r.color}"></i>${esc(r.name)}</span><span>${r.count} 颗 · ${r.percent}%</span></div>`).join('')}</div><p class="recipe-note">比例按香珠颗数计算，包含装饰珠。<br>游戏搭配示意 · 非实际制作配方。</p><div class="result-actions"><button id="bringPlan" class="primary">把这串带到我的方案</button><button id="downloadCard">下载香方卡 PNG ↓</button><button id="downloadBracelet">手串效果图 ↓</button><button id="copyRecipe">复制香方</button><button id="shareDesign" class="share-button">分享这一串 ↗</button><button id="copyLink">复制作品链接</button><button id="newPiece">继续创作</button></div><p class="sticky-hint">图片和文字可直接分享；链接能否打开取决于站点访问范围。<br>作品最多保留 24 串；可在香匣导出备份。</p></div></div>`);$('workName').oninput=e=>{const name=[...e.target.value.trim()].slice(0,24).join('')||mood.title;state={...state,name};upsertWork();render();clearTimeout(previewTimer);previewTimer=setTimeout(refreshPreview,300);};$('bringPlan').onclick=transferToPlan;$('downloadCard').onclick=e=>exportImage('card',e.currentTarget);$('downloadBracelet').onclick=e=>exportImage('bracelet',e.currentTarget);$('copyRecipe').onclick=()=>copyText(recipeText(),'香方已复制。');$('shareDesign').onclick=shareDesign;$('copyLink').onclick=()=>copyText(shareURL(),'作品链接已复制；能否打开取决于站点访问范围。');$('newPiece').onclick=()=>{closeModal();commit(createState({mood:state.mood}),{quiet:true});selectedColor=null;render();toast('新的珠圈已准备好，上一串在香匣里。');};await refreshPreview();}
function recipeText(design=state){const r=deriveRecipe(design),m=getRecommendation(design.mood);return `香遇 · ${design.name}\n${m.name} / ${m.scent}\n${design.size} 颗 · ${PALETTES.find(p=>p.id===design.palette).name}\n${r.rows.map(x=>`${x.name} ${x.count}颗（${x.percent}%）`).join('\n')}\n${m.story}\n游戏视觉搭配意向；比例仅按珠数计算（含装饰珠），不是实际原料重量或制作配比。真实香方、材料与可制作性由店主确认。`;}
function shareURL(design=state){
  let address=location.href;
  if(!['http:','https:'].includes(location.protocol)){
    address=new URL('game/index.html',window.XY_GAME_HOME||'https://xiangyu-mood-beads.woshiyizixiaoyazi.chatgpt.site/').href;
    if(window.parent!==window){try{if(['http:','https:'].includes(window.parent.location.protocol))address=new URL('game/index.html',window.parent.location.href).href;}catch{}}
  }
  const u=new URL(address);u.hash='design='+encodeShare({...design,mode:'free'});return u.href;
}
async function copyText(t,msg){try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(t);toast(msg);}catch{const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();if(ok)toast(msg);else{openModal(`<h2 id="modalTitle" class="dialog-title">复制并带走</h2><p class="dialog-copy">长按或选中下方内容即可复制。</p><textarea class="share-link" rows="8" readonly>${esc(t)}</textarea>`);}}}
async function exportImage(kind,button){
  if(imageBusy){toast('图片正在生成，请稍候。');return;}
  clearTimeout(previewTimer);
  const original=button.textContent,snapshot=clone(state),signature=JSON.stringify(snapshot),version=modalVersion,generation=++previewGeneration;
  imageBusy=true;button.disabled=true;button.textContent='正在生成…';
  try{
    const blob=await createArtwork(artworkArgs(snapshot),kind);
    const fileName=`香遇_${snapshot.name.replace(/[\\/:*?"<>|]/g,'_')}_${kind==='card'?'香方卡':'手串效果图'}.png`;
    downloadBlob(blob,fileName);
    if(modal.open&&version===modalVersion&&generation===previewGeneration&&signature===JSON.stringify(state)&&$('cardPreview')){
      if(artURL)URL.revokeObjectURL(artURL);artURL=URL.createObjectURL(blob);$('cardPreview').src=artURL;
      $('cardPreview').alt=kind==='card'?'你的专属香方卡':'你的手串效果图';
      if(kind==='card')readyCard={signature,blob};
      if($('previewHint'))$('previewHint').textContent=kind==='card'?'当前为香方卡，长按图片可保存。':'当前为手串效果图，长按图片可保存。';
    }
    toast('图片已生成；若手机未下载，可长按预览图保存。');
  }catch{toast('图片导出失败，请稍后重试或复制香方。');}
  finally{imageBusy=false;button.disabled=false;button.textContent=original;}
}
async function shareDesign(){
  if(imageBusy){toast('图片正在生成，请稍候。');return;}
  const snapshot=clone(state),signature=JSON.stringify(snapshot),text=recipeText(snapshot),button=$('shareDesign');
  const portableText=text;
  imageBusy=true;if(button)button.disabled=true;
  try{
    // Start native sharing in the click gesture. A pending preview shares the current design text.
    const blob=readyCard?.signature===signature?readyCard.blob:null;
    let file=null,canShareImage=false;
    if(blob&&typeof File==='function'&&navigator.canShare&&navigator.share){
      file=new File([blob],'香遇_我的香方.png',{type:'image/png'});
      try{canShareImage=navigator.canShare({files:[file]});}catch{}
    }
    if(canShareImage){await navigator.share({title:`香遇 · ${snapshot.name}`,text:portableText,files:[file]});return;}
    if(navigator.share&&['http:','https:'].includes(location.protocol)){await navigator.share({title:`香遇 · ${snapshot.name}`,text:portableText});return;}
    await copyText(portableText,'设计意向已复制，可配合导出的图片分享。');
  }catch(e){if(e.name!=='AbortError')await copyText(portableText,'设计意向已复制，可配合导出的图片分享。');}
  finally{imageBusy=false;if(button)button.disabled=false;}
}
function cancelPlanTransfer(){
  if(!planTransfer)return;const pending=planTransfer;planTransfer=null;clearTimeout(pending.timer);window.removeEventListener?.('message',pending.receive);
  if(pending.button?.isConnected){pending.button.disabled=false;pending.button.textContent='把这串带到我的方案';}
}
function transferText(){return ['仙作汇｜工坊作品沟通意向','作品编号：'+(resultId||'待确认'),recipeText(),'微信：xiaogan8222','请本人复制后在微信粘贴发送；尚未提交订单或付款。'].join('\n');}
async function transferToPlan(){
  if(planTransfer)return;
  if(!isCompleteWork(state)){toast('先完成一整串含有香珠的作品，再带到方案。');return;}
  // Save the latest visible name before taking the immutable transfer snapshot.
  const input=$('workName');if(input){const mood=getRecommendation(state.mood),name=[...input.value.trim()].slice(0,24).join('')||mood.title;state={...state,name};}
  upsertWork();
  const payload={type:'xiangyu-craft-transfer',v:1,requestId:`CG-${Date.now().toString(36)}-${++planTransferSerial}-${Math.random().toString(36).slice(2,8)}`,workId:resultId,state:clone(state)};
  if(window.parent===window){
    if(['http:','https:'].includes(location.protocol)){
      try{localStorage.setItem('xiangyu-craft-transfer-v1',JSON.stringify(payload));location.href=new URL('../index.html#craft',location.href).href;return;}
      catch{toast('暂时无法转入方案，可先复制设计意向。');}
    }
    await copyText(transferText(),'设计意向已复制，请本人在微信添加 xiaogan8222 后粘贴发送。');return;
  }
  let hostOrigin;try{hostOrigin=window.parent.location.origin;}catch{await copyText(transferText(),'请在香遇原站打开工坊，或将设计意向自行粘贴给微信 xiaogan8222。');return;}
  const button=$('bringPlan');button.disabled=true;button.textContent='正在带到我的方案…';
  const receive=event=>{
    if(event.source!==window.parent||event.origin!==hostOrigin||event.data?.type!=='xiangyu-craft-transfer-result'||event.data.requestId!==payload.requestId)return;
    const ok=event.data.ok===true;cancelPlanTransfer();
    toast(ok?'设计意向已接收，请在主站继续确认尺寸与实拍参考。':'暂未转入方案，请重试；原作品仍在香匣里。');
  };
  planTransfer={button,receive,timer:setTimeout(()=>{cancelPlanTransfer();toast('主站暂未确认接收，请重试；原作品仍在香匣里。');},12000)};
  window.addEventListener('message',receive);
  try{window.parent.postMessage(payload,hostOrigin==='null'?'*':hostOrigin);}catch{cancelPlanTransfer();toast('暂未转入方案，请在香遇原站重试。');}
}
window.addEventListener('pagehide',cancelPlanTransfer);

function scrollToStage(){
  $('stage').scrollIntoView({behavior:quietMotion()?'instant':'smooth',block:'center'});
  if(window.parent!==window){try{const origin=window.parent.location.origin;window.parent.postMessage({type:'xiangyu-game-scroll',top:0},origin==='null'?'*':origin);}catch{}}
}
function patterns(){
  openModal(`<h2 id="modalTitle" class="dialog-title">从一份灵感，开始。</h2><p class="dialog-copy">先落几颗，余下的由你续写。起手模板会替换珠圈，可点撤销回到原稿。</p><div class="pattern-grid">${PATTERNS.map(p=>{const design=createPattern(p.id,state.size);return `<button class="pattern-card" data-pattern="${p.id}"><span class="pattern-icon">${p.icon}</span>${ringSVG(design)}<strong>${esc(p.name)}</strong><span>${esc(p.description)}</span><small>已有 ${deriveRecipe(design).total} 颗 · 等你续作 ↗</small></button>`;}).join('')}</div>`);
}
$('mirrorButton').onclick=()=>{
  if(!state.beads.slice(1,state.size/2).some(Boolean)){toast('先在右半圈放几颗，再试试对称。');return;}
  selected=null;if(commit(mirrorBeads(state),{quiet:true})!==false)toast('已把右半圈镜像到左边（含空位），可撤销。');
};
function renderCollection(){
  const query=collectionQuery.trim().toLocaleLowerCase();
  const list=works.filter(w=>(collectionMood==='all'||w.state.mood===collectionMood)&&(!query||[w.state.name,getRecommendation(w.state.mood).name,getRecommendation(w.state.mood).scent].some(x=>x.toLocaleLowerCase().includes(query))));
  if(collectionSort==='name')list.sort((a,b)=>a.state.name.localeCompare(b.state.name,'zh-Hans-CN'));
  else if(collectionSort==='oldest')list.sort((a,b)=>(Date.parse(a.date)||0)-(Date.parse(b.date)||0));
  else list.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));
  $('collectionCount').textContent=`找到 ${list.length} 串 · 香匣 ${works.length} / 24`;
  $('workGrid').innerHTML=list.length?list.map(w=>{const m=getRecommendation(w.state.mood);return `<article class="work-card">${ringSVG(w.state)}<div class="work-card-info"><h3>${esc(w.state.name)}</h3><p>${esc(m.name)} · ${esc(m.scent)}<br>${w.state.size} 颗 · ${esc(PALETTES.find(p=>p.id===w.state.palette).name)}</p></div><div class="work-actions"><button data-open-work="${esc(w.id)}">打开香方</button><button data-edit-work="${esc(w.id)}">接着搭</button><button data-copy-work="${esc(w.id)}">复制这串</button><button data-delete-work="${esc(w.id)}">移出香匣</button></div></article>`;}).join(''):`<p class="empty-message">${works.length?'没有找到这串香，试试其他关键词或心情。':'香匣还是空的。<br>串满你的第一串，合成后就会自动收藏。'}</p>`;
}
function collection(){
  openModal(`<h2 id="modalTitle" class="dialog-title">我的香匣</h2><p class="dialog-copy">把每一种心情，都好好收起来。</p><div class="collection-controls"><label><span>找一串香</span><input id="workSearch" type="search" placeholder="作品名 / 心情 / 香型" maxlength="40" value="${esc(collectionQuery)}"></label><label><span>心情</span><select id="collectionMood"><option value="all">全部心情</option>${MOODS.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label><label><span>排序</span><select id="collectionSort"><option value="newest">最近收藏</option><option value="oldest">最早收藏</option><option value="name">按名字</option></select></label></div><p id="collectionCount" class="recipe-note" role="status"></p><div id="workGrid" class="collection-grid"></div><div class="file-tools"><button id="backupButton">导出存档备份 ↓</button><button id="previousSave">找回上一份自动存档</button><label>导入备份<input id="restoreFile" type="file" accept="application/json,.json" aria-label="导入香匣备份"></label></div>`);
  $('collectionMood').value=collectionMood;$('collectionSort').value=collectionSort;
  $('workSearch').oninput=e=>{collectionQuery=e.target.value;renderCollection();};
  $('collectionMood').onchange=e=>{collectionMood=e.target.value;renderCollection();};
  $('collectionSort').onchange=e=>{collectionSort=e.target.value;renderCollection();};
  renderCollection();
$('previousSave').onclick=()=>{let previous;try{previous=readPrevious(localStorage);}catch{}if(previous)importReview(previous,true);else toast('暂时没有可恢复的上一份存档。');};
$('backupButton').onclick=()=>{const blob=new Blob([JSON.stringify({format:'xiangyu-backup',v:1,draft:state,works,completed,sound},null,2)],{type:'application/json'});downloadBlob(blob,'香遇_香匣备份.json');toast('存档备份已导出。');};$('restoreFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>150000){toast('备份文件过大，请选择香遇导出的 JSON。');e.target.value='';return;}
  try{
    const data=JSON.parse(await file.text());
    if(!data||data.format!=='xiangyu-backup'||data.v!==1||!Array.isArray(data.works)||data.works.length>24||!validateState(data.draft)||data.works.some(w=>!w||!isCompleteWork(w.state)))throw Error();
    const backup={draft:validateState(data.draft),works:data.works.map(w=>({state:isCompleteWork(w.state),date:typeof w.date==='string'?w.date.slice(0,30):new Date().toISOString()})),completed:progressFrom(data.completed),sound:data.sound===true};
    importReview(backup);
  }catch{toast('备份格式不正确，没有改变当前存档。');e.target.value='';}
};}
function importReview(backup,previous=false){
  const distinct=new Set(works.map(w=>JSON.stringify(w.state)));
  const novel=backup.works.filter(w=>{const key=JSON.stringify(w.state);if(distinct.has(key))return false;distinct.add(key);return true;});
  const room=24-works.length;
  openModal(`<h2 id="modalTitle" class="dialog-title">把香气，接着收藏。</h2><p class="dialog-copy">${previous?'上一份自动存档':'备份'}中有 ${backup.works.length} 串作品，可新增 ${Math.min(room,novel.length)} 串。${novel.length>room?'香匣空间有限，其余作品仍保留在备份文件中。':''}</p><p class="dialog-copy">${previous?'自动存档草稿':'备份草稿'}：「${esc(backup.draft.name)}」· ${deriveRecipe(backup.draft).total} / ${backup.draft.size} 颗。<br>你可以只合并作品，也可以同时恢复这份草稿、关卡进度和音效设置。恢复前的当前草稿会留在撤销记录。</p><div class="result-actions"><button id="mergeBackup" class="primary">只合并香匣</button><button id="restoreBackup">合并并恢复草稿</button><button id="cancelBackup">返回香匣</button></div>`);
  const apply=restoreDraft=>{
    if(busy){toast('正在合香，请稍候。');return;}
    const stamp=Date.now();
    works.push(...novel.slice(0,room).map((w,i)=>({id:`import-${stamp}-${i}-${Math.random().toString(36).slice(2,7)}`,date:w.date,state:clone(w.state)})));
    const earned=works.filter(w=>w.state.mode==='challenge'&&checkChallenge(w.state).passed).map(w=>w.state.challenge);
    completed=[...new Set([...completed,...earned,...(restoreDraft?backup.completed:[])])];
    if(restoreDraft){sound=backup.sound;selected=null;selectedColor=null;commit(backup.draft,{quiet:true});}else save();
    collection();
    toast(`已合并 ${Math.min(room,novel.length)} 串作品${restoreDraft?'，并恢复备份草稿与设置':'，当前草稿已保留'}。`);
  };
  $('mergeBackup').onclick=()=>apply(false);$('restoreBackup').onclick=()=>apply(true);$('cancelBackup').onclick=collection;
}

function journey(){const achievements=getAchievements(works);const icons=['✳','❀','☀','◇','✧'];openModal(`<h2 id="modalTitle" class="dialog-title">寻香手记</h2><p class="dialog-copy">四章小挑战，练习把喜欢搭在一起。完成一章后解锁下一章。</p><div class="challenge-list">${CHALLENGES.map((c,i)=>{const unlocked=i===0||completed.includes(i-1),passed=completed.includes(i);return `<article class="challenge-card ${unlocked?'':'locked'}"><h3>0${i+1} · ${esc(c.name)}</h3><p>${esc(c.description)}</p><span class="pass-tag">${passed?'✓ 已完成':unlocked?'已解锁':'完成上一章后解锁'}</span><button data-challenge="${i}" ${unlocked?'':'disabled'}>${passed?'再玩一次':unlocked?'开始挑战':'未解锁'}</button></article>`;}).join('')}</div><h3 style="font-size:13px;margin-top:25px">香气成就 · ${achievements.filter(a=>a.unlocked).length} / ${achievements.length}</h3><div class="achievement-grid">${achievements.map((a,i)=>`<div class="achievement ${a.unlocked?'unlocked':''}" title="${esc(a.description)}"><span>${icons[i]}</span><strong>${esc(a.name)}</strong><small>${esc(a.description)}</small><small>${a.progress} / ${a.target}</small></div>`).join('')}</div><p class="recipe-note">开始关卡会保留已有串珠，你可以继续修改，也可以清空后重搭。</p>`);}
$('modalContent').addEventListener('click',async e=>{if(busy){toast('正在合香，请稍候。');return;}const pattern=e.target.closest('[data-pattern]');if(pattern){selected=null;selectedColor=null;commit(createPattern(pattern.dataset.pattern,state.size),{quiet:true});closeModal();scrollToStage();toast('灵感起手已放好，接着串成你的样子。');return;}const duplicate=e.target.closest('[data-copy-work]');if(duplicate){const w=works.find(w=>w.id===duplicate.dataset.copyWork);if(w){selected=null;commit({...clone(w.state),name:[...w.state.name+'·副本'].slice(0,24).join(''),mode:'free'},{quiet:true});closeModal();scrollToStage();toast('已打开副本草稿，原作仍在香匣。');}return;}const c=e.target.closest('[data-challenge]');if(c){const i=Number(c.dataset.challenge);if(i&& !completed.includes(i-1))return;closeModal();commit({...state,mode:'challenge',challenge:i},{quiet:true});$('challengePanel').scrollIntoView({behavior:'smooth',block:'center'});return;}const o=e.target.closest('[data-open-work],[data-edit-work]');if(o){const id=o.dataset.openWork||o.dataset.editWork,w=works.find(w=>w.id===id);if(!w)return;commit(clone(w.state),{quiet:true});resultId=w.id;selected=null;if(o.dataset.openWork)await showResult();else{closeModal();toast('已打开作品，修改后合成会另存一串。');resultId=null;}return;}const d=e.target.closest('[data-delete-work]');if(d){if(d.dataset.ready!=='yes'){d.dataset.ready='yes';d.textContent='再点确认移出';setTimeout(()=>{if(d.isConnected){d.dataset.ready='no';d.textContent='移出香匣';}},3000);return;}works=works.filter(w=>w.id!==d.dataset.deleteWork);save();collection();toast('已移出香匣；当前串珠不受影响。');}});
function guide(){openModal(`<h2 id="modalTitle" class="dialog-title">慢慢来，串出喜欢。</h2><ol class="guide-list"><li>选择心情，看看今天的香气推荐。</li><li>点香珠直接入串；按住可拖到指定珠位。</li><li>点选珠位后，点香珠可替换；工具栏可移除、移位、撤销。</li><li>珠型与点缀色用于下一颗，已串好的珠子会保留。</li><li>填满整串后合成香方，自动收藏，下载卡片或分享。</li><li>「灵感起手」提供三款半成品；「对称」把右半圈复制到左边，空位也会同步。</li><li>到「寻香手记」解锁关卡与成就，香匣可搜索、筛选、排序和复制作品。</li></ol><p class="dialog-copy">草稿保存在当前浏览器；换设备前可在「我的香匣」导出备份。无痕模式、清理浏览器数据或更换浏览器可能清除存档。关卡可以反复挑战。</p><p class="recipe-note">所有香型描述都是创作中的气味联想，颜色为视觉设计；游戏不提供实际香材成分与制作比例。</p>`);}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{if(busy){toast('正在合香，请稍候。');return;}if(b.dataset.action==='collection')collection();if(b.dataset.action==='journey')journey();if(b.dataset.action==='guide')guide();if(b.dataset.action==='patterns')patterns();if(b.dataset.action==='workshop')$('workshop').scrollIntoView({behavior:'smooth'});});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)&&!modal.open){e.preventDefault();$('undoButton').click();}});
render();
if(restoredPrevious){$('saveStatus').textContent='已恢复上一份自动存档';setTimeout(()=>toast('本次存档异常，已找回上一份有效存档；建议导出备份。'),350);}
if(sharedIncoming){setTimeout(()=>{openModal(`<h2 id="modalTitle" class="dialog-title">收到一串心意。</h2><p class="dialog-copy">「${esc(sharedIncoming.name)}」· ${esc(getRecommendation(sharedIncoming.mood).scent)}<br>打开后可继续创作；当前草稿会留在撤销记录。</p><button id="acceptShared" class="primary">打开这串香 ↗</button> <button id="skipShared" style="padding:12px">继续我的草稿</button>`);$('acceptShared').onclick=()=>{commit(sharedIncoming,{quiet:true});selected=null;clearSharedHash();closeModal();toast('已打开分享作品，随心改一改吧。');};$('skipShared').onclick=()=>{clearSharedHash();closeModal();};},250);}
// Same-origin iframe integration: height updates do not read parent data.
if(window.parent!==window){
  let hostOrigin=null;try{hostOrigin=window.parent.location.origin;}catch{}
  if(hostOrigin){const sendHeight=()=>window.parent.postMessage({type:'xiangyu-game-height',height:Math.min(3200,document.documentElement.scrollHeight)},hostOrigin==='null'?'*':hostOrigin);if(typeof ResizeObserver==='function')new ResizeObserver(sendHeight).observe(document.body);else window.addEventListener('resize',sendHeight);sendHeight();}
  document.querySelectorAll('a[href="../index.html"]').forEach(a=>a.target='_top');
}
