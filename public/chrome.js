/*
 * Portfolio System chrome — shared across cv, cxo, sme, cnc, i2e, llm, mac.
 * Reads data-site on <html> to mark the current site in switcher + footer.
 */

const SITES = [
  { id: 'hub', num: '00', url: 'riera.co.uk',     href: 'https://riera.co.uk/',     title: 'Portfolio',           desc: 'The index. Commercial entry point and the map of everything.',       tag: 'index' },
  { id: 'cv',  num: '01', url: 'cv.riera.co.uk',  href: 'https://cv.riera.co.uk/',  title: 'Curriculum vitae',    desc: 'Platform engineering and infrastructure leadership profile.',        tag: 'career' },
  { id: 'cxo', num: '02', url: 'cxo.riera.co.uk', href: 'https://cxo.riera.co.uk/', title: 'CTO playbook',        desc: 'The strategy and operating-model lens. Shifts as scope widens.',      tag: 'strategy' },
  { id: 'sme', num: '03', url: 'sme.riera.co.uk', href: 'https://sme.riera.co.uk/', title: 'SME automation',      desc: 'The inspectable stack behind the paid Automation Audit.',             tag: 'practice' },
  { id: 'cnc', num: '04', url: 'cnc.riera.co.uk', href: 'https://cnc.riera.co.uk/', title: 'CNCraft',             desc: 'Prompt to CNC-ready output. SVG, DXF, plotter, G-code.',              tag: 'tool' },
  { id: 'i2e', num: '05', url: 'i2e.riera.co.uk', href: 'https://i2e.riera.co.uk/', title: 'Image to Excalidraw', desc: 'A diagram screenshot becomes an editable Excalidraw scene.',          tag: 'tool' },
  { id: 'llm', num: '06', url: 'llm.riera.co.uk', href: 'https://llm.riera.co.uk/', title: 'Personal LLM',        desc: 'Domain-specialised, local-first LLM scaffolding with strict scope.', tag: 'lab' },
  { id: 'mac', num: '07', url: 'mac.riera.co.uk', href: 'https://mac.riera.co.uk/', title: 'Mac rebuild',         desc: 'Opinionated MacBook Pro rebuild notes. Homebrew presets.',            tag: 'notes' },
];

const currentSite = document.documentElement.dataset.site || 'hub';

function buildFooter() {
  const root = document.getElementById('foot-grid');
  if (!root) return;
  root.innerHTML = SITES.map(s => `
    <a class="foot-link ${s.id === currentSite ? 'is-current' : ''}" href="${s.href}">
      <span class="u">${s.url}</span>
      <span class="d">${s.tag}</span>
    </a>
  `).join('');
}

function buildSwitcher() {
  const root = document.getElementById('switcher-list');
  if (!root) return;
  root.innerHTML = SITES.map(s => `
    <a class="switch-row ${s.id === currentSite ? 'is-current' : ''}" href="${s.href}">
      <span class="row-num">${s.num}</span>
      <div class="row-body">
        <div class="row-title">${s.title}</div>
        <div class="row-desc">${s.desc}</div>
      </div>
      <span class="row-url">${s.url}</span>
    </a>
  `).join('');
}

function openSwitcher() {
  const el = document.getElementById('switcher');
  if (!el) return;
  el.classList.add('open');
  buildSwitcher();
  const firstRow = el.querySelector('.switch-row');
  if (firstRow) firstRow.focus({ preventScroll: true });
}
function closeSwitcher() {
  const el = document.getElementById('switcher');
  if (el) el.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  buildFooter();

  const openBtn = document.getElementById('switcher-open');
  if (openBtn) openBtn.addEventListener('click', openSwitcher);
  const closeBtn = document.getElementById('switcher-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSwitcher);
  const switcherEl = document.getElementById('switcher');
  if (switcherEl) {
    switcherEl.addEventListener('click', (e) => {
      if (e.target.id === 'switcher') closeSwitcher();
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSwitcher();
    }
    if (e.key === 'Escape') closeSwitcher();
  });
});
