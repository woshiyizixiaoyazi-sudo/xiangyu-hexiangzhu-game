'use strict';
(() => {
  let installPrompt;
  const button = document.getElementById('install-app');
  const guide = document.getElementById('install-guide');
  if (button) button.addEventListener('click', async () => {
    if (!installPrompt) {
      guide.hidden = !guide.hidden;
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; } catch { guide.hidden = false; }
  });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (button) button.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    if (button) button.hidden = true;
    if (guide) guide.hidden = true;
  });
  if (window.matchMedia?.('(display-mode: standalone)').matches && button) button.hidden = true;
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
