/* Animora Kingdom — small, local enhancements. No framework or remote runtime. */
(() => {
  'use strict';

  const ready = (callback) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  };

  ready(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const menuToggle = document.querySelector('.menu-toggle');
    const topNav = document.querySelector('.top-nav');
    const closeMenu = () => {
      if (!menuToggle || !topNav) return;
      topNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    };

    if (menuToggle && topNav) {
      menuToggle.addEventListener('click', () => {
        const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', String(!expanded));
        topNav.classList.toggle('is-open', !expanded);
      });
      topNav.addEventListener('click', (event) => {
        if (event.target.closest('a')) closeMenu();
      });
      document.addEventListener('click', (event) => {
        if (!topNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && topNav.classList.contains('is-open')) {
          closeMenu();
          menuToggle.focus();
        }
      });
      window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
    }

    const hotbar = document.querySelector('.hotbar');
    const slots = Array.from(document.querySelectorAll('.hotbar-slot'));
    const sectionSlots = slots.map((slot) => {
      let link;
      try { link = new URL(slot.href, location.href); } catch { return null; }
      if (link.pathname !== location.pathname || !link.hash) return null;
      const section = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      return section ? { slot, section } : null;
    }).filter(Boolean);

    if (!sectionSlots.length) {
      const relatedSection = { mods: '#mods' }[document.body.dataset.page];
      const relatedPage = { install: 'install', fabric: 'install' }[document.body.dataset.page];
      slots.forEach((slot) => {
        if ((relatedSection && new URL(slot.href, location.href).hash === relatedSection)
          || (relatedPage && slot.dataset.hotbarPage === relatedPage)) {
          slot.classList.add('is-active');
          slot.setAttribute('aria-current', 'page');
        }
      });
    }

    let scrollQueued = false;
    let currentSection = null;
    const updateScroll = () => {
      scrollQueued = false;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (hotbar) hotbar.style.setProperty('--scroll-progress', String(total > 0 ? Math.min(1, Math.max(0, scrollTop / total)) : 0));
      if (!sectionSlots.length) return;
      const threshold = Math.min(window.innerHeight * 0.3, 200);
      let next = sectionSlots[0];
      for (const candidate of sectionSlots) {
        if (candidate.section.getBoundingClientRect().top <= threshold) next = candidate;
      }
      if (scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 5) next = sectionSlots[sectionSlots.length - 1];
      if (next === currentSection) return;
      currentSection = next;
      sectionSlots.forEach(({ slot }) => {
        const active = slot === next.slot;
        slot.classList.toggle('is-active', active);
        if (active) slot.setAttribute('aria-current', 'location');
        else slot.removeAttribute('aria-current');
      });
    };
    const queueScroll = () => {
      if (scrollQueued) return;
      scrollQueued = true;
      window.requestAnimationFrame(updateScroll);
    };
    window.addEventListener('scroll', queueScroll, { passive: true });
    window.addEventListener('resize', queueScroll, { passive: true });
    window.addEventListener('load', queueScroll, { once: true });
    updateScroll();

    document.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
      if (event.target.closest('input,textarea,select,[contenteditable="true"]') || document.querySelector('dialog[open]')) return;
      const index = Number(event.key) - 1;
      if (!/^[1-6]$/.test(event.key) || !slots[index]) return;
      event.preventDefault();
      slots[index].click();
    });

    const tutorialDialog = document.getElementById('tutorial-dialog');
    if (tutorialDialog) {
      const video = tutorialDialog.querySelector('video');
      const nativeDialog = typeof tutorialDialog.showModal === 'function';
      let trigger = null;
      let fallbackOverlay = null;
      let isOpen = false;

      const cleanMedia = () => {
        if (!video) return;
        video.pause();
        video.removeAttribute('src');
        video.querySelectorAll('source').forEach((source) => source.removeAttribute('src'));
        video.load();
      };

      const afterClose = () => {
        if (!isOpen) return;
        isOpen = false;
        document.body.classList.remove('modal-open');
        tutorialDialog.classList.remove('dialog-fallback');
        fallbackOverlay?.remove();
        fallbackOverlay = null;
        cleanMedia();
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      };

      const closeTutorial = () => {
        if (!isOpen) return;
        if (nativeDialog) tutorialDialog.close();
        else tutorialDialog.removeAttribute('open');
        afterClose();
      };

      document.querySelectorAll('[data-open-tutorial]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          if (isOpen) return;
          trigger = button;
          isOpen = true;
          if (video) {
            if (video.dataset.src) video.src = video.dataset.src;
            video.querySelectorAll('source[data-src]').forEach((source) => { source.src = source.dataset.src; });
            video.load();
          }
          document.body.classList.add('modal-open');
          if (nativeDialog) tutorialDialog.showModal();
          else {
            fallbackOverlay = document.createElement('div');
            fallbackOverlay.className = 'dialog-fallback-overlay';
            fallbackOverlay.setAttribute('aria-hidden', 'true');
            fallbackOverlay.addEventListener('click', closeTutorial);
            document.body.append(fallbackOverlay);
            tutorialDialog.classList.add('dialog-fallback');
            tutorialDialog.setAttribute('open', '');
            tutorialDialog.setAttribute('role', 'dialog');
            tutorialDialog.setAttribute('aria-modal', 'true');
          }
          tutorialDialog.querySelector('[data-close-tutorial]')?.focus({ preventScroll: true });
        });
      });
      tutorialDialog.querySelectorAll('[data-close-tutorial]').forEach((button) => button.addEventListener('click', closeTutorial));
      tutorialDialog.addEventListener('close', afterClose);
      tutorialDialog.addEventListener('click', (event) => {
        if (event.target !== tutorialDialog) return;
        const rect = tutorialDialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeTutorial();
      });
      document.addEventListener('keydown', (event) => {
        if (!isOpen) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          closeTutorial();
        }
        if (event.key === 'Tab' && !nativeDialog) {
          const focusable = Array.from(tutorialDialog.querySelectorAll('button,a[href],input,select,textarea,video[controls],[tabindex]:not([tabindex="-1"])')).filter((element) => !element.disabled && element.getClientRects().length);
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      });
    }

    const search = document.getElementById('mod-search');
    const cards = Array.from(document.querySelectorAll('.mod-card, [data-mod-card]'));
    const filters = Array.from(document.querySelectorAll('.filter-button[data-filter], [data-original-filter]'));
    const count = document.getElementById('mods-count');
    const empty = document.getElementById('mods-empty');
    const normalize = (value) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let category = filters.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all';
    const indexedCards = cards.map((card) => ({ card, text: normalize(card.textContent || ''), categories: (card.dataset.category || '').split(/[\s,]+/) }));
    const filterMods = () => {
      const words = normalize(search?.value.trim() || '').split(/\s+/).filter(Boolean);
      let visible = 0;
      indexedCards.forEach(({ card, text, categories }) => {
        const show = (category === 'all' || categories.includes(category)) && words.every((word) => text.includes(word));
        card.hidden = !show;
        if (show) visible += 1;
      });
      filters.forEach((button) => {
        const active = button.dataset.filter === category;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (count) count.textContent = `${visible} ${visible === 1 ? 'mod encontrado' : 'mods encontrados'}`;
      if (empty) empty.hidden = visible !== 0;
    };
    if (cards.length) {
      search?.addEventListener('input', filterMods);
      filters.forEach((button) => button.addEventListener('click', () => { category = button.dataset.filter || 'all'; filterMods(); }));
      filterMods();
    }

    const status = document.getElementById('copy-status');
    document.querySelectorAll('[data-copy]').forEach((button) => {
      let resetTimer;
      const original = button.innerHTML;
      const setCopyLabel = (label) => {
        const caption = button.querySelector('[data-copy-label]') || button.querySelector('span');
        if (caption) caption.textContent = label;
        else button.textContent = label;
      };
      button.addEventListener('click', async () => {
        const value = button.dataset.copy;
        if (!value) return;
        clearTimeout(resetTimer);
        try {
          if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
          else {
            const text = document.createElement('textarea');
            text.value = value;
            text.setAttribute('readonly', '');
            Object.assign(text.style, { position: 'fixed', top: '0', left: '-10000px' });
            document.body.append(text);
            try {
              text.select();
              if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
            } finally { text.remove(); button.focus({ preventScroll: true }); }
          }
          setCopyLabel('Copiado!');
          if (status) status.textContent = 'Caminho copiado. Cole na barra de endereços do Explorador de Arquivos.';
        } catch {
          if (status) status.textContent = `Selecione e copie este caminho: ${value}`;
          setCopyLabel('Copiar');
        }
        resetTimer = setTimeout(() => { button.innerHTML = original; }, 2500);
      });
    });

    if ('IntersectionObserver' in window && !reducedMotion.matches) {
      const revealElements = document.querySelectorAll('[data-reveal]');
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
      revealElements.forEach((element) => revealObserver.observe(element));
      document.documentElement.classList.add('js-reveal');
      reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) {
          document.documentElement.classList.remove('js-reveal');
          revealObserver.disconnect();
        }
      });
    }
  });
})();
