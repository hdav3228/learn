/* Shared utilities for the prep site */

(function () {
  // ==========================================================================
  // Theme: respect system preference, allow manual override saved to localStorage
  // ==========================================================================
  const saved = localStorage.getItem('theme');
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (sysDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initial);

  window.toggleTheme = function () {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    // Notify pages so canvases can re-paint with the right colors
    document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  };

  // ==========================================================================
  // Progress tracking — per-page section completion via localStorage
  // ==========================================================================
  const PROGRESS_KEY = 'ioerger-progress-v1';
  const NAV_GROUPS = [
    {
      id: 'overview',
      label: 'Overview',
      href: 'index.html',
    },
    {
      id: 'papers',
      label: 'Papers',
      links: [
        { href: '01-dnds-bayesian.html', label: 'GenomegaMap', note: 'Wilson 2020' },
        { href: '02-tb-selection.html', label: 'TB selection scans', note: 'Ioerger/Shatby 2025' },
        { href: '07-shatby-diabetes-thesis.html', label: 'Diabetes thesis', note: 'Shatby 2026' },
        { href: '08-cole-h37rv-genome.html', label: 'H37Rv genome', note: 'Cole 1998' },
        { href: '09-ballell-tb-drugs.html', label: 'TB drug overview', note: 'Ballell 2005' },
        { href: '10-tandem-tb-diabetes.html', label: 'TANDEM cohort', note: 'Ugarte-Gil 2020' },
        { href: '11-mexico-mtb-genomics.html', label: 'Mexico genomics', note: 'Mejia-Ponce 2023' },
        { href: '12-bayesian-inference.html', label: 'Bayesian inference', note: 'Liu/Lawrence 1999' },
      ],
    },
    {
      id: 'meetings',
      label: 'Meetings',
      links: [
        { href: '06-monday-june-1-meeting.html', label: 'June 1 meeting', note: 'Project brief' },
        { href: '13-wednesday-june-3-meeting.html', label: 'June 3 meeting', note: 'XML + Slurm prep' },
        { href: '14-friday-june-5-meeting.html', label: 'June 5 meeting', note: 'Slurm + Faster run' },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      links: [
        { href: '02-tb-selection.html#workflow', label: 'TB scans', note: 'GenomegaMap workflow' },
        { href: '03-boltz2.html', label: 'Boltz-2', note: 'Structure + affinity' },
        { href: '04-keras-cheminformatics.html', label: 'Keras MPNN', note: 'Molecule graphs' },
        { href: '05-smiles-permeability.html', label: 'SMILES', note: 'Permeability screen' },
      ],
    },
  ];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function buildGroupedNav() {
    const nav = document.querySelector('.nav-links');
    if (!nav || nav.dataset.grouped === '1') return;
    nav.dataset.grouped = '1';
    nav.classList.add('nav-groups');
    nav.innerHTML = NAV_GROUPS.map(group => {
      if (group.href) {
        return [
          '<a class="nav-direct" href="', escapeHtml(group.href), '" data-nav-section="', escapeHtml(group.id), '">',
          '<span class="nav-item-title">', escapeHtml(group.label), '</span>',
          '</a>',
        ].join('');
      }
      const links = group.links.map(link => [
        '<a href="', escapeHtml(link.href), '" data-nav-section="', escapeHtml(group.id), '">',
        '<span class="nav-item-title">', escapeHtml(link.label), '</span>',
        '<span class="nav-item-note">', escapeHtml(link.note), '</span>',
        '</a>',
      ].join('')).join('');
      return [
        '<details class="nav-group" data-nav-group="', escapeHtml(group.id), '">',
        '<summary><span>', escapeHtml(group.label), '</span></summary>',
        '<div class="nav-menu">', links, '</div>',
        '</details>',
      ].join('');
    }).join('');

    nav.querySelectorAll('.nav-group').forEach(group => {
      group.addEventListener('toggle', () => {
        if (!group.open) return;
        nav.querySelectorAll('.nav-group[open]').forEach(other => {
          if (other !== group) other.open = false;
        });
      });
    });

    document.addEventListener('click', e => {
      if (e.target.closest('.nav-links')) return;
      nav.querySelectorAll('.nav-group[open]').forEach(group => { group.open = false; });
    });
  }

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); }
    catch (e) { /* ignore */ }
  }

  function isUserHidden(el) {
    return !!el.closest('[hidden], .user-hidden-tab');
  }

  function pageKey() {
    // Use the file name (e.g. "01-dnds-bayesian.html") as the page key.
    return location.pathname.split('/').pop() || 'index.html';
  }

  window.markSectionDone = function (sectionId, btn) {
    const progress = loadProgress();
    const pk = pageKey();
    progress[pk] = progress[pk] || {};
    const wasDone = !!progress[pk][sectionId];
    progress[pk][sectionId] = !wasDone;
    saveProgress(progress);
    refreshProgressUI();
  };

  function refreshProgressUI() {
    const progress = loadProgress();
    const pk = pageKey();
    const done = progress[pk] || {};

    // Update each visible section-complete button. User-hidden sections stay in
    // the HTML but should not affect the current learning progress count.
    const sectionButtons = Array.from(document.querySelectorAll('.section-complete'))
      .filter(btn => !isUserHidden(btn));
    sectionButtons.forEach(btn => {
      const sid = btn.dataset.section;
      const isDone = !!done[sid];
      btn.classList.toggle('done', isDone);
      btn.textContent = isDone ? 'Marked complete' : 'Mark complete';
    });

    // Update TOC dots
    document.querySelectorAll('aside.toc a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const sid = href.slice(1);
      a.classList.toggle('section-done', !!done[sid]);
    });

    // Update progress bar
    const bar = document.querySelector('.page-progress .bar');
    const lbl = document.querySelector('.page-progress .label');
    if (bar) {
      const total = sectionButtons.length;
      const completed = sectionButtons.filter(btn => btn.classList.contains('done')).length;
      const pct = total ? Math.round((completed / total) * 100) : 0;
      bar.style.width = pct + '%';
      if (lbl) lbl.textContent = completed + ' / ' + total + ' sections complete';
    }
  }

  // Initialise TOC dots — prepend a span to each TOC link before progress paint
  function paintTocDots() {
    document.querySelectorAll('aside.toc a').forEach(a => {
      if (!a.querySelector('.toc-dot')) {
        const d = document.createElement('span');
        d.className = 'toc-dot';
        a.prepend(d);
      }
    });
  }

  function enhanceActiveNav() {
    const file = pageKey();
    const hash = location.hash || '';
    const fallbackGroup = inferActiveGroup(file, hash);
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const parts = href.split('#');
      const target = parts[0] || 'index.html';
      const targetHash = parts[1] ? '#' + parts[1] : '';
      const sameFile = target === file;
      const active = sameFile && (!targetHash || targetHash === hash || (!hash && targetHash === '#start'));
      a.classList.toggle('active', active);
    });
    document.querySelectorAll('.nav-group').forEach(group => {
      const groupId = group.dataset.navGroup || '';
      const hasActiveLink = !!group.querySelector('a.active');
      group.classList.toggle('active', hasActiveLink || groupId === fallbackGroup);
    });
  }

  function inferActiveGroup(file, hash) {
    if (
      file === '06-monday-june-1-meeting.html' ||
      file === '13-wednesday-june-3-meeting.html' ||
      file === '14-friday-june-5-meeting.html'
    ) return 'meetings';
    if (file === '03-boltz2.html' || file === '04-keras-cheminformatics.html' || file === '05-smiles-permeability.html') return 'tools';
    if (file === '02-tb-selection.html' && hash === '#workflow') return 'tools';
    if (
      file === '01-dnds-bayesian.html' ||
      file === '02-tb-selection.html' ||
      file === '07-shatby-diabetes-thesis.html' ||
      file === '08-cole-h37rv-genome.html' ||
      file === '09-ballell-tb-drugs.html' ||
      file === '10-tandem-tb-diabetes.html' ||
      file === '11-mexico-mtb-genomics.html' ||
      file === '12-bayesian-inference.html'
    ) return 'papers';
    if (file === 'index.html') {
      if (hash === '#papers' || hash === '#meetings' || hash === '#tools' || hash === '#sources' || hash === '#site-map') return 'papers';
    }
    return 'overview';
  }

  function enhanceToc() {
    const toc = document.querySelector('aside.toc');
    if (!toc || toc.dataset.enhanced === '1') return;
    toc.dataset.enhanced = '1';

    const optionalItems = Array.from(toc.querySelectorAll('li.toc-optional'));
    if (!optionalItems.length) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toc-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Show optional sections';
    toc.querySelector('h4')?.after(toggle);

    const setOpen = open => {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Hide optional sections' : 'Show optional sections';
      optionalItems.forEach(li => { li.hidden = !open; });
      toc.classList.toggle('toc-expanded', open);
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    const activeOptional = optionalItems.some(li => li.querySelector('a.active'));
    setOpen(activeOptional);
  }

  function enhanceTables() {
    document.querySelectorAll('main.content table').forEach(table => {
      if (table.closest('.role-lens')) return;
      if (table.parentElement && table.parentElement.classList.contains('table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return Promise.resolve();
  }

  function enhanceCodeBlocks() {
    document.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.code-copy')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        copyText(code ? code.innerText : pre.innerText).then(() => {
          btn.textContent = 'Copied';
          window.setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
        });
      });
      pre.appendChild(btn);
    });
  }

  function installDetailSections() {
    document.querySelectorAll('section.detail-section').forEach(section => {
      if (section.dataset.detailEnhanced === '1') return;
      const h2 = section.querySelector(':scope > h2');
      if (!h2) return;

      const children = Array.from(section.children);
      let splitAt = children.indexOf(h2) + 1;
      while (
        children[splitAt] &&
        (children[splitAt].classList.contains('section-intro') ||
          children[splitAt].classList.contains('eli5'))
      ) {
        splitAt += 1;
      }

      const detailChildren = children.slice(splitAt);
      if (!detailChildren.length) return;

      const details = document.createElement('details');
      details.className = 'deep-dive auto-detail';
      const summary = document.createElement('summary');
      const summaryText = section.dataset.summary || 'Show optional details';
      const summaryTag = section.dataset.tag || 'Optional';
      summary.innerHTML = [
        '<span class="summary-main">', escapeHtml(summaryText), '</span>',
        '<span class="deep-tag">', escapeHtml(summaryTag), '</span>',
      ].join('');
      details.appendChild(summary);
      detailChildren.forEach(child => details.appendChild(child));
      section.appendChild(details);
      details.addEventListener('toggle', () => {
        section.classList.toggle('detail-open', details.open);
      });
      section.classList.add('detail-ready');
      section.dataset.detailEnhanced = '1';
    });
  }

  function openDetailsForHash(opts) {
    const options = opts || {};
    const rawId = (location.hash || '').slice(1);
    if (!rawId) return false;

    let id = rawId;
    try { id = decodeURIComponent(rawId); }
    catch (e) { /* keep the raw hash id */ }

    const target = document.getElementById(id);
    if (!target) return false;
    const details = target.closest('details.deep-dive');
    if (!details) return false;

    details.open = true;
    const section = details.closest('section.detail-section');
    if (section) section.classList.add('detail-open');
    if (options.scroll) {
      window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
    return true;
  }

  function getTabParts(tab) {
    const tabs = tab.closest('.tabs');
    if (!tabs) return null;
    const group = tabs.closest('.tab-group');
    let panels = [];
    if (group && group !== tabs) panels = Array.from(group.querySelectorAll('.tabpanel'));
    if (!panels.length) {
      let next = tabs.nextElementSibling;
      while (next && next.classList.contains('tabpanel')) {
        panels.push(next);
        next = next.nextElementSibling;
      }
    }
    return {
      tabs,
      buttons: Array.from(tabs.querySelectorAll('.tab')),
      panels,
    };
  }

  function activateTab(tab, index) {
    const parts = getTabParts(tab);
    if (!parts) return;
    parts.buttons.forEach((t, i) => {
      const active = i === index;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.setAttribute('tabindex', active ? '0' : '-1');
    });
    parts.panels.forEach((p, i) => {
      const active = i === index;
      p.classList.toggle('active', active);
      p.hidden = !active;
    });
  }

  function activateTabFromHash(opts) {
    const options = opts || {};
    const id = (location.hash || '').slice(1);
    if (!id) return false;
    const panel = document.getElementById(id);
    if (!panel || !panel.classList.contains('tabpanel')) return false;
    const group = panel.closest('.tab-group') || panel.parentElement;
    if (!group) return false;
    const tabs = group.querySelector('.tabs');
    if (!tabs) return false;
    const buttons = Array.from(tabs.querySelectorAll('.tab'));
    const panels = Array.from(group.querySelectorAll('.tabpanel'));
    const index = panels.indexOf(panel);
    if (index < 0 || !buttons[index]) return false;
    activateTab(buttons[index], index);
    if (options.scroll) {
      window.requestAnimationFrame(() => panel.scrollIntoView({ block: 'start' }));
    }
    return true;
  }

  function enhanceTabs() {
    document.querySelectorAll('.tabs').forEach((tabs, groupIndex) => {
      tabs.setAttribute('role', 'tablist');
      const buttons = Array.from(tabs.querySelectorAll('.tab'));
      const first = buttons[0];
      const parts = first ? getTabParts(first) : null;
      const panels = parts ? parts.panels : [];
      buttons.forEach((btn, i) => {
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        if (!btn.id) btn.id = `tabs-${groupIndex}-tab-${i}`;
        const panel = panels[i];
        if (panel) {
          if (!panel.id) panel.id = `tabs-${groupIndex}-panel-${i}`;
          btn.setAttribute('aria-controls', panel.id);
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', btn.id);
        }
      });
      const activeIdx = Math.max(0, buttons.findIndex(b => b.classList.contains('active')));
      if (buttons[activeIdx]) activateTab(buttons[activeIdx], activeIdx);
    });
    activateTabFromHash();
  }

  function updateScrollProgress() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    document.documentElement.style.setProperty('--read-progress', pct.toFixed(1) + '%');
  }

  function installSkipLink() {
    if (document.querySelector('.skip-link')) return;
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#';
    skip.textContent = 'Skip to content';
    document.body.prepend(skip);
    skip.addEventListener('click', e => {
      const target =
        document.querySelector('main.content .hero') ||
        document.querySelector('main.content > section[id]');
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (target.id) history.replaceState(null, '', '#' + target.id);
    });
  }

  function flashToolbarButton(btn, label, ms) {
    if (!btn) return;
    const wait = ms || 1400;
    const original = btn.dataset.defaultLabel || btn.textContent;
    btn.dataset.defaultLabel = original;
    btn.textContent = label;
    btn.classList.add('flash');
    window.setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('flash');
    }, wait);
  }

  function syncReadingModes(toolbar) {
    const root = document.documentElement;
    const focusOn = localStorage.getItem('focus-mode') === '1';
    if (!localStorage.getItem('reader-text-level') && localStorage.getItem('reader-text') === '1') {
      localStorage.setItem('reader-text-level', '1');
      localStorage.removeItem('reader-text');
    }
    const textLevel = localStorage.getItem('reader-text-level') || '0';
    root.classList.toggle('focus-mode', focusOn);
    root.classList.remove('reader-text', 'reader-text-lg');
    if (textLevel === '1') root.classList.add('reader-text');
    if (textLevel === '2') root.classList.add('reader-text-lg');
    if (!toolbar) return;
    const focusBtn = toolbar.querySelector('[data-action="focus"]');
    const textBtn = toolbar.querySelector('[data-action="text"]');
    if (focusBtn) {
      focusBtn.classList.toggle('active', focusOn);
      focusBtn.setAttribute('aria-pressed', focusOn ? 'true' : 'false');
    }
    if (textBtn) {
      const on = textLevel !== '0';
      textBtn.classList.toggle('active', on);
      textBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      textBtn.textContent = textLevel === '2' ? 'Largest text' : (textLevel === '1' ? 'Larger text' : 'Larger text');
      textBtn.dataset.defaultLabel = textBtn.textContent;
    }
  }

  function buildPageExportText() {
    const main = document.querySelector('main.content');
    if (!main) return document.body.innerText.trim();
    const title = document.title.replace(/\s*·.*$/, '').trim();
    const details = Array.from(main.querySelectorAll('details'));
    const detailStates = details.map(d => d.open);
    details.forEach(d => { d.open = true; });
    const clone = main.cloneNode(true);
    details.forEach((d, i) => { d.open = detailStates[i]; });
    clone.querySelectorAll('button, .page-progress, .section-complete, .learning-toolbar').forEach(n => n.remove());
    clone.querySelectorAll('details').forEach(d => { d.open = true; });
    const body = clone.innerText
      .replace(/[✓○]\s*(Marked complete|Mark complete)/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return [
      title,
      location.href,
      'Exported: ' + new Date().toLocaleString(),
      '',
      body,
    ].join('\n');
  }

  function downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function exportCurrentPageText(btn) {
    const text = buildPageExportText();
    const base = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'page';
    const filename = base + '.txt';
    try {
      await copyText(text);
      flashToolbarButton(btn, 'Copied');
      return;
    } catch (e) { /* clipboard blocked — fall back to download */ }
    downloadTextFile(text, filename);
    flashToolbarButton(btn, 'Downloaded');
  }

  function installLearningToolbar() {
    if (document.querySelector('.learning-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'learning-toolbar';
    toolbar.setAttribute('aria-label', 'Reading controls');
    toolbar.innerHTML = [
      '<button type="button" data-action="focus" aria-pressed="false">Focus</button>',
      '<button type="button" data-action="text" aria-pressed="false">Larger text</button>',
      '<button type="button" data-action="export" title="Copy this page as plain text (downloads if clipboard is blocked)">Copy page</button>',
      '<button type="button" data-action="top">Top</button>',
    ].join('');
    document.body.appendChild(toolbar);
    toolbar.querySelectorAll('button').forEach(btn => {
      btn.dataset.defaultLabel = btn.textContent;
    });
    syncReadingModes(toolbar);
  }

  // ==========================================================================
  // TOC active section highlighting via IntersectionObserver
  // ==========================================================================
  function normalizeLegacyHash() {
    const legacy = {
      'friday-checklist': 'slurm-prep',
      'biology-minimum': 'cs-map',
      'content-triage': 'site-map',
      'igor-points': 'ioerger-points',
    };
    const raw = (location.hash || '').slice(1);
    if (!raw || !legacy[raw]) return;
    history.replaceState(null, '', '#' + legacy[raw]);
  }

  document.addEventListener('DOMContentLoaded', function () {
    normalizeLegacyHash();
    installSkipLink();
    buildGroupedNav();
    enhanceActiveNav();
    enhanceToc();
    installDetailSections();
    enhanceTables();
    enhanceCodeBlocks();
    enhanceTabs();
    const activatedPanel = activateTabFromHash({ scroll: true });
    openDetailsForHash({ scroll: !activatedPanel });
    installLearningToolbar();
    updateScrollProgress();
    paintTocDots();
    refreshProgressUI();

    const links = document.querySelectorAll('aside.toc a');
    if (!links.length) return;
    const targets = [];
    links.forEach(a => {
      const id = a.getAttribute('href');
      if (id && id.startsWith('#')) {
        const t = document.querySelector(id);
        if (t) targets.push({ el: t, link: a });
      }
    });
    if (!targets.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          targets.forEach(t => t.link.classList.toggle('active', t.el === e.target));
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    targets.forEach(t => obs.observe(t.el));
  });

  // ==========================================================================
  // Tabs
  // ==========================================================================
  document.addEventListener('click', function (e) {
    const tab = e.target.closest('.tabs .tab');
    if (!tab) return;
    const parts = getTabParts(tab);
    if (!parts) return;
    const idx = parts.buttons.indexOf(tab);
    activateTab(tab, idx);
    const panel = parts.panels[idx];
    if (panel && panel.id) {
      history.replaceState(null, '', '#' + panel.id);
      enhanceActiveNav();
      refreshProgressUI();
    }
  });

  document.addEventListener('keydown', function (e) {
    const tab = e.target.closest && e.target.closest('.tabs .tab');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const parts = getTabParts(tab);
    if (!parts) return;
    const current = parts.buttons.indexOf(tab);
    let next = current;
    if (e.key === 'ArrowLeft') next = (current - 1 + parts.buttons.length) % parts.buttons.length;
    if (e.key === 'ArrowRight') next = (current + 1) % parts.buttons.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = parts.buttons.length - 1;
    e.preventDefault();
    parts.buttons[next].focus();
    activateTab(parts.buttons[next], next);
  });

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.learning-toolbar button');
    if (!btn) return;
    e.preventDefault();
    const toolbar = btn.closest('.learning-toolbar');
    const action = btn.dataset.action;
    if (action === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'focus') {
      const on = localStorage.getItem('focus-mode') !== '1';
      localStorage.setItem('focus-mode', on ? '1' : '0');
      syncReadingModes(toolbar);
      flashToolbarButton(btn, on ? 'Focus on' : 'Focus off', 900);
      return;
    }
    if (action === 'text') {
      const cur = localStorage.getItem('reader-text-level') || '0';
      const next = cur === '0' ? '1' : (cur === '1' ? '2' : '0');
      localStorage.setItem('reader-text-level', next);
      localStorage.removeItem('reader-text');
      syncReadingModes(toolbar);
      const msg = next === '0' ? 'Normal text' : (next === '1' ? 'Text +22%' : 'Text +48%');
      flashToolbarButton(btn, msg, 900);
      return;
    }
    if (action === 'export') {
      exportCurrentPageText(btn);
    }
  });

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('hashchange', function () {
    normalizeLegacyHash();
    const activatedPanel = activateTabFromHash({ scroll: true });
    openDetailsForHash({ scroll: !activatedPanel });
    enhanceActiveNav();
    refreshProgressUI();
  });

  // ==========================================================================
  // Mark-complete buttons (event delegation)
  // ==========================================================================
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.section-complete');
    if (!btn) return;
    const sid = btn.dataset.section;
    if (!sid) return;
    window.markSectionDone(sid, btn);
  });

  // ==========================================================================
  // Glossary terms — make .gloss elements keyboard-focusable
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.gloss').forEach(g => {
      if (!g.hasAttribute('tabindex')) g.setAttribute('tabindex', '0');
    });
  });
})();

// Helper used by canvas demos for theme-aware colors
function themeColor(name) {
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue('--' + name).trim();
}
