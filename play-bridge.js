/* Same-origin adapter: the existing multi-item studio remains the source of truth. */
(()=>{
 const CHANNEL='xiangyu-play-v1';
 const cartCount=()=>state.lines.length?(state.mode==='mix'?state.mixQuantity:state.lines.reduce((n,l)=>n+l.quantity,0)):0;
 const safePost=(data)=>{if(parent!==window){const origin=parent.location.origin;parent.postMessage({channel:CHANNEL,...data},origin==='null'?'*':origin);}};
 function safeConfig(c){if(!c||typeof c!=='object')throw Error('搭配参数缺失');if(!PRODUCTS.some(p=>p.pid===c.pid))throw Error('参考款不存在');if(!Object.hasOwn(MOODS,c.moodKey)||!Object.hasOwn(SCENTS,c.family)||!Object.hasOwn(PALETTES,c.palette))throw Error('搭配选项无效');if(c.intent?.craft&&!window.XYCraft?.normalize(c.intent.craft))throw Error('工坊作品记录无效');calculateSize(c.wrist,c.diameter,c.ease,c.accent);if(![6,8,10,12].includes(+c.diameter))throw Error('珠径选项无效');return c;}
 function receive(e){if(e.source!==parent)return;let allowed;try{allowed=parent.location.origin;}catch{return;}if(e.origin!==allowed||e.data?.channel!==CHANNEL)return;
  const {action,payload,requestId}=e.data;
  try{
   if(action==='import'){
    const c=safeConfig(payload),old=state.lines.find(l=>l.config.playIntent?.id===c.intent?.id);
    if(old)loadLine(old);else{
     state.activeLineId=null;state.productId=c.pid;state.moodKey=c.moodKey;state.needs=[c.moodKey];state.style=null;state.family=c.family;window.__playIntent=JSON.parse(JSON.stringify(c.intent));
     const values={mood:c.moodText,'scent-detail':[c.intent.main,...c.intent.aux].filter(Boolean).join('、'),family:c.family,intensity:c.intensity,wrist:String(c.wrist),diameter:String(c.diameter),ease:String(c.ease),accent:c.accent,palette:c.palette,avoid:c.avoid||'','length-note':c.lengthNote||''};
     for(const [id,value]of Object.entries(values))$(id).value=String(value||'').slice(0,1000);
     update();const line=newLine(c.pid,plainConfig(),'心情制香所生成的定制意向');state.lines.push(line);state.activeLineId=line.id;markProposalDirty();update();refreshSelection();
    }
    if(!state.proposalEdited)generateProposal();else{$('stale-actions').hidden=false;$('proposal-status').textContent='新香珠已加入；已保留原手改文字，请选择更新方案或继续使用编辑内容。';}navigateStudio('purchase-plan');persistDraft();safePost({requestId,ok:true,text:$('proposal-text').value,count:cartCount()});
   }else if(action==='add-products'){
    const ids=Array.isArray(payload)?payload.slice(0,100):[];
    for(const pid of ids){if(!PRODUCTS.some(p=>p.pid===pid))continue;addProduct(pid);}
    navigateStudio('purchase-plan');safePost({requestId,ok:true,count:cartCount()});
   }else if(action==='motion'){document.documentElement.classList.toggle('play-parent-paused',!!payload);safePost({requestId,ok:true});}else if(action==='show'){
    navigateStudio(payload==='matches'?'matches':'purchase-plan');safePost({requestId,ok:true,count:cartCount()});
   }else if(action==='export'){
    const text=proposalForExport();safePost({requestId,ok:!!text,text:text||'',count:cartCount()});
   }
  }catch(err){safePost({requestId,ok:false,error:err.message||'请检查搭配参数'});}
 }
 addEventListener('message',receive);
 const pauseStyle=document.createElement('style');pauseStyle.textContent='html.play-parent-paused *,html.play-parent-paused *:before,html.play-parent-paused *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';document.head.append(pauseStyle);
 document.addEventListener('xiangyu:design-change',e=>safePost({event:'count',count:e.detail.count,mode:e.detail.mode}));
 // Product identities stay local; the public workflow does not expose the source album.
 document.querySelectorAll('a[href*="wecatalog.cn"]').forEach(a=>a.remove());
 document.querySelectorAll('.studio-about-body').forEach(el=>{const p=document.createElement('p');p.textContent='持续失眠、焦虑或身体不适需要专业帮助，合香珠不替代诊疗。孕期请先咨询医生，避开含麝香的款；完整香方与适配由店主确认。';el.append(p);});
 safePost({event:'ready',count:cartCount()});
})();
