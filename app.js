'use strict';
// Curated demonstration directions. Actual formulas, raw-material specifications,
// production approval and SKU images must be supplied before commercial use.
const MOODS={
 settle:{label:'给想慢下来的你',name:'留白',family:'wood',words:['焦虑','紧张','压力','烦','忙','乱','累','平静','慢','放松'],caption:'收一点色彩，留一点呼吸的空间。',palette:'earth',diameter:8},
 focus:{label:'给想专注一点的你',name:'山序',family:'herbal',words:['专注','分心','学习','工作','思考','考试','读书','集中'],caption:'草木与留白，陪你做眼前的一件事。',palette:'forest',diameter:8},
 spark:{label:'给想有点新鲜感的你',name:'朝光',family:'fresh',words:['新鲜','疲惫','疲倦','无聊','动力','精神','低落','困','活力'],caption:'浅木色里，一点明亮的变化。',palette:'light',diameter:6},
 warm:{label:'给想被温柔陪伴的你',name:'暖枝',family:'floral',words:['温柔','陪伴','孤独','想家','失恋','难过','委屈','悲伤','孤单'],caption:'一缕花木香，给日常一个柔软的细节。',palette:'light',diameter:6},
 joy:{label:'给想记录开心的你',name:'若喜',family:'floral',words:['开心','快乐','庆祝','礼物','纪念','生日','喜悦','约会'],caption:'用一颗点缀，留下今天的好心情。',palette:'earth',diameter:8}
};
const SCENTS={
 wood:{title:'柔和木香 · 清淡草木尾韵',materials:['檀香','雪松'],familyLabel:'柔和木香'},
 fresh:{title:'清新柑橘 · 木香收尾',materials:['陈皮','檀香'],familyLabel:'清新柑橘'},
 floral:{title:'淡雅花香 · 温润木底',materials:['桂花','檀香'],familyLabel:'淡雅花香'},
 herbal:{title:'草木清香 · 木质底韵',materials:['艾草','雪松'],familyLabel:'草木清香'}
};
const PALETTES={earth:{label:'深木·朱红',main:'#76533b',accent:'#9b4539',tag:'素雅 · 木色'},light:{label:'浅木·月白',main:'#bea07c',accent:'#eee6d6',tag:'轻巧 · 月白'},forest:{label:'棕木·墨绿',main:'#866748',accent:'#27584a',tag:'草木 · 墨绿'}};
const ACCENT_LABELS={single:'一颗配色珠',metal:'一枚金色配件',none:'全素珠'};
const STYLES=[{id:'minimal',name:'留白',caption:'少一点点缀，多一点原本的质感。',label:'素雅日常',palette:'earth',diameter:8,accent:'none'},{id:'light',name:'月白',caption:'小珠、浅木色，一颗明亮的留白。',label:'轻巧清爽',palette:'light',diameter:6,accent:'single'},{id:'classic',name:'山序',caption:'木色与墨绿，保留克制的存在感。',label:'沉稳点缀',palette:'forest',diameter:10,accent:'metal'}];
const VERIFIED_PRODUCTS=typeof window!=='undefined'?(window.REAL_PRODUCTS||[]):[];
const PRODUCTS=typeof window!=='undefined'?(window.SOURCE_PRODUCTS||VERIFIED_PRODUCTS):[];
const DRAFT_KEY='xiangyu-play-multi-proposal-v2';
let state={moodKey:'settle',needs:[],style:null,family:'wood',recommended:false,productId:'P2',activeLineId:null,lines:[],mode:'separate',mixQuantity:1,nextId:1,proposalDirty:false,proposalEdited:false};
const FIELD_IDS=['mood','family','intensity','scent-detail','avoid','wrist','diameter','ease','accent','palette','length-note','product-search','product-category','plan-note','proposal-text'];
let modeDrafts={separate:null,mix:null},initialFields={},sourceLimit=24,localLimit=4,sourceSignature='';
function selectedProduct(){return PRODUCTS.find(p=>p.pid===state.productId)||PRODUCTS[0]||null;}
function isBracelet(){return selectedProduct()?.cat==='手串';}
const $=id=>document.getElementById(id);
function numberInRange(value,min,max,label){const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new Error(label+'超出范围');return n;}
function inferMood(text){let winner='settle',max=0;for(const [key,mood]of Object.entries(MOODS)){const score=mood.words.reduce((n,w)=>n+(text.includes(w)?1:0),0);if(score>max){max=score;winner=key;}}return {key:winner,matched:max>0};}
function calculateSize(wrist,diameter,ease,accent){
 wrist=numberInRange(wrist,12,23,'手围');diameter=numberInRange(diameter,6,12,'珠径');ease=numberInRange(ease,.5,1.5,'松量');
 if(!['single','metal','none'].includes(accent))throw new Error('点缀选项无效');
 const accentCount=accent==='none'?0:1,accentSize=accent==='metal'?4:diameter;
 // Approximate inner perimeter from bead centerline, not a manufacturing fit guarantee.
 const centerLength=(wrist+ease)*10+Math.PI*diameter;
 const mainCount=Math.max(5,Math.round((centerLength-accentCount*accentSize)/diameter));
 const inner=(mainCount*diameter+accentCount*accentSize-Math.PI*diameter)/10;
 return {mainCount,accentCount,accentSize,inner:Number(inner.toFixed(1)),wrist,diameter,ease};
}
function currentConfig(){const c=calculateSize($('wrist').value,$('diameter').value,$('ease').value,$('accent').value);return {...c,playIntent:state.activeLineId?(state.lines.find(l=>l.id===state.activeLineId)?.config.playIntent||null):(window.__playIntent||null),product:selectedProduct(),lengthNote:$('length-note').value.trim(),moodKey:state.moodKey,designName:state.style?STYLES.find(x=>x.id===state.style).name:MOODS[state.moodKey].name,family:state.family,familyPreference:$('family').value,aroma:SCENTS[state.family].title,palette:$('palette').value,accent:$('accent').value,intensity:$('intensity').selectedOptions[0].textContent,intensityValue:$('intensity').value,style:state.style,scentDetail:$('scent-detail').value.trim(),needs:[...state.needs],avoid:$('avoid').value.trim(),text:$('mood').value.trim(),status:'定制意向，香方、库存、尺寸与报价待店主确认'};}
function drawDiagram(c){
 const svg=$('bead-diagram'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();
 const add=(tag,attrs,txt)=>{const el=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(txt!==undefined)el.textContent=txt;svg.append(el);return el;};
 const colors=PALETTES[c.palette],n=c.mainCount+c.accentCount,r=103,dot=Math.min(17,Math.PI*r/n*.83);
 add('circle',{cx:160,cy:137,r,fill:'none',stroke:'#c4cdc0','stroke-width':1,'stroke-dasharray':'3 4'});
 for(let i=0;i<n;i++){const t=(i/n)*Math.PI*2-Math.PI/2,isAccent=c.accentCount&&i===0,metal=isAccent&&c.accent==='metal';const radius=metal?Math.max(5,dot*.52):dot;
 add('circle',{cx:(160+Math.cos(t)*r).toFixed(2),cy:(137+Math.sin(t)*r).toFixed(2),r:radius.toFixed(2),fill:isAccent?(metal?'#bc984e':colors.accent):colors.main,stroke:isAccent?'#b4ac94':'#ffffff70','stroke-width':1.5});}
 add('text',{x:160,y:134,'text-anchor':'middle',fill:'#163d34','font-size':25,'font-family':'serif'},c.diameter+' mm');
 add('text',{x:160,y:159,'text-anchor':'middle',fill:'#64736b','font-size':12},'净手围 '+c.wrist.toFixed(1)+' cm');
 svg.setAttribute('aria-label',c.designName+'珠序结构示意，'+c.mainCount+'颗主珠'+(c.accentCount?'和一颗点缀':'')+'，珠径'+c.diameter+'毫米');
}
function update(){
 const c=currentConfig(),mood=MOODS[c.moodKey];$('design-heading').textContent=c.designName;$('mood-label').textContent=mood.label;$('style-tag').textContent=PALETTES[c.palette].tag;
 $('design-caption').textContent=state.style?STYLES.find(x=>x.id===state.style).caption:mood.caption;
 $('scent-title').textContent=c.aroma;$('scent-materials').textContent='这是你希望的气味方向。所选原款的完整成分和配比尚未取得，由店主确认后配香。';
 $('wrist-value').textContent=c.wrist.toFixed(1)+' cm';$('count').textContent=c.mainCount+'颗主珠'+(c.accentCount?' + 1'+(c.accent==='metal'?'枚配件':'颗配珠'):'');$('inner-size').textContent=c.inner.toFixed(1)+' cm';
 $('selected-line').textContent=(c.product?shortName(c.product)+' / ':'')+c.designName+' / '+(isBracelet()?c.diameter+' mm / ':c.product?.cat+' / ')+PALETTES[c.palette].label;
 if(c.product){$('real-photo').src=c.product.img;$('real-photo').alt='相册参考款：'+shortName(c.product);$('real-name').textContent=shortName(c.product);$('detail-link').href=c.product.pid.startsWith('P')?'catalog.html?pid='+encodeURIComponent(c.product.pid)+'#detail':'catalog.html?srcIdx='+c.product.srcIdx+'#detail';}
 document.querySelector('.preview-pair').classList.toggle('single-preview',!isBracelet());
 const bracelet=isBracelet();['bracelet-specs','bracelet-summary','bracelet-note'].forEach(id=>$(id).hidden=!bracelet);$('other-size').hidden=bracelet;document.querySelector('.visual').hidden=!bracelet;if(document.querySelector('.studio-diagram'))document.querySelector('.studio-diagram').hidden=!bracelet;
 document.querySelectorAll('[data-product]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.product===state.productId)));
 document.querySelectorAll('[data-mood]').forEach(b=>{b.classList.toggle('active',state.needs.includes(b.dataset.mood));b.setAttribute('aria-pressed',String(b.classList.contains('active')));});
 document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===state.style)));
 const health=/失眠|焦虑|抑郁|治疗|治愈|头痛|病|身体不适/.test(c.text);$('health-note').hidden=!health;
 const hasAvoid=c.avoid.length>0;$('avoid-note').hidden=!hasAvoid;
 if(hasAvoid){$('avoid-note').textContent='已记录避用要求。原款没有完整成分清单，须由店主核对香方后确认；页面选款不能替代过敏原核查。';}
 drawDiagram(c);syncActiveLine(c);renderCart();persistDraft();return c;
}
function recommend(forced){
 const text=$('mood').value.trim(),inference=inferMood(text);state.moodKey=forced||inference.key;state.style=null;state.recommended=true;
 if(!forced){const found=inferNeeds(text);state.needs=[...new Set([...state.needs,...found])];}
 const mood=MOODS[state.moodKey],chosen=$('family').value;state.family=chosen==='auto'?mood.family:chosen;
 if(!state.activeLineId){$('palette').value=mood.palette;$('diameter').value=String(mood.diameter);$('accent').value='single';}
 if($('product-category').value==='all'){const typeHints=[['耳环',/耳环|耳饰|耳钉|耳坠/],['吊坠',/吊坠|挂坠/],['项链',/项链|锁骨链/],['香牌',/香牌/],['手串',/手串|手链/],['工艺品',/工艺品|摆件/]];const hint=typeHints.find(([cat,re])=>re.test(text));if(hint)$('product-category').value=hint[0];}
 const candidates=matchProducts({query:$('product-search').value,scentDetail:$('scent-detail').value,family:$('family').value,category:$('product-category').value,avoid:$('avoid').value,needText:text});if(!state.activeLineId&&candidates.some(c=>c.evidence.length))state.productId=candidates[0].product.pid;
 $('matching-reason').textContent='先按你的需求整理气味与外观意向，再从有来源的候选里多选。实际功能适配与香方由店主确认。';
 update();renderProducts();
}
function chooseStyle(id){const s=STYLES.find(x=>x.id===id);if(!s)throw new Error('未知款式');state.style=s.id;$('palette').value=s.palette;$('diameter').value=String(s.diameter);$('accent').value=s.accent;update();}
function renderStyles(){const container=$('style-options');STYLES.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='style-option';b.dataset.style=s.id;b.setAttribute('aria-pressed','false');
 const label=document.createElement('span');label.textContent=s.label;const name=document.createElement('strong');name.textContent=s.name;const p=document.createElement('p');p.textContent=s.caption;const swatches=document.createElement('div');swatches.className='swatches';swatches.setAttribute('aria-hidden','true');
 [PALETTES[s.palette].main,PALETTES[s.palette].accent].forEach(color=>{const i=document.createElement('i');i.style.background=color;swatches.append(i);});b.append(label,name,p,swatches);b.addEventListener('click',()=>chooseStyle(s.id));container.append(b);});}
function specText(){const c=currentConfig();const product=c.product;const dimensions=isBracelet()?['净手围：'+c.wrist.toFixed(1)+' cm','主珠珠径意向：'+c.diameter+' mm','佩戴松量：'+c.ease.toFixed(1)+' cm','圆珠单圈估算结构：'+c.mainCount+'颗主珠'+(c.accentCount?'，1'+(c.accent==='metal'?'枚配件':'颗配珠'):'，无配件'),'估算内周长：'+c.inner.toFixed(1)+' cm','双圈或异形珠尺寸需另核']:['长度/外形尺寸意向：'+(c.lengthNote||'保持原款，待确认')];return ['仙作汇｜合香珠搭配沟通单','状态：定制咨询，待店主确认，未下单','相册基准款：'+(product?shortName(product):'待定'),'产品引用：'+(product?product.pid+' · 来源记录 #'+product.srcIdx:'待定'),'外观意向：'+c.designName,'心情/场景：'+(c.text||MOODS[c.moodKey].label),'气味偏好：'+c.aroma,'完整香方与配比：待店主提供，不能根据款名推断','气味存在感：'+c.intensity,'希望避开：'+(c.avoid||'未填写，需制作前核对'),...dimensions,...(c.lengthNote?['形态 / 补充尺寸意向：'+c.lengthNote]:[]),'配色意向：'+PALETTES[c.palette].label,'报价：待店主确认','制作前待确认：库存、完整香方、避用要求、配件、尺寸试戴、护理方法与工期。','说明：珠序图为设计意向，原款实拍图未改色；不构成医疗建议。防水、耐汗和保香尚未核实。该单不代表订单或付款。'].join('\n');}
function inferNeeds(text){return Object.entries(MOODS).filter(([k,m])=>m.words.some(w=>text.includes(w))).map(([k])=>k);}
const SCENT_WORDS={wood:['檀香','沉香','木香'],fresh:['柑橘','陈皮','柠檬','橙香'],floral:['茉莉','玫瑰','栀子','桂花','花香','花蕊'],herbal:['艾草','草木','草本']};
function matchProducts(input,products=PRODUCTS){
 const words=[...new Set((input.query||'').trim().split(/[\s，,、；;]+/).filter(Boolean))];
 const aroma=[...new Set((input.scentDetail||'').trim().split(/[\s，,、；;]+/).filter(Boolean))];
 const familyWords=input.family&&input.family!=='auto'?(SCENT_WORDS[input.family]||[]):[];
 const text=(input.needText||'')+' '+(input.scentDetail||'');const literalTerms=['茉莉','玫瑰','栀子','桂花','鹅梨','紫气东来','花蕊夫人','天木藏香','蓝色妖姬','千怜香',...Object.values(SCENT_WORDS).flat()];const avoidText=input.avoid||'';const blocked=literalTerms.filter(w=>avoidText.includes(w));const titleTerms=literalTerms.filter(w=>text.includes(w)&&!new RegExp('不(?:喜欢|想要|要|想)[^，。；]{0,8}'+w).test(text));
 const explicit=[...new Set([...words,...aroma.filter(w=>products.some(p=>p.name.includes(w))),...titleTerms])];
 const typedPool=input.category&&input.category!=='all'?products.filter(p=>p.cat===input.category):products;
 const pool=typedPool.filter(p=>!blocked.some(w=>p.name.includes(w))&&(!words.length||words.some(w=>p.name.includes(w))));
 const results=pool.map(product=>{const evidence=[];for(const w of explicit)if(product.name.includes(w))evidence.push('来源名称/描述提及「'+w+'」');
 const scentHits=familyWords.filter(w=>product.name.includes(w));if(scentHits.length)evidence.push('气味名称参考：'+scentHits.join('、'));
 return {product,evidence,matched:evidence.length>0};});
 // Every literal candidate is retained; no invented numerical match score.
 if(words.length)return results.filter(x=>x.matched);
 if(aroma.length||titleTerms.length){const requested=[...aroma,...titleTerms];return results.filter(x=>requested.some(w=>x.product.name.includes(w)));}
 if(familyWords.length)return results.filter(x=>x.matched);
 return results.filter(x=>input.category&&input.category!=='all'?x.product.cat===input.category:x.product.photoVerified||VERIFIED_PRODUCTS.some(p=>p.pid===x.product.pid));
}
function scentSummary(p){const words=['茉莉','玫瑰','栀子','桂花','檀香','沉香','艾草'];const found=words.filter(w=>String(p.name||'').includes(w));return found.length?'款名提及'+found.join('、')+'；实际香气与用料待确认。':'香气与用料待确认。';}
function shortName(p){if(typeof window!=='undefined'&&window.XYPublicProducts)return window.XYPublicProducts.nameFor(p);return (['手串','项链','香牌','工艺品','吊坠','耳环'].includes(p?.cat)?p.cat:'款式')+'参考款 · 来源 #'+(Number.isSafeInteger(p?.srcIdx)?p.srcIdx:'待确认');}
function photoButton(img){const button=document.createElement('button');button.type='button';button.className='product-photo-trigger';button.dataset.photoViewer='';button.setAttribute('aria-label','放大查看：'+img.alt);button.append(img);return button;}
function productCard(entry){const p=entry.product,card=document.createElement('article');card.className='product-option';card.dataset.product=p.pid;
 const img=document.createElement('img');img.src=p.img;img.alt='来源实拍：'+shortName(p);img.loading='lazy';img.width=360;img.height=270;img.addEventListener('error',()=>{img.hidden=true;message.hidden=false;});
 const message=document.createElement('p');message.className='image-unavailable muted fine';message.hidden=true;message.textContent='来源图片暂未显示，可查看相册原记录。';
 const name=document.createElement('strong');name.textContent=shortName(p);const meta=document.createElement('span');meta.textContent=p.cat+' · 来源 #'+p.srcIdx+(p.photoVerified?' · 实拍已保存':' · 相册图片未核验');
 const why=document.createElement('p');why.className='match-evidence';why.textContent=scentSummary(p);const details=document.createElement('details');details.className='product-info';const summary=document.createElement('summary');summary.textContent='材质、工艺与保养';const info=document.createElement('p');info.textContent='材质与配比：待店主提供本款资料。工艺：未逐款核验。保养：防水、耐汗和保香尚未核实，请向店主确认。';details.append(summary,meta,info);
 const actions=document.createElement('div');actions.className='product-card-actions';const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=state.lines.some(l=>l.pid===p.pid);cb.dataset.selectProduct=p.pid;cb.addEventListener('change',()=>{if(cb.checked)addProduct(p.pid);else removeProduct(p.pid);});label.append(cb,document.createTextNode('加入方案'));
 const preview=document.createElement('button');preview.type='button';preview.className='secondary';preview.textContent='选这款并调整';preview.addEventListener('click',()=>{addProduct(p.pid);navigateStudio('design-start');});actions.append(label,preview);if(state.activeLineId){const replace=document.createElement('button');replace.type='button';replace.className='secondary';replace.textContent='替换当前项';replace.addEventListener('click',()=>{const line=state.lines.find(l=>l.id===state.activeLineId);if(!line)return;const old=PRODUCTS.find(x=>x.pid===line.pid);if(old?.cat!==p.cat)$('length-note').value='';line.pid=p.pid;state.productId=p.pid;markProposalDirty();update();renderProducts();});actions.append(replace);}card.append(photoButton(img),message,name,why,actions,details);return card;}
function renderProducts(){
 const input={query:$('product-search').value,scentDetail:$('scent-detail').value,family:$('family').value,category:$('product-category').value,avoid:$('avoid').value,needText:$('mood').value};const results=matchProducts(input);const local=results.filter(x=>x.product.photoVerified),other=results.filter(x=>!x.product.photoVerified);
 const signature=JSON.stringify(input);if(signature!==sourceSignature){sourceSignature=signature;sourceLimit=24;localLimit=4;}
 $('product-options').replaceChildren(...local.slice(0,localLimit).map(productCard));if($('local-more')){$('local-more').hidden=localLimit>=local.length;$('local-more').textContent='再看看其他实拍款（还有'+Math.max(0,local.length-localLimit)+'款）';}const visible=$('more-matches').open?other.slice(0,sourceLimit):[];$('source-options').replaceChildren(...visible.map(productCard));$('source-more').hidden=visible.length>=other.length||!$('more-matches').open;$('source-more').textContent='继续加载款式（还剩'+Math.max(0,other.length-visible.length)+'款）';$('more-matches').hidden=!other.length;$('more-summary').textContent='更多来源款（'+other.length+'款，可多选）';
 const request=state.needs.map(k=>MOODS[k].label.replace('给','').replace('的你','')).join('、');$('need-summary').replaceChildren();for(const k of state.needs){const chip=document.createElement('span');chip.className='need-chip';chip.textContent=MOODS[k].label.replace('给','').replace('的你','')+' · 适配待确认';$('need-summary').append(chip);}
 if(request){const note=document.createElement('p');note.className='notice';note.textContent='已记录：'+request+'。来源还没有可核实的功能标签，以下按名称与气味词整理候选；店主需确认哪些适合这些需求。';$('need-summary').append(note);}
 $('match-summary').textContent=results.length?'找到 '+results.length+' 个来源候选款，已保存实拍 '+local.length+' 款。可选多个，数量与每件搭配分别填写。':'没有找到有名称依据的款。需求已保留，可调整香味词、清空搜索查看实拍参考，或请店主补充适配款。';
 if(!results.length){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='查看已保存实拍参考';b.addEventListener('click',()=>{$('product-search').value='';$('scent-detail').value='';$('family').value='auto';renderProducts();});$('product-options').append(b);}
}
function plainConfig(c=currentConfig()){const {product,...config}=c;return JSON.parse(JSON.stringify(config));}
function newLine(pid,config,reason=''){return {id:'L'+state.nextId++,pid,quantity:1,config:JSON.parse(JSON.stringify(config)),note:'',reason};}
function addProduct(pid,forceNew=false){const p=PRODUCTS.find(x=>x.pid===pid);if(!p)return;const existing=state.lines.find(x=>x.pid===pid);if(existing&&!forceNew){state.activeLineId=existing.id;loadLine(existing);return;}
 if(forceNew){window.__playIntent=null;state.activeLineId=null;state.needs=[];state.style=null;state.moodKey='settle';state.family='wood';for(const id of ['mood','family','intensity','scent-detail','avoid','length-note','wrist','diameter','ease','accent','palette'])$(id).value=initialFields[id];}
 const c=plainConfig();state.lines.push(newLine(pid,c,'按名称/气味参考选款，功能适配待确认'));state.activeLineId=state.lines.at(-1).id;state.productId=pid;markProposalDirty();update();refreshSelection();toast('已加入方案，可继续多选。');}
function removeProduct(pid){state.lines=state.lines.filter(l=>l.pid!==pid);if(!state.lines.some(l=>l.id===state.activeLineId))state.activeLineId=null;markProposalDirty();renderCart();refreshSelection();persistDraft();}
function removeLine(id){state.lines=state.lines.filter(l=>l.id!==id);if(state.activeLineId===id)state.activeLineId=null;markProposalDirty();renderCart();refreshSelection();persistDraft();}
function selectProduct(pid){window.__playIntent=null;state.activeLineId=null;state.productId=pid;$('photo-state').textContent='';update();renderProducts();navigateStudio('design-start');}
function loadLine(line){state.activeLineId=line.id;state.productId=line.pid;const c=line.config;state.moodKey=c.moodKey||'settle';state.needs=[...(c.needs||[])];state.style=STYLES.some(s=>s.id===c.style)?c.style:null;state.family=c.family||'wood';
 for(const id of ['wrist','diameter','ease','accent','palette','avoid','length-note']){const key=id==='length-note'?'lengthNote':id;if(c[key]!==undefined)$(id).value=String(c[key]);}
 $('mood').value=c.text||'';$('intensity').value=c.intensityValue||'subtle';$('family').value=c.familyPreference||c.family||'auto';$('scent-detail').value=c.scentDetail||'';update();renderProducts();navigateStudio('design-start');}
function syncActiveLine(c){const line=state.lines.find(l=>l.id===state.activeLineId);if(line){const next=plainConfig(c);next.style=state.style;if(JSON.stringify(next)!==JSON.stringify(line.config)){line.config=next;markProposalDirty();}}}
function markProposalDirty(){state.proposalDirty=true;if($('proposal-text').value)$('proposal-status').textContent='选款或参数已改变，导出前会更新；你编辑的文字仍保留。';$('stale-actions').hidden=true;}
function refreshSelection(){renderProducts();}
// Invalid edits are retained separately from last valid business quantities.
const QUANTITY_ERROR='数量须为 1–99 的整数；请更正后再汇总或导出。';
function parseQuantityValue(raw){const text=String(raw??'').trim(),n=Number(text);return text!==''&&Number.isInteger(n)&&n>=1&&n<=99?n:null;}
function quantityDraftValue(key,fallback){return typeof state.quantityInputs?.[key]==='string'?state.quantityInputs[key]:String(fallback);}
function hasInvalidQuantityDraft(){return state.mode==='mix'?typeof state.quantityInputs?.mix==='string':state.lines.some(line=>typeof state.quantityInputs?.[line.id]==='string');}
function paintQuantityError(input){
 const invalid=parseQuantityValue(input.value)===null,key=input.dataset.quantityKey||'mix',id='quantity-error-'+key;
 let message=$(id);if(!message){message=document.createElement('span');message.id=id;message.className='quantity-error';message.setAttribute('aria-live','polite');input.parentElement?.append(message);}
 input.setCustomValidity(invalid?QUANTITY_ERROR:'');input.setAttribute('aria-invalid',String(invalid));input.setAttribute('aria-describedby',id);message.textContent=invalid?QUANTITY_ERROR:'';message.hidden=!invalid;return !invalid;
}
function refreshQuantityTotals(){
 const invalid=hasInvalidQuantityDraft(),total=state.mode==='mix'?state.mixQuantity:state.lines.reduce((sum,line)=>sum+line.quantity,0);
 $('mobile-plan-count').textContent=invalid?'!':String(state.lines.length?total:0);
 $('plan-count').textContent=invalid?'数量待更正':state.lines.length+'项'+(state.mode==='mix'?' · 希望混合'+total+'串':' · 共'+total+'件');
 if(invalid)$('proposal-status').textContent=QUANTITY_ERROR;else if($('proposal-status').textContent===QUANTITY_ERROR)$('proposal-status').textContent='数量已更新；请核对方案后再导出。';
}
function quantityInputChanged(input){
 const key=input.dataset.quantityKey||'mix',n=parseQuantityValue(input.value);state.quantityInputs??={};
 if(n===null){state.quantityInputs[key]=input.value;markProposalDirty();$('proposal-status').textContent=QUANTITY_ERROR;}
 else {delete state.quantityInputs[key];const line=state.lines.find(item=>item.id===key);if(key==='mix'){if(state.mixQuantity!==n){state.mixQuantity=n;markProposalDirty();}}else if(line&&line.quantity!==n){line.quantity=n;markProposalDirty();}if($('proposal-status').textContent===QUANTITY_ERROR)$('proposal-status').textContent='数量已更正；请核对方案后再导出。';}
 paintQuantityError(input);refreshQuantityTotals();persistDraft();return n!==null;
}
function validateQuantitiesForExport(){
 const inputs=state.mode==='mix'?[$('mix-quantity')]:[...document.querySelectorAll('#cart-lines input[data-quantity-key]')];
 let firstInvalid=null;for(const input of inputs){if(!quantityInputChanged(input)&&!firstInvalid)firstInvalid=input;}
 if(firstInvalid){$('proposal-status').textContent=QUANTITY_ERROR;navigateStudio('purchase-plan');firstInvalid.focus({preventScroll:false});toast(QUANTITY_ERROR);return false;}return true;
}
function renderCart(){const box=$('cart-lines');box.replaceChildren();const total=state.lines.reduce((n,l)=>n+l.quantity,0);$('mobile-plan-count').textContent=state.mode==='mix'?state.lines.length?String(state.mixQuantity):'0':String(total);$('plan-count').textContent=state.lines.length+'项'+(state.mode==='separate'?' · 共'+total+'件':' · 希望混合'+state.mixQuantity+'串');$('cart-empty').hidden=state.lines.length>0;$('mix-quantity-field').hidden=state.mode!=='mix';$('mode-note').textContent=state.mode==='mix'?'所选款是混合方案的参考，不能直接把香方混合。混合可制作性、配比与报价须由店主确认。':'每件保留自己的需求、尺寸与数量。';
 state.lines.forEach(line=>{const p=PRODUCTS.find(x=>x.pid===line.pid);if(!p)return;const card=document.createElement('article');card.className='cart-line';card.dataset.lineId=line.id;const img=document.createElement('img');img.src=p.img;img.alt=shortName(p);img.loading='lazy';img.addEventListener('error',()=>img.hidden=true);const content=document.createElement('div');const name=document.createElement('h3');name.textContent=shortName(p);const summary=document.createElement('p');const c=line.config;summary.textContent=(c.needs||[]).map(k=>MOODS[k]?.name).filter(Boolean).join(' / ')+' · '+SCENTS[c.family]?.familyLabel+' · '+(p.cat==='手串'?c.wrist+' cm / '+c.diameter+' mm':c.lengthNote||'尺寸待确认');
 const controls=document.createElement('div');controls.className='line-controls';const qlabel=document.createElement('label');qlabel.textContent='数量';const qty=document.createElement('input');qty.type='number';qty.min='1';qty.max='99';qty.value=quantityDraftValue(line.id,line.quantity);qty.dataset.quantityKey=line.id;qty.setAttribute('aria-label',line.id+' 数量');qty.inputMode='numeric';qty.disabled=state.mode==='mix';qty.addEventListener('input',()=>quantityInputChanged(qty));qty.addEventListener('change',()=>quantityInputChanged(qty));qlabel.append(qty);paintQuantityError(qty);
 const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='编辑 / 换款';edit.addEventListener('click',()=>loadLine(line));const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='移除';remove.addEventListener('click',()=>removeLine(line.id));controls.append(qlabel,edit,remove);const noteLabel=document.createElement('label');noteLabel.className='field';noteLabel.textContent='这件的备注';const note=document.createElement('input');note.type='text';note.maxLength=200;note.value=line.note;note.setAttribute('aria-label',line.id+' 备注');note.addEventListener('input',()=>{line.note=note.value;markProposalDirty();persistDraft();});noteLabel.append(note);content.append(name,summary,controls,noteLabel);card.append(photoButton(img),content);box.append(card);});
 const active=state.lines.find(l=>l.id===state.activeLineId);$('editing-line').textContent=active?'正在编辑方案项 '+active.id+'，参数修改会自动保存。更换参考款请使用下方候选。':'当前预览尚未加入方案。';$('selection-status').textContent=active?'当前方案项 '+active.id+' · 参数修改自动保存':'当前预览 · 尚未加入方案';$('add-current').textContent=active?'下一步：汇总需求':'加入并继续';$('mix-quantity').dataset.quantityKey='mix';$('mix-quantity').value=quantityDraftValue('mix',state.mixQuantity);paintQuantityError($('mix-quantity'));refreshQuantityTotals();}
function proposalText(){const head=['仙作汇｜购买方案（待店主确认）','状态：自主选款与定制意向，未下单、未付款','搭配方式：'+(state.mode==='mix'?'希望混合到一串；希望制作 '+state.mixQuantity+' 串':'分别搭配多件 / 多串'),''];
 state.lines.forEach((line,i)=>{const p=PRODUCTS.find(x=>x.pid===line.pid),c=line.config;if(!p)return;head.push((i+1)+'. '+shortName(p),'来源：'+p.pid+' / 相册记录 #'+p.srcIdx,state.mode==='mix'?'用途：混合方案参考（不是自动合香方）':'数量：'+line.quantity+' 件','需求：'+((c.needs||[]).map(k=>MOODS[k]?.label).join('、')||c.text||'日常佩戴'),'需求 / 痛点原文：'+(c.text||'未填写'),'希望气味：'+(c.scentDetail||SCENTS[c.family]?.title||'待确认'),'香气存在感：'+(c.intensity||({subtle:'轻一点，靠近才闻到',medium:'适中，自己能感受到',full:'更鲜明的香气方向'}[c.intensityValue])||'待店主确认'),...(c.playIntent?['心境名：'+c.playIntent.moodName,'专属香珠意向：'+c.playIntent.name,'意向编号：'+c.playIntent.id,'主香意向：'+c.playIntent.main,'辅香意向：'+(c.playIntent.aux.join('、')||'交给店主配'),'气味记忆：'+(c.playIntent.memory||'未选择'),'给自己的一句话：'+(c.playIntent.sentence||'留一点喜欢，给今天的自己')]:[]),...(c.playIntent?.craft&&window.XYCraft?['',window.XYCraft.text(window.XYCraft.normalize(c.playIntent.craft)),'工作台基础配色仅为通用示意；工坊逐珠颜色见上述明细，可制作性由店主确认。','']:[]),'希望避开：'+(c.avoid||'未填写，制作前核对'),'成品形态意向：'+(c.playIntent?.form||'按参考款，由店主确认'),(c.playIntent?.form?/手串|手链/.test(c.playIntent.form):p.cat==='手串')?'尺寸意向：净手围 '+c.wrist+' cm；珠径 '+c.diameter+' mm；松量 '+c.ease+' cm；'+PALETTES[c.palette]?.label+'；'+(ACCENT_LABELS[c.accent]||'点缀待确认'):'长度 / 外形意向：'+(c.lengthNote||'保持原款，待确认'),...(c.lengthNote?['形态 / 补充尺寸意向：'+c.lengthNote]:[]),'单件备注：'+(line.note||'无'),'功能适配、完整香方、配比、库存与价格：待店主确认','');});
 head.push('方案备注：'+($('plan-note').value.trim()||'无'),'报价与币种：待店主确认。未把来源数字当零售价，未自动加价或换汇。','混合时须确认香材兼容性、每串组成与数量；不能把多个功能价格直接相加。','实拍为原款照片，珠圈为外观意向；香方、适配和护理效果由店主确认。','确认香方、避用材料、库存、最终规格、总价、工期与护理后，再决定购买。');return head.join('\n');}
function generateProposal(){if(!state.lines.length){toast('先选至少一款。');return false;}if(!validateQuantitiesForExport())return false;$('proposal-text').value=proposalText();state.proposalDirty=false;state.proposalEdited=false;$('stale-actions').hidden=true;$('proposal-status').textContent='方案已生成，可自行修改；待店主确认，尚未下单。';persistDraft();return true;}
function proposalForExport(){
 if(!state.lines.length){toast('先选至少一款，再生成方案。');return null;}
 if(!validateQuantitiesForExport())return null;
 if(state.proposalDirty&&state.proposalEdited&&$('proposal-text').value){$('stale-actions').hidden=false;toast('参数已变化，请选择更新方案或使用你编辑的文字。');return null;}
 if((!state.proposalEdited||!$('proposal-text').value||state.proposalDirty)&&!generateProposal())return null;
 return $('proposal-text').value;
}
function downloadText(text,name){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('文件已生成，请按浏览器提示保存。');}
function fieldsNow(){const fields={};for(const id of FIELD_IDS)fields[id]=$(id).value;return fields;}
function snapshotDraft(){return {state:JSON.parse(JSON.stringify(state)),fields:fieldsNow()};}
function announceDesign(){document.dispatchEvent(new CustomEvent('xiangyu:design-change',{detail:{mood:state.moodKey,needs:[...state.needs],count:state.lines.length?(state.mode==='mix'?state.mixQuantity:state.lines.reduce((n,l)=>n+l.quantity,0)):0,mode:state.mode,quantityInvalid:hasInvalidQuantityDraft()}}));}
function persistDraft(){announceDesign();try{
 modeDrafts[state.mode]=snapshotDraft();
 localStorage.setItem(DRAFT_KEY,JSON.stringify({version:2,state,fields:fieldsNow(),modeDrafts}));
 }catch{$('proposal-status').textContent='浏览器没有保存草稿，请复制或下载方案。';}}
function checkedDraft(d,expectedMode){
 if(!d?.state||!Array.isArray(d.state.lines))throw new Error('草稿结构');
 const st=d.state,validNeeds=v=>Array.isArray(v)&&v.every(k=>Object.hasOwn(MOODS,k));
 if(!Object.hasOwn(MOODS,st.moodKey)||!Object.hasOwn(SCENTS,st.family)||!validNeeds(st.needs)||!['separate','mix'].includes(st.mode)||(expectedMode&&st.mode!==expectedMode)||!PRODUCTS.some(p=>p.pid===st.productId)||!Number.isInteger(st.mixQuantity)||st.mixQuantity<1||st.mixQuantity>99)throw new Error('草稿选项');
 const ids=new Set();for(const line of st.lines){const c=line.config;
 if(!/^L[1-9]\d*$/.test(line.id)||ids.has(line.id)||!PRODUCTS.some(p=>p.pid===line.pid)||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99||!c||!Object.hasOwn(MOODS,c.moodKey)||!Object.hasOwn(SCENTS,c.family)||(c.familyPreference!==undefined&&!['auto','wood','fresh','floral','herbal'].includes(c.familyPreference))||!Object.hasOwn(PALETTES,c.palette)||!validNeeds(c.needs)||![6,8,10,12].includes(Number(c.diameter))||![.5,1,1.5].includes(Number(c.ease))||!['single','metal','none'].includes(c.accent))throw new Error('草稿行');
 calculateSize(c.wrist,c.diameter,c.ease,c.accent);ids.add(line.id);}
 const fields={...initialFields};for(const id of FIELD_IDS){const v=d.fields?.[id];if(v===undefined)continue;
 if(typeof v!=='string'||v.length>30000)throw new Error('草稿文本');const node=$(id);
 if(node.tagName==='SELECT'&&![...node.options].some(o=>o.value===v))throw new Error('草稿下拉');if(id==='wrist')numberInRange(v,12,23,'手围');fields[id]=v;}
 const next={...JSON.parse(JSON.stringify(st)),nextId:Math.max(1,...st.lines.map(l=>Number(l.id.slice(1))+1)),activeLineId:ids.has(st.activeLineId)?st.activeLineId:null,proposalEdited:typeof st.proposalEdited==='boolean'?st.proposalEdited:!!fields['proposal-text']};
 next.quantityInputs={};if(st.quantityInputs&&typeof st.quantityInputs==='object'){for(const [key,value] of Object.entries(st.quantityInputs)){if((key==='mix'||ids.has(key))&&typeof value==='string'&&value.length<=100&&parseQuantityValue(value)===null)next.quantityInputs[key]=value;}}
 if(next.style!==null&&!STYLES.some(s=>s.id===next.style))next.style=null;return {state:next,fields};
}
function applyDraft(d){state=d.state;for(const[id,v]of Object.entries(d.fields))$(id).value=v;$('plan-mode').value=state.mode;$('mix-quantity').value=String(state.mixQuantity);$('stale-actions').hidden=true;}
function restoreDraft(){try{
 const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||localStorage.getItem('xiangyu-owner-multi-proposal-v1')||'null');if(!d)return;if(![1,2].includes(d.version))throw new Error('草稿版本');
 const current=checkedDraft(d);const restored={separate:null,mix:null};
 for(const mode of ['separate','mix'])if(d.modeDrafts?.[mode]){try{restored[mode]=checkedDraft(d.modeDrafts[mode],mode);}catch{}}
 modeDrafts=restored;applyDraft(current);
 }catch{$('proposal-status').textContent='保存的草稿格式异常，已打开默认搭配。请重新选款。';}}
function switchPlanMode(mode){
 if(!['separate','mix'].includes(mode)||mode===state.mode)return;
 modeDrafts[state.mode]=snapshotDraft();
 const target=modeDrafts[mode]||{state:{moodKey:'settle',needs:[],style:null,family:'wood',recommended:false,productId:state.productId,activeLineId:null,lines:[],mode,mixQuantity:1,nextId:state.nextId,proposalDirty:false,proposalEdited:false},fields:{...initialFields}};
 applyDraft(checkedDraft(target,mode));update();renderProducts();
 $('proposal-status').textContent='已切换搭配方式，另一份草稿已单独保留。';
 toast(mode==='mix'?'已切换混合方案，分件草稿已保留。':'已切换分件方案，混合草稿已保留。');
}
async function copyWithFallback(text,target='plan',label='方案'){
 const ids={plan:['copy-fallback','copy-text','copy-label'],design:['design-copy-fallback','design-copy-text'],contact:['contact-copy-fallback','contact-copy-text','contact-copy-label']};
 const [boxId,fieldId,labelId]=ids[target]||ids.plan;
 try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(text);$(boxId).hidden=true;toast(label+'已复制，可粘贴发送。');return true;}
 catch{$(fieldId).value=text;if(labelId)$(labelId).textContent='长按全选并复制'+label;$(boxId).hidden=false;$(fieldId).focus({preventScroll:true});$(fieldId).select();toast('自动复制未成功，请长按全选复制'+label+'。');return false;}
}
async function savePhoto(){const p=selectedProduct();if(!p)return;try{const response=await fetch(p.img);if(!response.ok)throw new Error();const blob=await response.blob();const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='仙作汇_'+p.pid+'_原款照片.jpg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('photo-state').textContent='已发起保存。微信内若没有保存提示，可长按上方照片保存，或点击查看原图。';}catch{$('photo-state').textContent='自动保存未成功，可长按照片保存。';} }
let toastTimer;function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function download(){const blob=new Blob([specText()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='仙作汇_合香珠搭配单.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('搭配单已生成，请按浏览器提示保存。');}
function navigateStudio(target){const event=new CustomEvent('xiangyu:navigate',{detail:{target},cancelable:true});if(document.dispatchEvent(event)){const node=document.getElementById(target);node?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}}
function init(){initialFields=fieldsNow();restoreDraft();renderStyles();renderProducts();$('recommend').addEventListener('click',()=>{recommend();navigateStudio('matches');});document.querySelectorAll('[data-mood]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.mood;state.needs=state.needs.includes(key)?state.needs.filter(k=>k!==key):[...state.needs,key];recommend(state.needs.at(-1)||inferMood($('mood').value).key);}));
 ['wrist','diameter','ease','accent','palette','intensity','avoid','scent-detail','mood'].forEach(id=>$(id).addEventListener('input',update));$('scent-detail').addEventListener('change',renderProducts);$('avoid').addEventListener('change',renderProducts);$('family').addEventListener('change',()=>{state.family=$('family').value==='auto'?MOODS[state.moodKey].family:$('family').value;update();renderProducts();});
 $('download').addEventListener('click',download);$('copy').addEventListener('click',()=>copyWithFallback(specText(),'design','搭配单'));$('save-photo').addEventListener('click',savePhoto);$('copy-consultation')?.addEventListener('click',()=>copyWithFallback($('source-consultation-text').value,'contact','款式咨询单'));$('copy-wechat').addEventListener('click',()=>copyWithFallback('xiaogan8222','contact','微信号'));$('contact').addEventListener('click',async()=>{if(await copyWithFallback(specText(),'design','搭配单')){$('wechat-contact').hidden=false;navigateStudio('wechat-contact');}});$('length-note').addEventListener('input',update);
 $('product-category').addEventListener('change',()=>{renderProducts();persistDraft();});
 $('product-search').addEventListener('input',()=>{renderProducts();persistDraft();});
 $('add-current').addEventListener('click',()=>{if(state.activeLineId){update();toast('已保存这件搭配。');}else addProduct(state.productId);navigateStudio('purchase-plan');});$('add-another').addEventListener('click',()=>addProduct(state.productId,true));
 $('plan-mode').addEventListener('change',()=>switchPlanMode($('plan-mode').value));$('mix-quantity').dataset.quantityKey='mix';$('mix-quantity').addEventListener('input',()=>quantityInputChanged($('mix-quantity')));$('mix-quantity').addEventListener('change',()=>quantityInputChanged($('mix-quantity')));
 $('plan-note').addEventListener('input',()=>{markProposalDirty();persistDraft();});$('proposal-text').addEventListener('input',()=>{state.proposalDirty=false;state.proposalEdited=true;$('stale-actions').hidden=true;$('proposal-status').textContent='已保留你的手动编辑，复制或下载将使用当前文字。';persistDraft();});
 $('generate-plan').addEventListener('click',generateProposal);$('copy-plan').addEventListener('click',()=>{const text=proposalForExport();if(text)copyWithFallback(text);});$('download-plan').addEventListener('click',()=>{const text=proposalForExport();if(text)downloadText(text,'仙作汇_购买方案.txt');});$('contact-plan').addEventListener('click',async()=>{const text=proposalForExport();if(!text)return;if(await copyWithFallback(text)){$('wechat-contact').hidden=false;navigateStudio('wechat-contact');}});
 $('refresh-proposal').addEventListener('click',generateProposal);$('keep-proposal').addEventListener('click',()=>{state.proposalDirty=false;$('stale-actions').hidden=true;$('proposal-status').textContent='将使用你编辑的文字，请自行核对选款与数量。';persistDraft();});
 $('local-more')?.addEventListener('click',()=>{localLimit+=4;renderProducts();});$('more-matches').addEventListener('toggle',renderProducts);$('source-more').addEventListener('click',()=>{sourceLimit+=24;renderProducts();});
 $('real-photo').addEventListener('error',()=>{$('real-photo').hidden=true;$('photo-state').textContent='这张来源图片暂未显示，可查看原款详情或换一款。';});$('real-photo').addEventListener('load',()=>{$('real-photo').hidden=false;$('photo-state').textContent='';});
 document.addEventListener('xiangyu:request-state',announceDesign);document.addEventListener('xiangyu:select-product',event=>{const ref=event.detail||{};const product=PRODUCTS.find(p=>(ref.pid&&p.pid===ref.pid)||(Number.isInteger(ref.srcIdx)&&p.srcIdx===ref.srcIdx));if(product){addProduct(product.pid);navigateStudio('design-start');}});
 document.addEventListener('xiangyu:select-mood',event=>{const key=event.detail?.mood;if(Object.hasOwn(MOODS,key))document.querySelector('[data-mood="'+key+'"]').click();});
 const moodParams=new URLSearchParams(location.search);const incoming=moodParams.get('moods')||moodParams.get('mood');
 if(incoming){const picked=[...new Set(incoming.split(',').filter(key=>Object.hasOwn(MOODS,key)))];if(picked.length){state.activeLineId=null;state.needs=picked;state.style=null;$('family').value='auto';$('mood').value='';recommend(picked.at(-1));}moodParams.delete('moods');moodParams.delete('mood');history.replaceState(null,'',location.pathname+(moodParams.size?'?'+moodParams:'')+location.hash);}
 update();registerTools();}
function registerTools(){if(!document.modelContext?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const tools=[{name:'read_bead_design',title:'读取当前合香珠搭配',description:'读取可见的香气方向、珠径、手围、珠序与示例状态。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('参数必须为空对象');return currentConfig();}},
 {name:'configure_bead_design',title:'配置合香珠搭配',description:'按用户心情及手围配置页面示例方案，不产生订单或提交。',inputSchema:{type:'object',properties:{mood:{type:'string',maxLength:400},wristCm:{type:'number',minimum:12,maximum:23},diameterMm:{type:'integer',enum:[6,8,10,12]},aromaFamily:{type:'string',enum:['auto','wood','fresh','floral','herbal']}},required:['mood'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||typeof input.mood!=='string'||input.mood.length>400)throw new Error('心情描述无效');if(Object.keys(input).some(k=>!['mood','wristCm','diameterMm','aromaFamily'].includes(k)))throw new Error('未知参数');
 if(input.wristCm!==undefined)numberInRange(input.wristCm,12,23,'手围');if(input.diameterMm!==undefined&&![6,8,10,12].includes(input.diameterMm))throw new Error('珠径无效');if(input.aromaFamily!==undefined&&!['auto','wood','fresh','floral','herbal'].includes(input.aromaFamily))throw new Error('香气无效');
 $('mood').value=input.mood;if(input.aromaFamily!==undefined)$('family').value=input.aromaFamily;recommend();if(input.wristCm!==undefined)$('wrist').value=String(input.wristCm);if(input.diameterMm!==undefined)$('diameter').value=String(input.diameterMm);return update();}}];
 for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
if(typeof document!=='undefined')init();
if(typeof module!=='undefined')module.exports={parseQuantityValue,inferMood,inferNeeds,matchProducts,calculateSize,MOODS,SCENTS};
