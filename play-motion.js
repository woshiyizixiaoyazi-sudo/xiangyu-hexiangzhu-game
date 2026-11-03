/* v30: bounded, cancellable decoration. Product photos are never filtered. */
(()=>{'use strict';
const media=matchMedia('(prefers-reduced-motion: reduce)');
const connection=typeof navigator!=='undefined'?navigator.connection:null;
const lowMemory=typeof navigator!=='undefined'&&Number(navigator.deviceMemory)>0&&Number(navigator.deviceMemory)<=2;
const active=new Set(),ephemeral=new Set();
let previous='',pageToken='',lastRitual=-1;
const light=()=>!!connection?.saveData||lowMemory;
const disabled=()=>media.matches||document.body.classList.contains('paused')||document.hidden;
function toggleClass(name,on){if(document.body.classList.contains(name)!==!!on)document.body.classList.toggle(name,!!on);}
function clear(){
 for(const a of active)a.cancel();active.clear();
 for(const el of ephemeral)el.remove();ephemeral.clear();
}
function animate(el,frames,options,remove=false){
 if(!el||disabled()||!el.animate||active.size>=(light()?12:24)){if(remove)el?.remove();return;}
 let a;try{a=el.animate(frames,options);}catch{if(remove)el.remove();return;}
 active.add(a);if(remove)ephemeral.add(el);
 a.finished.catch(()=>{}).finally(()=>{active.delete(a);if(remove){el.remove();ephemeral.delete(el);}});
 return a;
}
function sync(){
 if(disabled())clear();
 toggleClass('motion-background',document.hidden);
 toggleClass('motion-reduced',media.matches);
 toggleClass('motion-light',light());
}
function before(){clear();}
function enter(root,route){
 if(!root)return;sync();
 const token=route+'|'+(root.querySelector('h1')?.textContent||'');
 const changed=token!==pageToken;root.dataset.motionRoute=route;
 if(changed){
  // Do not transform the page wrapper: the result's fixed actions stay in place.
  animate(root,[{opacity:.6},{opacity:1}],{duration:180,easing:'ease-out'});
  const parts=[...root.children].filter(el=>!el.matches('.actions,.scent-dock,iframe,.studio-actions')).slice(0,light()?3:6);
  parts.forEach((el,i)=>animate(el,[{opacity:0,transform:'translate('+(previous&&route!=='home'?'8px':'0')+',10px)'},{opacity:1,transform:'none'}],{duration:light()?220:340,delay:i*22,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));
 }
 pageToken=token;previous=route;
 if(route==='ritual'){
  const orb=root.querySelector('.ritual-orb'),zone=root.querySelector('.ritual-zone');
  const step=[...root.querySelectorAll('.ritual-tabs .done')].length;
  if(lastRitual!==step){
   burst(zone,step);
   animate(orb,[{transform:'scale(.92) rotate(-9deg)'},{transform:'scale(1.03) rotate(4deg)'},{transform:'none'}],{duration:500,easing:'ease-out'});
  }
  lastRitual=step;addSmoke(zone);
 }else lastRitual=-1;
 if(route==='result'&&changed){
  animate(root.querySelector('.preview-circle'),[{opacity:0,transform:'scale(.78) rotate(-15deg)'},{opacity:1,transform:'scale(1.02) rotate(1deg)'},{opacity:1,transform:'none'}],{duration:light()?450:850,easing:'cubic-bezier(.16,1,.3,1)'});
  burst(root.querySelector('.result-title'),4);
 }
 if(route==='share')setupCard(root);
}
function addSmoke(zone){
 if(!zone||disabled()||zone.querySelector('.aroma-smoke'))return;
 const box=document.createElement('div');box.className='aroma-smoke';box.setAttribute('aria-hidden','true');
 for(let i=0;i<(light()?2:3);i++){const w=document.createElement('i');w.style.setProperty('--i',i);box.append(w);}
 zone.prepend(box);
}
function burst(zone,step){
 if(!zone||disabled())return;
 const count=light()?6:10;
 for(let i=0;i<count;i++){
  const dot=document.createElement('i');dot.className='scent-particle';dot.setAttribute('aria-hidden','true');
  dot.style.background=['#2956e8','#f4d64b','#2e755f','#f2a7bd'][i%4];zone.append(dot);
  const angle=i*Math.PI*2/count,dx=Math.cos(angle)*(57+step*6),dy=Math.sin(angle)*57-22;
  animate(dot,[{opacity:0,transform:'translate(-50%,-50%) scale(.4)'},{opacity:.75,offset:.15},{opacity:0,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.2)`}],{duration:660+i*18,easing:'ease-out'},true);
 }
}
function capture(button){const r=button.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
function fly(from){
 const ring=document.getElementById('scent-ring');if(!from||!ring)return;
 // The selection itself updates synchronously; this is only a decorative response.
 ring.classList.remove('landed');if(disabled())return;
 const r=ring.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
 void ring.offsetWidth;ring.classList.add('landed');
 const dx=r.left+r.width*.5-from.x,dy=r.top+r.height*.5-from.y;
 const lift=Math.min(50,Math.max(16,Math.hypot(dx,dy)*.18));
 const bead=document.createElement('i');bead.className='flying-bead';bead.setAttribute('aria-hidden','true');
 bead.style.left=from.x+'px';bead.style.top=from.y+'px';document.body.append(bead);
 animate(bead,[{opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:1,transform:`translate(calc(-50% + ${dx*.48}px),calc(-50% + ${dy*.48-lift}px)) scale(1.15)`,offset:.48},{opacity:0,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.35)`}],{duration:light()?420:580,easing:'cubic-bezier(.2,.65,.35,1)'},true);
}
function setupCard(root){
 const img=root.querySelector('#share-image');if(!img||root.querySelector('.share-scene'))return;
 const scene=document.createElement('div');scene.className='share-scene';scene.setAttribute('role','group');scene.setAttribute('aria-label','我的结果卡，使用下方按钮翻面');
 const turn=document.createElement('div');turn.className='share-turn';img.before(scene);scene.append(turn);turn.append(img);
 const back=document.createElement('div');back.className='share-back';back.id='share-card-back';
 back.innerHTML='<span>XIANGYU / A NOTE TO YOURSELF</span><b>今天，<br>已经值得被记住。</b><p>不用急着成为谁。<br>喜欢的名字、颜色和记忆，<br>可以慢慢串在一起。</p><small>香遇 · 仙作汇<br>数字设计意向，香方与适配由店主确认。</small>';
 back.setAttribute('aria-hidden','true');turn.append(back);
 const button=root.querySelector('[data-action="flip-card"]');
 if(button){button.setAttribute('aria-controls','share-image share-card-back');button.setAttribute('aria-pressed','false');}
}
function flip(){
 const scene=document.querySelector('.share-scene');if(!scene)return;
 const on=scene.classList.toggle('is-back'),button=document.querySelector('[data-action="flip-card"]');
 if(button){button.textContent=on?'翻回我的结果卡':'翻到卡片背面';button.setAttribute('aria-pressed',String(on));}
 scene.querySelector('#share-image').setAttribute('aria-hidden',String(on));
 scene.querySelector('.share-back').setAttribute('aria-hidden',String(!on));
}
function breath(paused){
 document.querySelector('.breath-area')?.classList.toggle('breath-held',paused);
 const disc=document.querySelector('.breath-disc');if(disc)disc.style.animationPlayState=paused?'paused':'running';
}
function navigate(render){
 render();if(disabled())return;
 const stage=document.querySelector('.stage');if(!stage)return;
 const line=document.createElement('i');line.className='route-trail';line.setAttribute('aria-hidden','true');stage.append(line);
 animate(line,[{opacity:.75,transform:'scaleX(.05)'},{opacity:.6,transform:'scaleX(1)',offset:.65},{opacity:0,transform:'scaleX(1)'}],{duration:320,easing:'ease-out'},true);
}
if(media.addEventListener)media.addEventListener('change',sync);else media.addListener?.(sync);
connection?.addEventListener?.('change',sync);
document.addEventListener('visibilitychange',sync);
// Class toggles are idempotent, so this observer also notices the parent pause control.
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
document.addEventListener('pointerdown',e=>{
 const button=e.target.closest('button');
 if(button&&!button.disabled)animate(button,[{scale:'1'},{scale:'.97'},{scale:'1'}],{duration:190,easing:'ease-out'});
},{passive:true});
window.XYMotion={before,enter,capture,fly,flip,breath,sync,navigate};sync();
})();
