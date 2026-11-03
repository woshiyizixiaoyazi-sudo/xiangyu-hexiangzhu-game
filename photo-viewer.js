'use strict';
// Viewing a photo never touches the selection, proposal, or saved draft.
(() => {
  const dialog=document.createElement('dialog');
  dialog.id='product-photo-dialog';dialog.className='product-photo-dialog';
  dialog.setAttribute('aria-labelledby','product-photo-title');
  dialog.innerHTML='<div class="photo-viewer-shell"><header class="photo-viewer-header"><h2 id="product-photo-title">原款实拍</h2><button type="button" data-photo-close aria-label="关闭大图" autofocus>关闭 ×</button></header><div class="photo-viewer-stage" tabindex="0" aria-label="产品大图，放大后可滑动或用方向键查看"><div class="photo-viewer-canvas"><img class="photo-viewer-image" alt="" draggable="false"></div><p class="photo-viewer-status" role="status">正在加载原图…</p></div><footer class="photo-viewer-footer"><div class="photo-viewer-tools" role="group" aria-label="图片缩放"><button type="button" data-photo-minus aria-label="缩小图片">−</button><output aria-live="polite" aria-label="放大倍数">1×</output><button type="button" data-photo-plus aria-label="放大图片">＋</button><button type="button" data-photo-reset>适应屏幕</button></div><p>放大后滑动看细节 · 双击图片切换放大</p></footer></div>';
  document.body.append(dialog);
  const find=selector=>dialog.querySelector(selector),stage=find('.photo-viewer-stage'),canvas=find('.photo-viewer-canvas'),picture=find('img'),status=find('.photo-viewer-status'),title=find('h2'),closeButton=find('[data-photo-close]'),minus=find('[data-photo-minus]'),plus=find('[data-photo-plus]'),output=find('output');
  picture.referrerPolicy='no-referrer';
  const marker='xiangyuPhotoViewer';let session=null,serial=0,drag=null;
  function withoutMarker(state){const next={...(state||{})};delete next[marker];return next;}
  // Reloading/forward navigation must never leave a phantom open-photo state.
  if(history.state?.[marker])history.replaceState(withoutMarker(history.state),'');
  function layout(zoom=1){
    if(!session||!picture.naturalWidth||!picture.naturalHeight)return;
    const oldWidth=canvas.offsetWidth||stage.clientWidth,oldHeight=canvas.offsetHeight||stage.clientHeight;
    const centerX=(stage.scrollLeft+stage.clientWidth/2)/oldWidth,centerY=(stage.scrollTop+stage.clientHeight/2)/oldHeight;
    session.zoom=Math.max(1,Math.min(4,zoom));
    stage.classList.toggle('is-zoomed',session.zoom>1);
    const width=Math.max(1,stage.clientWidth-24),height=Math.max(1,stage.clientHeight-24),fit=Math.min(width/picture.naturalWidth,height/picture.naturalHeight);
    const w=picture.naturalWidth*fit*session.zoom,h=picture.naturalHeight*fit*session.zoom;
    picture.style.width=w+'px';picture.style.height=h+'px';
    const cw=Math.max(stage.clientWidth,w+24),ch=Math.max(stage.clientHeight,h+24);
    canvas.style.width=session.zoom===1?'100%':cw+'px';canvas.style.height=session.zoom===1?'100%':ch+'px';
    stage.scrollLeft=session.zoom===1?0:Math.max(0,centerX*cw-stage.clientWidth/2);
    stage.scrollTop=session.zoom===1?0:Math.max(0,centerY*ch-stage.clientHeight/2);
    output.textContent=session.zoom+'×';minus.disabled=session.zoom<=1;plus.disabled=session.zoom>=4;
  }
  function finish(){
    if(!session)return;const previous=session;session=null;drag=null;
    if(dialog.open)dialog.close();
    for(const [key,value] of Object.entries(previous.bodyStyle))document.body.style[key]=value;
    document.documentElement.style.overflow=previous.htmlOverflow;
    picture.removeAttribute('src');picture.hidden=true;
    if(previous.afterClose){if(previous.restoreBeforeAction)window.scrollTo({left:previous.x,top:previous.y,behavior:'instant'});previous.afterClose();return;}
    window.scrollTo({left:previous.x,top:previous.y,behavior:'instant'});
    const restoreFocus=()=>{if(!session&&serial===previous.generation&&location.href===previous.url&&previous.opener?.isConnected&&previous.opener.getClientRects().length)previous.opener.focus({preventScroll:true});};
    restoreFocus();
    // Some browsers reset focus to body after popstate/close completes. Retry only
    // in that case; never steal focus from a newer photo, navigation, or control.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(document.activeElement===document.body)restoreFocus();}));
  }
  function dismiss(){
    if(!session||session.closing)return;
    session.closing=true;
    if(history.state?.[marker]===session.id)history.back();else finish();
  }
  function deferNavigation(action,{restoreScroll=false}={}){if(!session)return false;session.afterClose=action;session.restoreBeforeAction=restoreScroll;dismiss();return true;}
  function open({src,name,opener}){
    // A source album in the existing same-origin dialog uses the parent's viewer.
    try{if(window.parent!==window&&window.parent.location.origin===location.origin&&window.parent.XiangyuPhotoViewer){window.parent.XiangyuPhotoViewer.open({src,name,opener});return;}}catch{}
    if(session)return;
    let url;try{url=new URL(src,location.href);}catch{return;}
    const inlinePhoto=/^data:image\/(?:jpeg|png|webp|gif|avif);base64,/i.test(src);const localPhoto=url.protocol==='file:'&&location.protocol==='file:';if(!['http:','https:'].includes(url.protocol)&&!inlinePhoto&&!localPhoto)return;
    const bodyStyle={};for(const key of ['position','top','left','right','width','overflow'])bodyStyle[key]=document.body.style[key];
    session={id:Date.now()+'-'+(++serial),generation:serial,url:location.href,opener,x:window.scrollX,y:window.scrollY,zoom:1,bodyStyle,htmlOverflow:document.documentElement.style.overflow,closing:false,afterClose:null};
    title.textContent=name||'原款实拍';picture.alt=name||'原款实拍';picture.hidden=true;status.hidden=false;status.textContent='正在加载原图…';output.textContent='1×';minus.disabled=true;plus.disabled=true;
    // Preserve the underlying entry's scroll before fixing the document for the modal.
    history.pushState({...history.state,[marker]:session.id},'');
    Object.assign(document.body.style,{position:'fixed',top:-session.y+'px',left:-session.x+'px',right:'0',width:'100%',overflow:'hidden'});document.documentElement.style.overflow='hidden';
    dialog.showModal();picture.src=url.href;closeButton.focus({preventScroll:true});
    if(picture.complete&&picture.naturalWidth){picture.hidden=false;status.hidden=true;layout(1);}
  }
  picture.addEventListener('load',()=>{if(!session)return;picture.hidden=false;status.hidden=true;layout(session.zoom);});
  picture.addEventListener('error',()=>{if(!session)return;picture.hidden=true;status.hidden=false;status.textContent='原图暂未加载，请关闭后重试。';minus.disabled=true;plus.disabled=true;});
  closeButton.addEventListener('click',dismiss);
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  dialog.addEventListener('close',()=>{if(session&&!dialog.open)dismiss();});
  let pressedBackdrop=false;
  dialog.addEventListener('pointerdown',event=>{pressedBackdrop=event.target===dialog;});
  dialog.addEventListener('click',event=>{if(event.target===dialog&&pressedBackdrop)dismiss();pressedBackdrop=false;});
  minus.addEventListener('click',()=>layout((session?.zoom||1)-.5));plus.addEventListener('click',()=>layout((session?.zoom||1)+.5));find('[data-photo-reset]').addEventListener('click',()=>layout(1));
  picture.addEventListener('dblclick',event=>{event.preventDefault();layout(session?.zoom>1?1:2);});
  // Mouse drag complements native touch scrolling; no document-wide touch blocker.
  stage.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0||!session||session.zoom<=1)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(event.pointerId);event.preventDefault();});
  stage.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;stage.scrollLeft=drag.left+drag.x-event.clientX;stage.scrollTop=drag.top+drag.y-event.clientY;});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>stage.addEventListener(type,()=>{drag=null;}));
  window.addEventListener('resize',()=>{if(session)layout(session.zoom);});
  window.addEventListener('popstate',event=>{if(!session){if(history.state?.[marker])history.replaceState(withoutMarker(history.state),'');return;}if(location.href!==session.url){session.afterClose=()=>{};finish();return;}event.stopImmediatePropagation();if(history.state?.[marker]===session.id){if(session.closing)history.back();return;}finish();},true);
  window.addEventListener('pagehide',()=>{if(!session)return;session.afterClose=()=>{};finish();});
  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-photo-viewer]');if(!trigger)return;event.preventDefault();event.stopImmediatePropagation();const img=trigger.querySelector('img');if(img&&!img.hidden&&!img.dataset.failed)open({src:img.currentSrc||img.src,name:img.alt,opener:trigger});},true);
  ['load','error'].forEach(type=>document.addEventListener(type,event=>{const trigger=event.target.parentElement;if(event.target.tagName==='IMG'&&trigger?.hasAttribute('data-photo-viewer'))trigger.disabled=type==='error';},true));
  window.XiangyuPhotoViewer={open,deferNavigation,close:dismiss};
})();
