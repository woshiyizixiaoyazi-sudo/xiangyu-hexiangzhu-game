/* v30 public presentation names only. Source records stay unchanged and searchable. */
(()=>{'use strict';
const verifiedNames=[{"pid":"P0","srcIdx":0,"name":"紫气东来1.5 手串"},{"pid":"S1","srcIdx":1,"name":"紫气东来爱心手链"},{"pid":"S2","srcIdx":2,"name":"荔枝手链 玫瑰香，紫气东来香"},{"pid":"P4","srcIdx":3,"name":"升级0.6 天木藏香项链"},{"pid":"S4","srcIdx":4,"name":"0.8蓝色妖姫双圈手链"},{"pid":"P7","srcIdx":5,"name":"0.6升级暖宫香项链"},{"pid":"P1","srcIdx":6,"name":"升级花蕊夫人0.8 双圈手串"},{"pid":"P2","srcIdx":7,"name":"升级 茉莉1.0 手串"},{"pid":"P3","srcIdx":9,"name":"升级鼻炎0.8 手串"},{"pid":"S10","srcIdx":10,"name":"紫气 屁桃爱心 手链"},{"pid":"S11","srcIdx":11,"name":"栀子花异形珠1.2 手链"},{"pid":"S12","srcIdx":12,"name":"紫气回纹珠1.2 手链"},{"pid":"S13","srcIdx":13,"name":"栀子花 屁桃爱心 手链"},{"pid":"S14","srcIdx":14,"name":"玫瑰香珠1.2 手链"},{"pid":"P5","srcIdx":15,"name":"蓝色妖姬0.6 项链"},{"pid":"S16","srcIdx":16,"name":"蓝色妖姬0.8 手链"},{"pid":"S17","srcIdx":17,"name":"蓝色妖姬0.8 锁骨链"},{"pid":"S18","srcIdx":18,"name":"芳华0.8 锁骨链"},{"pid":"S19","srcIdx":19,"name":"五行1.8+1.5 锁骨链"},{"pid":"S20","srcIdx":20,"name":"花蕊夫人0.8 手链"},{"pid":"S21","srcIdx":21,"name":"蓝色妖姬0.8 手链"},{"pid":"S22","srcIdx":22,"name":"芳华0.8 手链"},{"pid":"S23","srcIdx":23,"name":"蓝色妖姬0.8 手链"},{"pid":"P6","srcIdx":24,"name":"紫气东来0.8 项链"},{"pid":"P8","srcIdx":25,"name":"龙形无事牌"},{"pid":"S27","srcIdx":27,"name":"蓝色妖姬1.0手串"},{"pid":"S28","srcIdx":28,"name":"梦灵0.8双圈手串"},{"pid":"S29","srcIdx":29,"name":"天木藏香0.8 双圈手串"},{"pid":"S30","srcIdx":30,"name":"芳华0.8 双圈手串"},{"pid":"P9","srcIdx":33,"name":"鹅梨 如意牌"},{"pid":"P10","srcIdx":45,"name":"无事牌 铜镀金 药香"},{"pid":"P11","srcIdx":46,"name":"太岁牌 千怜香"}];
const byPid=new Map(verifiedNames.map(p=>[p.pid,p])),byIndex=new Map(verifiedNames.map(p=>[p.srcIdx,p]));
const categories=new Set(['手串','项链','香牌','工艺品','吊坠','耳环']);
function nameFor(product){
 const p=product||{},known=byPid.get(p.pid)||byIndex.get(p.srcIdx);
 if(known)return known.name;
 const category=categories.has(p.cat)?p.cat:'款式';
 return category+'参考款 · 来源 #'+(Number.isSafeInteger(p.srcIdx)&&p.srcIdx>=0?p.srcIdx:'待确认');
}
window.XYPublicProducts=Object.freeze({nameFor});
})();
