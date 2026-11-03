'use strict';
(()=>{
 const root=document.documentElement,key='xiangyu-motion-paused';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let requestedPause=false;try{requestedPause=localStorage.getItem(key)==='true';}catch{}
 const controls=[...document.querySelectorAll('[data-motion-toggle]')];
 function sync(){
  root.classList.toggle('motion-paused',requestedPause||reduced.matches||document.hidden);
  controls.forEach(button=>{button.textContent=reduced.matches?'已减少动态':requestedPause?'开启动效':'暂停动态';button.setAttribute('aria-pressed',String(requestedPause||reduced.matches));button.disabled=reduced.matches;button.title=reduced.matches?'正在尊重设备的减少动态设置':'暂停或恢复本页装饰动效';});
  document.dispatchEvent(new CustomEvent('xiangyu:motion-change',{detail:{paused:requestedPause||reduced.matches||document.hidden}}));
 }
 controls.forEach(button=>button.addEventListener('click',()=>{requestedPause=!requestedPause;try{localStorage.setItem(key,String(requestedPause));}catch{}sync();}));
 reduced.addEventListener?.('change',sync);document.addEventListener('visibilitychange',sync);sync();
 const regions=[...document.querySelectorAll('[data-motion-region]')];
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-visible',entry.isIntersecting)),{threshold:.05});regions.forEach(region=>observer.observe(region));}else regions.forEach(region=>region.classList.add('motion-visible'));
 document.addEventListener('pointerdown',event=>{
  if(root.classList.contains('motion-paused'))return;
  const target=event.target.closest('button:not([disabled]),a.button');if(!target||target.hasAttribute('data-motion-toggle'))return;
  target.classList.remove('tap-feedback');target.classList.add('tap-feedback');setTimeout(()=>target.classList.remove('tap-feedback'),520);
 },{passive:true});
})();

// Interaction-only feedback: business data, generated text and export logic stay untouched.
(()=>{
 const root=document.documentElement,timers=new WeakMap();
 const allowed=()=>!root.classList.contains('motion-paused')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function feedback(el,kind,duration=850){
  if(!el)return;el.dataset.feedbackKind=kind;
  if(!allowed())return;
  clearTimeout(timers.get(el));el.classList.remove('detail-feedback');void el.offsetWidth;el.classList.add('detail-feedback');
  timers.set(el,setTimeout(()=>el.classList.remove('detail-feedback'),duration));
 }
 function step(id){if(document.body.classList.contains('studio-ready')&&id==='design-start')id='matches';document.querySelectorAll('.flow-nav a,.mobile-nav a').forEach(link=>{const active=link.getAttribute('href')==='#'+id;link.classList.toggle('is-current',active);if(active)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});}
 step(location.hash.slice(1)||'matches');
 document.addEventListener('input',event=>{
  const el=event.target;
  if(el.matches('#cart-lines input[type=number],#mix-quantity')){feedback(el,'quantity');feedback(document.getElementById('plan-count'),'count');step('purchase-plan');}
  if(el.matches('#product-search,#shopKw'))feedback(document.getElementById(el.id==='shopKw'?'shopGrid':'product-options'),'filter');
  if(el.closest('#design-start,.design')){feedback(document.getElementById('editing-line'),'saved');step('design-start');}
 });
 document.addEventListener('change',event=>{
  const el=event.target;
  if(el.matches('#product-category'))feedback(document.getElementById('product-options'),'filter');
  if(el.matches('[data-select-product]')){const card=document.querySelector('.product-option[data-product="'+CSS.escape(el.dataset.selectProduct)+'"]');feedback(card,'selected');feedback(document.getElementById('plan-count'),'count');step('matches');}
  if(el.matches('#plan-mode')){feedback(document.getElementById('cart-lines'),'mode');step('purchase-plan');}
 });
 document.addEventListener('click',event=>{
  const el=event.target.closest('a,button');if(!el)return;
  if(el.closest('.flow-nav,.mobile-nav')){step((el.getAttribute('href')||'').slice(1));feedback(el,'step');}
  if(el.matches('#generate-plan,#refresh-proposal')&&document.getElementById('proposal-text')?.value){feedback(document.querySelector('.proposal-output'),'summary',1100);feedback(document.getElementById('proposal-status'),'success',1500);step('purchase-plan');}
  if(el.matches('#add-current'))step('purchase-plan');
  if(el.matches('.ctab'))feedback(document.getElementById('shopGrid'),'filter');
  if(el.matches('.tb-item,[data-nav]')){const page=document.querySelector('.page.active');feedback(page,'page');}
 });
 const count=document.getElementById('plan-count');
 if(count)new MutationObserver(()=>{feedback(count,'count');const selected=document.querySelectorAll('#cart-lines .cart-line').length>0;document.querySelectorAll('.flow-nav a[href="#matches"],.mobile-nav a[href="#matches"]').forEach(link=>link.classList.toggle('is-complete',selected));}).observe(count,{childList:true,characterData:true,subtree:true});
 const toast=document.getElementById('toast');
 if(toast)new MutationObserver(()=>{
  if(toast.hidden)return;const message=toast.textContent||'';
  if(/已复制/.test(message)){feedback(document.getElementById('copy-plan')||document.getElementById('planCopy')||document.getElementById('copyWxBtn'),'copied',1900);}
  if(/文件已生成/.test(message))feedback(document.getElementById('download-plan'),'downloaded',1900);
 }).observe(toast,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();
