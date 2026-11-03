'use strict';
// Presentation follows the existing design state; product data and draft formats stay intact.
(() => {
  const hero = document.querySelector('[data-mood-hero]');
  if (!hero) return;
  const heroPhoto=hero.querySelector('.mood-hero-photo img'),photoFallback=hero.querySelector('.hero-image-fallback');
  if(heroPhoto&&photoFallback){const photoState=loaded=>{heroPhoto.hidden=!loaded;photoFallback.hidden=loaded;};heroPhoto.addEventListener('error',()=>photoState(false));heroPhoto.addEventListener('load',()=>photoState(true));if(heroPhoto.complete)photoState(heroPhoto.naturalWidth>0);}
  const isHome = document.body.classList.contains('mood-home');
  const moods = {
    settle: {title:['慢一点，','也很好。'],caption:'把留白与喜欢的香，戴进日常。',short:'慢下来'},
    focus: {title:['留一刻，','给眼前。'],caption:'简单一点，让搭配陪着日常。',short:'专注一点'},
    spark: {title:['换点颜色，','遇见新鲜。'],caption:'从一抹喜欢的颜色，开启新的搭配。',short:'新鲜感'},
    warm: {title:['温柔一点，','留给自己。'],caption:'一点柔软的细节，一份自己的喜欢。',short:'温柔陪伴'},
    joy: {title:['把这一刻，','戴成喜欢。'],caption:'为值得记住的日子，挑一件小小纪念。',short:'记录开心'}
  };
  let selected = [], current = 'settle';
  const title = document.getElementById('mood-hero-title');
  const summary = document.querySelector('.mood-summary');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 650px)');
  const put = (id,value) => {const el=document.getElementById(id);if(el&&el.textContent!==String(value))el.textContent=String(value);};
  function render(detail = {}) {
    current = Object.hasOwn(moods,detail.mood) ? detail.mood : current;
    selected = Array.isArray(detail.needs) ? detail.needs.filter(key=>Object.hasOwn(moods,key)) : selected;
    const mood=moods[current];
    if(title.dataset.linkedMood!==current){
      title.replaceChildren(document.createTextNode(mood.title[0]),document.createElement('br'),document.createTextNode(mood.title[1]));
      title.dataset.linkedMood=current;
      if(!reduced.matches&&!document.documentElement.classList.contains('motion-paused')){title.classList.remove('headline-change');void title.offsetWidth;title.classList.add('headline-change');}
    }
    hero.dataset.tone=current;
    put('mood-hero-caption',mood.caption);
    summary.querySelector('.summary-compact-title').textContent=mood.title.join('');
    put('summary-mood',selected.length?moods[selected.at(-1)].short+(selected.length>1?' +'+(selected.length-1):''):'随心选');
    const count=Number.isFinite(detail.count)?detail.count:0;
    put('summary-count',detail.quantityInvalid?'待修正':count);
    put('summary-unit',detail.quantityInvalid?'':detail.mode==='mix'?' 串':' 件');
    put('summary-mode',detail.mode==='mix'?'混合一串':'分别搭配');
    document.querySelectorAll('[data-dock-count]').forEach(el=>el.textContent=detail.quantityInvalid?'!':String(count));
    document.querySelectorAll('[data-hero-mood]').forEach(button=>button.setAttribute('aria-pressed',String(selected.includes(button.dataset.heroMood))));
    const start=document.getElementById('mood-start');
    if(start) start.href='customize.html'+(selected.length?'?moods='+encodeURIComponent(selected.join(',')):'')+'#matches';
  }
  let homeDraft={};
  if(isHome){
    try{const draft=JSON.parse(localStorage.getItem('xiangyu-owner-multi-proposal-v1')||'null');const s=draft?.state;if(s&&Array.isArray(s.lines)){homeDraft={mood:s.moodKey,needs:s.needs,mode:s.mode,quantityInvalid:s.mode==='mix'?typeof s.quantityInputs?.mix==='string':s.lines.some(line=>typeof s.quantityInputs?.[line.id]==='string'),count:s.lines.length?(s.mode==='mix'?Number(s.mixQuantity)||1:s.lines.reduce((n,line)=>n+(Number(line.quantity)||0),0)):0};}}catch{}
    render(homeDraft);
  }else{
    document.addEventListener('xiangyu:design-change',event=>render(event.detail));
    document.dispatchEvent(new CustomEvent('xiangyu:request-state'));
  }
  document.querySelectorAll('[data-hero-mood]').forEach(button=>button.addEventListener('click',()=>{
    const mood=button.dataset.heroMood;
    if(isHome){selected=selected.includes(mood)?selected.filter(x=>x!==mood):[...selected,mood];render({...homeDraft,mood:selected.at(-1)||mood,needs:selected});}
    else document.dispatchEvent(new CustomEvent('xiangyu:select-mood',{detail:{mood}}));
  }));
  let scheduled=false, compact=false;
  function scrollState(){
    scheduled=false;
    const onMood=!document.body.classList.contains('studio-ready')||document.body.dataset.studioView==='mood';
    const progress=mobile.matches&&onMood?Math.max(0,Math.min(1,Number(window.scrollY||0)/160)):0;
    hero.style.setProperty('--hero-progress',reduced.matches||document.documentElement.classList.contains('motion-paused')?'0':String(progress));
    const next=mobile.matches&&(!onMood||hero.getBoundingClientRect().bottom<100);
    if(next!==compact){compact=next;summary.classList.toggle('is-compact',compact);}
  }
  window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(scrollState);}},{passive:true});
  window.addEventListener('resize',scrollState,{passive:true});document.addEventListener('xiangyu:studio-view',scrollState);document.addEventListener('xiangyu:motion-change',scrollState);reduced.addEventListener?.('change',scrollState);scrollState();
  // Observe sections rather than guessing the active step from the last tapped button.
  const nav=document.querySelector('.mood-customize .mobile-nav');
  if(nav&&!document.body.classList.contains('mood-studio')&&'IntersectionObserver' in window){
    const sections=['mood-picker','matches','design-start','purchase-plan'].map(id=>document.getElementById(id)).filter(Boolean);
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const target=entry.target.id==='design-start'?'matches':entry.target.id;nav.querySelectorAll('a').forEach(a=>{const active=a.getAttribute('href')==='#'+target;a.classList.toggle('is-current',active);if(active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});}},{rootMargin:'-150px 0px -50% 0px',threshold:0});
    sections.forEach(section=>observer.observe(section));
  }
  // A system-level motion preference and the page pause button apply to anchor movement too.
  document.addEventListener('click',event=>{if(document.body.classList.contains('mood-studio'))return;const a=event.target.closest('a[href^="#"]');if(!a)return;const target=document.getElementById(a.getAttribute('href').slice(1));if(!target)return;event.preventDefault();target.scrollIntoView({behavior:reduced.matches||document.documentElement.classList.contains('motion-paused')?'instant':'smooth',block:'start'});history.replaceState(null,'',a.getAttribute('href'));});
})();
