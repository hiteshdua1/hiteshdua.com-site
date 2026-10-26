// hiteshdua.com, the little the pages need from script:
//   1. a Hairline figure (github.com/lucasmarkes/hairline) in every [data-figure] box. <div class="hd-fig"
//      data-figure="loupe" data-play aria-label="…"></div> mounts loupe(), playing on its own until the pointer arrives;
//      without data-play it rests until the pointer or focus reaches it. Figures follow the page's theme.
//   2. the light/dark switch: the new theme opens out of the switch in a circle, and the choice is remembered.
//   3. a soft light that follows the pointer across a card, and blocks that rise into view as you scroll.
import * as hairline from './hairline.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- figures ----------
for (const el of document.querySelectorAll('[data-figure]')) {
  const make = hairline[el.dataset.figure];
  if (typeof make !== 'function') continue;
  make(el, {
    theme: 'auto', // follows data-theme on <html>
    play: el.hasAttribute('data-play'),
    intensity: el.dataset.intensity ? Number(el.dataset.intensity) : undefined,
    label: el.getAttribute('aria-label') || undefined,
  });
}

// ---------- light and dark ----------
const KEY = 'hd-theme';
const toggle = document.querySelector('.hd-theme');
const themeColors = document.querySelectorAll('meta[name="theme-color"]');
const system = matchMedia('(prefers-color-scheme: dark)');
const saved = () => {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
};

function paint(theme) {
  const dark = theme === 'dark';
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  for (const meta of themeColors) meta.setAttribute('content', dark ? '#08090a' : '#ffffff');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.title = dark ? 'Switch to light' : 'Switch to dark';
  }
}

paint(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
// until the visitor picks one, the page keeps up with their system's setting
system.addEventListener?.('change', (e) => {
  if (!saved()) paint(e.matches ? 'dark' : 'light');
});

toggle?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  if (!document.startViewTransition || reduced.matches) {
    paint(next);
    return;
  }
  // the new theme grows out of the switch as a circle until it covers the screen
  const r = toggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const flip = document.startViewTransition(() => paint(next));
  flip.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
});

// ---------- a light that follows the pointer across a card ----------
const CARDS = '.hd-tilecard, .hd-stackitem, .hd-row, .hd-hi, .hd-pager a';
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let card = null;
  let frame = 0;
  let px = 0;
  let py = 0;
  const place = () => {
    frame = 0;
    if (!card) return;
    const b = card.getBoundingClientRect();
    card.style.setProperty('--hd-mx', `${px - b.left}px`);
    card.style.setProperty('--hd-my', `${py - b.top}px`);
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      card = e.target instanceof Element ? e.target.closest(CARDS) : null;
      px = e.clientX;
      py = e.clientY;
      if (card && !frame) frame = requestAnimationFrame(place);
    },
    { passive: true },
  );
}

// ---------- blocks rise into view ----------
const rising = document.querySelectorAll('.hd-reveal');
if (rising.length) {
  if (!('IntersectionObserver' in window)) {
    for (const el of rising) el.classList.add('is-in');
  } else {
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          seen.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.12 },
    );
    for (const el of rising) seen.observe(el);
  }
}
