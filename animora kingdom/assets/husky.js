/* Keep the local Husky visible while its interactive model loads. */
(() => {
  'use strict';
  const host = document.querySelector('.husky-viewer');
  const frame = host?.querySelector('iframe[data-model]');
  if (!host || !frame) return;
  let ready = false;
  const showFailure = () => {
    if (ready) return;
    clearTimeout(loadingTimeout);
    host.setAttribute('aria-busy', 'false');
    host.dataset.viewerFailed = 'true';
  };
  const loadingTimeout = setTimeout(showFailure, 35000);
  const reveal = () => {
    ready = true;
    clearTimeout(loadingTimeout);
    host.setAttribute('aria-busy', 'false');
    host.dataset.viewerReady = 'true';
    requestAnimationFrame(() => {
      host.classList.add('is-ready');
      setTimeout(() => host.classList.add('is-live'), 250);
    });
  };
  const init = () => {
    if (typeof window.Sketchfab !== 'function') { showFailure(); return; }
    const client = new window.Sketchfab('1.12.1', frame);
    client.init(frame.dataset.model, {
      autostart: 1,
      preload: 1,
      camera: 0,
      transparent: 1,
      ui_stop: 0,
      ui_controls: 0,
      ui_infos: 0,
      ui_annotations: 0,
      ui_inspector: 0,
      ui_settings: 0,
      ui_help: 0,
      ui_vr: 0,
      ui_ar: 0,
      ui_theme: 'dark',
      success(api) {
        host._viewerApi = api;
        api.addEventListener('viewerready', () => {
          api.setBackground({ transparent: true }, (error) => {
            if (error) {
              host.dataset.transparent = 'false';
              showFailure();
            } else {
              host.dataset.transparent = 'true';
              reveal();
            }
          });
        });
        api.start();
      },
      error: showFailure
    });
  };
  const sdk = document.createElement('script');
  sdk.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
  sdk.async = true;
  sdk.onload = init;
  sdk.onerror = showFailure;
  document.head.append(sdk);
})();
