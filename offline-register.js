/* Silent offline support for the hosted site. Local exports need no worker. */
(() => {
  'use strict';
  if (!['http:', 'https:'].includes(location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  const source = document.currentScript?.src;
  if (!source) return;
  const worker = new URL('sw.js', source);
  if (worker.origin !== location.origin) return;
  const register = () => {
    navigator.serviceWorker.register(worker.href, {
      scope: new URL('./', worker).pathname,
      updateViaCache: 'none'
    }).catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
})();
