/* 香遇首页的合香工坊入口；不改动原有心情、商品和购买方案数据。 */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const frameUrl = window.XY_OFFLINE_GAME_URL || 'game/index.html';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function parentPaused() {
    return document.body.classList.contains('paused') || reducedMotion.matches || document.hidden;
  }
  function syncFrameMotion() {
    const frame = document.getElementById('xiangyu-game-frame');
    if (!frame) return;
    try {
      const child = frame.contentDocument;
      if (!child?.documentElement || !child.head) return;
      const root = child.documentElement;
      const paused = parentPaused();
      if (root.classList.contains('xyg-parent-paused') !== paused) root.classList.toggle('xyg-parent-paused', paused);
      if (!child.getElementById('xyg-parent-motion-style')) {
        const style = child.createElement('style');
        style.id = 'xyg-parent-motion-style';
        style.textContent = 'html.xyg-parent-paused,html.xyg-parent-paused *,html.xyg-parent-paused *::before,html.xyg-parent-paused *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
        child.head.append(style);
      }
    } catch { /* A document that is no longer same-origin is not modified. */ }
  }
  let pendingOpen = false;
  let modalSession = null;
  function applyModalViewport() {
    if (!modalSession) return;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    modalSession.frame.style.height = Math.max(160, Math.min(920, Math.floor(viewportHeight - 88))) + 'px';
  }
  function endFrameModal(restoreScroll = true) {
    const session = modalSession;
    if (!session) return;
    modalSession = null;
    window.removeEventListener('resize', applyModalViewport);
    window.visualViewport?.removeEventListener('resize', applyModalViewport);
    session.frame.style.height = session.latestHeight || session.previousHeight;
    if (restoreScroll && session.frame.isConnected) window.scrollTo({ top: session.scrollY, behavior: 'instant' });
  }
  function startFrameModal(frame) {
    if (modalSession?.frame === frame) { applyModalViewport(); return; }
    endFrameModal(false);
    modalSession = { frame, previousHeight: frame.style.height, latestHeight: '', scrollY: window.scrollY };
    window.addEventListener('resize', applyModalViewport);
    window.visualViewport?.addEventListener('resize', applyModalViewport);
    applyModalViewport();
    window.scrollTo({ top: Math.max(0, frame.getBoundingClientRect().top + window.scrollY - 12), behavior: 'instant' });
  }
  function trustedFrameMessage(event, frame) {
    if (!frame || event.source !== frame.contentWindow) return false;
    if (location.origin !== 'null') return event.origin === location.origin;
    if (event.origin !== 'null') return false;
    // Offline srcdoc inherits an opaque file origin. Check the known generated
    // document and live readable window, rather than accepting any null origin.
    try {
      if (!frame.contentDocument?.documentElement) return false;
      if (typeof window.XY_OFFLINE_GAME_HTML === 'string' && window.XY_OFFLINE_GAME_HTML.length > 0 && frame.srcdoc === window.XY_OFFLINE_GAME_HTML) return true;
      const source = new URL(frame.getAttribute('src') || '', location.href);
      return location.protocol === 'file:' && source.protocol === 'file:' && source.href === new URL('game/index.html', location.href).href;
    } catch { return false; }
  }
  function markup() {
    return `<section id="xiangyu-game-embed" aria-labelledby="xiangyu-game-title">
      <div class="xyg-intro"><p class="xyg-kicker">NEW / 合香工坊</p><span class="xyg-stamp" aria-hidden="true">随心<br>串串</span><h2 id="xiangyu-game-title">把今天，<br>亲手串起来。</h2><p class="xyg-description">选一份心情，挑喜欢的香珠。<br>一颗颗串成手串，收下你的专属香方卡。</p><div class="xyg-beads" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><span>一珠一香 / 随心搭配</span></div><p class="xyg-features">自由搭配 · 关卡挑战 · 香方留念</p></div>
      <div class="xyg-actions"><button type="button" class="xyg-open" aria-expanded="false" aria-controls="xiangyu-game-panel">打开合香工坊 <span aria-hidden="true">↗</span></button><a class="xyg-full" href="${frameUrl}" target="_blank" rel="noopener">全屏玩 <span aria-hidden="true">↗</span></a></div>
      <div id="xiangyu-game-panel" class="xyg-panel" hidden><div class="xyg-frame-host"></div><p class="xyg-frame-note">可在工坊内上下滑动。记录保存在当前浏览器；也可以全屏玩。</p></div>
    </section>`;
  }
  function setOpen(section, open, focus = false, restoreOuterScroll = true) {
    const button = section.querySelector('.xyg-open');
    const panel = section.querySelector('.xyg-panel');
    const host = section.querySelector('.xyg-frame-host');
    if (open && !host.querySelector('iframe')) {
      const frame = document.createElement('iframe');
      frame.id = 'xiangyu-game-frame';
      frame.title = '合香工坊：选心情、串手串、生成香方卡';
      if (window.XY_OFFLINE_GAME_HTML) frame.srcdoc = window.XY_OFFLINE_GAME_HTML;
      else frame.src = frameUrl;
      frame.allow = 'clipboard-write; web-share; fullscreen';
      frame.loading = 'lazy';
      frame.addEventListener('load', () => { section.dataset.loaded = 'true'; syncFrameMotion(); });
      host.append(frame);
      syncFrameMotion();
    }
    if (!open) {
      // Remove the child document to pause sound and animation; its own draft remains saved.
      endFrameModal(restoreOuterScroll);
      host.replaceChildren();
      delete section.dataset.loaded;
    }
    section.classList.toggle('xyg-is-open', open);
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.innerHTML = open ? '收起工坊 <span aria-hidden="true">−</span>' : '打开合香工坊 <span aria-hidden="true">↗</span>';
    if (focus && open) {
      requestAnimationFrame(() => section.scrollIntoView({ behavior: parentPaused() ? 'auto' : 'smooth', block: 'start' }));
    }
  }
  function mount() {
    if (modalSession && !modalSession.frame.isConnected) endFrameModal(false);
    if (app.hidden || app.dataset.route !== 'home') {
      const old = document.getElementById('xiangyu-game-embed');
      if (old && old.querySelector('iframe')) setOpen(old, false, false, false);
      return;
    }
    let section = document.getElementById('xiangyu-game-embed');
    if (!section) {
      const primary = app.querySelector('.hero > .actions');
      if (!primary) return;
      primary.insertAdjacentHTML('afterend', markup());
      section = document.getElementById('xiangyu-game-embed');
    }
    if (pendingOpen) { pendingOpen = false; setOpen(section, true, true); }
  }
  document.addEventListener('click', event => {
    const open = event.target.closest?.('#xiangyu-game-embed .xyg-open');
    if (open) {
      const section = open.closest('#xiangyu-game-embed');
      setOpen(section, open.getAttribute('aria-expanded') !== 'true', true);
      return;
    }
    if (event.target.closest?.('#xiangyu-game-nav')) {
      pendingOpen = true;
      queueMicrotask(mount); // Existing data-route handler renders the home first.
    }
  });
  window.addEventListener('message', event => {
    const frame = document.getElementById('xiangyu-game-frame');
    if (!trustedFrameMessage(event, frame)) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'xiangyu-craft-transfer') {
      document.dispatchEvent(new CustomEvent('xiangyu:craft-transfer', { detail: { payload: data, source: event.source, origin: event.origin } }));
      return;
    }
    if (data.type === 'xiangyu-game-modal') {
      if (typeof data.open !== 'boolean') return;
      if (data.open) startFrameModal(frame);
      else if (modalSession?.frame === frame) endFrameModal();
      return;
    }
    if (data.type === 'xiangyu-game-scroll') {
      if (typeof data.top !== 'number' || !Number.isFinite(data.top)) return;
      if (modalSession?.frame === frame) return;
      // The compact game scrolls its own document. Only bring its viewport into view.
      window.scrollTo({ top: Math.max(0, frame.getBoundingClientRect().top + window.scrollY - 20), behavior: parentPaused() ? 'instant' : 'smooth' });
      return;
    }
    if (data.type !== 'xiangyu-game-height' || typeof data.height !== 'number' || !Number.isFinite(data.height)) return;
    const nextHeight = Math.max(480, Math.min(780, Math.floor(window.innerHeight * .78), Math.ceil(data.height))) + 'px';
    if (modalSession?.frame === frame) modalSession.latestHeight = nextHeight;
    else frame.style.height = nextHeight;
  });
  new MutationObserver(syncFrameMotion).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncFrameMotion);
  else reducedMotion.addListener?.(syncFrameMotion);
  document.addEventListener('visibilitychange', syncFrameMotion);
  new MutationObserver(mount).observe(app, { childList: true, attributes: true, attributeFilter: ['data-route', 'hidden'] });
  mount();
})();
