'use strict';
// One workspace, three main views. Existing inputs and business logic remain mounted.
(() => {
  if(!document.body.classList.contains('mood-studio'))return;
  const byId=id=>document.getElementById(id);
  const nodes={mood:[document.querySelector('.mood-hero'),byId('mood-picker')],matches:[byId('matches')],adjust:[document.querySelector('.workspace'),document.querySelector('.optional-tools'),byId('studio-panel-heading'),byId('studio-adjust-tabs')],plan:[byId('purchase-plan')]};
  const routes={'mood-picker':'mood',matches:'matches','design-start':'adjust','purchase-plan':'plan'};
  const dialogContact=byId('studio-contact-dialog'),contact=byId('wechat-contact');
  dialogContact.append(contact);
  const actionBar=document.querySelector('.current-selection');actionBar.classList.add('studio-action-bar');document.body.append(actionBar);nodes.adjust.push(actionBar);
  const visual=document.querySelector('.visual');const diagramDetails=document.createElement('details');diagramDetails.className='studio-diagram';const diagramSummary=document.createElement('summary');diagramSummary.textContent='查看珠序示意（非原款实拍）';diagramDetails.append(diagramSummary,visual);document.querySelector('.design').insertBefore(diagramDetails,document.querySelector('.scent'));diagramDetails.hidden=visual.hidden;
  function adjustTab(name){document.body.dataset.adjustTab=name;document.querySelectorAll('[data-adjust-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.adjustTab===name)));document.querySelector('.composer').hidden=name!=='composer';document.querySelector('.design').hidden=name!=='design';}
  document.querySelectorAll('[data-adjust-tab]').forEach(button=>button.addEventListener('click',()=>adjustTab(button.dataset.adjustTab)));
  adjustTab('design');
  document.body.classList.add('studio-ready');
  let current='mood';
  const entryTimers=new WeakMap();
  function enterPanels(view){const allowed=!document.documentElement.classList.contains('motion-paused')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;nodes[view].filter(node=>node&&!node.hidden&&node!==actionBar).forEach((node,index)=>{clearTimeout(entryTimers.get(node));node.classList.remove('studio-enter');if(!allowed)return;node.style.setProperty('--entry-delay',Math.min(index,2)*45+'ms');void node.offsetWidth;node.classList.add('studio-enter');entryTimers.set(node,setTimeout(()=>node.classList.remove('studio-enter'),460));});}
  function show(view,options={}){
    if(window.XiangyuPhotoViewer?.deferNavigation(()=>show(view,options)))return;
    const {focus=true,historyMode='push'}=options;
    if(!Object.hasOwn(nodes,view))return;
    current=view;document.body.dataset.studioView=view;if(view==='adjust')adjustTab(document.body.dataset.adjustTab||'design');
    Object.entries(nodes).forEach(([name,list])=>list.forEach(node=>{if(node)node.hidden=name!==view;}));
    const target=view==='adjust'?'matches':view==='mood'?'mood-picker':view==='plan'?'purchase-plan':'matches';
    document.querySelectorAll('.mobile-nav a').forEach(a=>{const active=a.hash==='#'+target;a.classList.toggle('is-current',active);if(active)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
    // Keep the default view fragment-free: a load-time #mood-picker can trigger
    // native anchor scrolling after our initial scrollTo(0) has already run.
    const hash=view==='mood'?'':'#'+(view==='adjust'?'design-start':target);
    if(historyMode!=='none'&&location.hash!==hash)history[historyMode==='replace'?'replaceState':'pushState']({studioView:view},'',location.pathname+location.search+hash);
    window.scrollTo({top:0,behavior:'instant'});
    enterPanels(view);document.dispatchEvent(new CustomEvent('xiangyu:studio-view',{detail:{view}}));
    if(focus){const heading=nodes[view].flatMap(node=>node?[...node.querySelectorAll('h1,h2')].filter(heading=>!heading.closest('[hidden]')):[])[0];if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  }
  function openDialog(dialog){if(window.XiangyuPhotoViewer?.deferNavigation(()=>openDialog(dialog),{restoreScroll:true}))return;if(!dialog.open)dialog.showModal();}
  function openContact(){contact.hidden=false;byId('source-consultation').hidden=true;openDialog(dialogContact);}
  document.addEventListener('xiangyu:navigate',event=>{const target=event.detail?.target;if(target==='wechat-contact'){event.preventDefault();openContact();}else if(routes[target]){event.preventDefault();show(routes[target]);}});
  document.addEventListener('click',event=>{
    const close=event.target.closest('[data-close-dialog]');if(close){close.closest('dialog').close();return;}
    if(event.target.closest('[data-studio-about]')){openDialog(byId('studio-about-dialog'));return;}
    const a=event.target.closest('a[href]');if(!a)return;
    const url=new URL(a.href,location.href);
    if(url.origin!==location.origin)return;
    if(url.pathname.endsWith('/catalog.html')){event.preventDefault();const dialog=byId('studio-source-dialog');dialog.querySelector('iframe').src=url.href;openDialog(dialog);return;}
    if((url.pathname===location.pathname||/\/(?:index|customize)\.html$/.test(url.pathname))&&routes[url.hash.slice(1)]){event.preventDefault();show(routes[url.hash.slice(1)]);}
    else if(a.classList.contains('brand')){event.preventDefault();show('mood');}
  });
  byId('studio-back').addEventListener('click',()=>show('matches'));
  byId('studio-install').addEventListener('click',()=>{byId('install-app').click();byId('studio-install-note').hidden=false;});
  byId('studio-open-contact').addEventListener('click',()=>{byId('studio-about-dialog').close();openContact();});
  document.querySelectorAll('.studio-dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();}));
  const sourceFrame=byId('studio-source-dialog').querySelector('iframe');
  window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==sourceFrame.contentWindow||!event.data||event.data.source!=='xiangyu-catalog')return;const message=event.data;if(message.action==='select'){byId('studio-source-dialog').close();document.dispatchEvent(new CustomEvent('xiangyu:select-product',{detail:{pid:typeof message.pid==='string'?message.pid:null,srcIdx:Number.isInteger(message.srcIdx)?message.srcIdx:null}}));}else if(message.action==='ask'&&typeof message.text==='string'&&message.text.length>0&&message.text.length<=5000){byId('studio-source-dialog').close();openContact();byId('source-consultation').hidden=false;byId('source-consultation-text').value=message.text;}else if(message.action==='navigate'){byId('studio-source-dialog').close();if(message.target==='contact')openContact();else show(message.target==='home'?'mood':'matches');}});
  byId('studio-source-dialog').addEventListener('close',()=>{byId('studio-source-dialog').querySelector('iframe').removeAttribute('src');});
  window.addEventListener('popstate',()=>show(routes[location.hash.slice(1)]||'mood',{historyMode:'none'}));
  window.addEventListener('hashchange',()=>{const view=routes[location.hash.slice(1)];if(view&&view!==current)show(view,{historyMode:'none'});});
  show(routes[location.hash.slice(1)]||'mood',{focus:false,historyMode:'replace'});
})();
