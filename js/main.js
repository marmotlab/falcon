/* Progressive enhancement: the paper and every experiment remain readable without JS. */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  const status = document.querySelector('#media-status');
  const announce = (message) => { if (status) status.textContent = message; };
  const pauseWithin = (element) => element.querySelectorAll('video').forEach(video => video.pause());

  // Compact navigation on small screens.
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const closeMenu = () => {
    navigation?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  };
  menuButton?.addEventListener('click', () => {
    const open = navigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  navigation?.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation?.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

  // Explicit playback keeps the initial visit quiet and avoids downloading video files.
  const overview = document.querySelector('#overview-video');
  const cover = document.querySelector('.video-cover');
  if (overview && cover) {
    cover.hidden = false;
    overview.controls = false;
    const playOverview = async () => {
      cover.disabled = true;
      try {
        await overview.play();
      } catch {
        overview.controls = true;
        cover.hidden = true;
        announce('The video could not start. Please use its playback controls to try again.');
      } finally {
        cover.disabled = false;
      }
    };
    overview.addEventListener('play', () => {
      cover.hidden = true;
      overview.controls = true;
      overview.parentElement.classList.add('is-playing');
    });
    cover.addEventListener('click', playOverview);
    document.querySelector('[data-watch-overview]')?.addEventListener('click', playOverview);
  }

  // WAI-ARIA tabs with automatic activation, arrow keys, and stable deep links.
  const tabs = [...document.querySelectorAll('.task-tab')];
  const panels = [...document.querySelectorAll('.task-panel')];
  const activateTask = (id, updateURL = false) => {
    if (!panels.some(panel => panel.id === id)) return;
    tabs.forEach(tab => {
      const selected = tab.dataset.task === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      const selected = panel.id === id;
      if (!selected) pauseWithin(panel);
      panel.hidden = !selected;
    });
    if (updateURL) history.replaceState(null, '', `#${id}`);
  };
  if (tabs.length) {
    const tablist = document.querySelector('.task-tabs');
    tablist.hidden = false;
    tablist.setAttribute('role', 'tablist');
    tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', tab.dataset.task);
      const panel = document.getElementById(tab.dataset.task);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      tab.addEventListener('click', () => activateTask(tab.dataset.task, true));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        tabs[next].focus();
        activateTask(tabs[next].dataset.task, true);
      });
    });
    activateTask('task1');
  }
  const followHash = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    // Keep the previous page's wheeled-platform anchor working.
    if (id === 'Cross-Embodiment Validation on a Wheeled Platform') id = 'Wheeled1';
    const target = document.getElementById(id);
    if (!target) return;
    const panel = target.closest('.task-panel');
    if (panel) activateTask(panel.id);
    let parent = target;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  };
  window.addEventListener('hashchange', followHash);
  if (location.hash) followHash();

  // Clean poster previews reveal native controls as soon as playback begins.
  document.querySelectorAll('.video-tile').forEach(tile => {
    const video = tile.querySelector('video');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-play';
    button.setAttribute('aria-label', `Play ${video.getAttribute('aria-label')}`);
    button.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>';
    video.controls = false;
    tile.append(button);
    video.addEventListener('play', () => {
      button.hidden = true;
      video.controls = true;
    });
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await video.play();
      } catch {
        button.hidden = true;
        video.controls = true;
        announce('The video could not start. Please use its playback controls to try again.');
      } finally {
        button.disabled = false;
      }
    });
  });

  // Start, pause, and seek the camera views together when requested.
  document.querySelectorAll('.video-group').forEach(group => {
    const videos = [...group.querySelectorAll('video')];
    const main = videos[0];
    const button = group.querySelector('.group-play');
    const label = button.querySelector('span');
    let grouped = false;
    let starting = false;
    button.hidden = false;
    const updateLabel = () => {
      const playing = videos.some(video => !video.paused && !video.ended);
      label.textContent = playing ? 'Pause all views' : 'Play all views';
      button.setAttribute('aria-label', label.textContent);
    };
    const stop = () => {
      grouped = false;
      pauseWithin(group);
      updateLabel();
    };
    const align = video => {
      if (video.readyState > 0 && Math.abs(video.currentTime - main.currentTime) > .35) {
        video.currentTime = Math.min(main.currentTime, Number.isFinite(video.duration) ? video.duration : main.currentTime);
      }
    };
    button.addEventListener('click', async () => {
      if (videos.some(video => !video.paused && !video.ended)) { stop(); return; }
      grouped = true;
      starting = true;
      button.disabled = true;
      if (main.ended) main.currentTime = 0;
      videos.slice(1).forEach(align);
      const results = await Promise.allSettled(videos.map(video => video.play()));
      starting = false;
      button.disabled = false;
      // A tab switch or a closed panel may have paused a pending play request.
      if (results.some(result => result.status === 'rejected') || !group.getClientRects().length || document.hidden) {
        stop();
        if (group.getClientRects().length) announce('Some camera views could not start. Try the individual video controls.');
      } else {
        videos.slice(1).forEach(align);
        updateLabel();
      }
    });
    main.addEventListener('seeking', () => { if (grouped) videos.slice(1).forEach(align); });
    main.addEventListener('pause', () => { if (grouped && !starting) stop(); });
    main.addEventListener('ended', stop);
    videos.forEach(video => {
      video.addEventListener('play', updateLabel);
      video.addEventListener('pause', updateLabel);
      video.addEventListener('ended', updateLabel);
    });
  });

  // Paused or hidden experiments never keep playing in the background.
  document.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => { if (!details.open) pauseWithin(details); });
  });
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          if (entry.target instanceof HTMLVideoElement) entry.target.pause();
          else pauseWithin(entry.target);
        }
      });
    }, { threshold: 0 });
    document.querySelectorAll('.video-group').forEach(group => videoObserver.observe(group));
    document.querySelectorAll('video').forEach(video => {
      if (!video.closest('.video-group')) videoObserver.observe(video);
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseWithin(document);
  });

  // Scroll-spy runs at most once per animation frame.
  const sectionLinks = [...document.querySelectorAll('a[data-section]')];
  const sections = sectionLinks.map(link => document.getElementById(link.dataset.section)).filter(Boolean);
  let scrollPending = false;
  const updateSection = () => {
    let current = '';
    sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) current = section.id; });
    sectionLinks.forEach(link => {
      const active = link.dataset.section === current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollPending = false;
  };
  if (sections.length) {
    window.addEventListener('scroll', () => {
      if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateSection); }
    }, { passive: true });
    updateSection();
  }

  const copyButton = document.querySelector('#copy-citation');
  copyButton?.removeAttribute('hidden');
  copyButton?.addEventListener('click', async () => {
    const code = document.querySelector('#citation-text');
    const feedback = document.querySelector('#citation-status');
    let copied = false;
    try {
      await navigator.clipboard.writeText(code.textContent.trim());
      copied = true;
    } catch {
      // Local files and older browsers may not provide the Clipboard API.
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      try { copied = document.execCommand('copy'); } catch { /* Leave text selected. */ }
      if (copied) selection.removeAllRanges();
    }
    feedback.textContent = copied ? 'Citation copied to clipboard.' : 'Citation selected. Press Ctrl+C (or ⌘C) to copy.';
    copyButton.querySelector('span').textContent = copied ? 'Copied!' : 'Copy BibTeX';
    setTimeout(() => { copyButton.querySelector('span').textContent = 'Copy BibTeX'; }, 2500);
  });
})();
