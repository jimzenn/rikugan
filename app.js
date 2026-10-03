'use strict';

// UI labels only. All trip content comes from trip.json.
const STATUS = {
  confirmed: ['已确认', '已订好或已说定'],
  planned: ['计划中', '打算这样走，还没订'],
  tbd: ['待定', '还没定或还没订，要有人跟进'],
};
const BOOKING_GROUPS = { flights: '机票', car: '车', lodging: '住宿' };
const SECTIONS = [
  ['people', '同行的人', renderPeople],
  ['bookings', '预订', renderBookings],
  ['places', '地点', renderPlaces],
  ['tips', '注意事项', renderTips],
  ['openQuestions', '待定事项', renderQuestions],
  ['packing', '行李清单', renderPacking],
  ['links', '常用链接', renderLinks],
];

let people = {};

// ---- helpers ----

const clean = kids => kids.flat(Infinity).filter(k => k != null && k !== false && k !== '');

// h('a', {href}, 'text', child, [children]). Strings become text nodes, never HTML.
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, v);
  el.append(...clean(kids));
  return el;
}
const fill = (id, ...kids) => document.getElementById(id).replaceChildren(...clean(kids));

const list = x => (x == null || x === '' ? [] : [].concat(x));
const isEmpty = x => !x || (typeof x === 'object' && !Object.keys(x).length);
const statusOf = s => (STATUS[s] ? s : 'tbd'); // missing or misspelled status shows as 待定, never silently fine
const nameOf = id => (id === 'all' ? '大家' : people[id]?.name || id);
const linksOf = o => [...list(o.link), ...list(o.links)];
const mapUrl = p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.mapQuery || p.name);
const extLink = (url, cls, ...kids) => h('a', { href: url, class: cls, target: '_blank', rel: 'noopener' }, ...kids);

// Parse "YYYY-MM-DD" as a local date so the weekday never shifts with the timezone.
function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const shortDate = iso => { const d = parseDate(iso); return `${d.getMonth() + 1}/${d.getDate()}`; };
const weekday = iso => '周' + '日一二三四五六'[parseDate(iso).getDay()];
const localISO = (d = new Date()) =>
  [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('-');

function dateRange(start, end) {
  if (!start || !end) return start || end;
  const a = parseDate(start), b = parseDate(end);
  const days = Math.round((b - a) / 864e5) + 1;
  const endYear = b.getFullYear() !== a.getFullYear() ? b.getFullYear() + '年' : '';
  return `${a.getFullYear()}年${a.getMonth() + 1}月${a.getDate()}日 – ${endYear}${b.getMonth() + 1}月${b.getDate()}日 · ${days} 天`;
}

// localStorage is shared by every GitHub Pages site of the same user, so namespace by path.
const storeKey = key => location.pathname.replace(/[^/]*$/, '') + ':' + key;
function load(key) {
  try { return JSON.parse(localStorage.getItem(storeKey(key))); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(storeKey(key), JSON.stringify(value)); } catch { /* private mode */ }
}

// ---- pieces ----

const badge = s => h('span', { class: 'badge ' + statusOf(s) }, STATUS[statusOf(s)][0]);
const notes = n => list(n).length > 0 && h('ul', { class: 'notes' }, list(n).map(t => h('li', {}, t)));

// Day items and booking entries share this shape.
function renderItem(it) {
  const s = statusOf(it.status);
  const who = list(it.who);
  const buttons = [
    ...list(it.place).map(p => extLink(mapUrl(p), 'btn place', p.name)),
    ...linksOf(it).map(l => extLink(l.url, 'btn ext', l.label)),
  ];
  return h('li', { class: 'row ' + s },
    h('div', { class: 'row-head' }, h('span', { class: 'time' }, it.time), badge(s)),
    h('h3', {}, it.title),
    who.length > 0 && h('div', { class: 'who' }, who.map(id => h('span', { class: 'pill' }, nameOf(id)))),
    notes(it.notes),
    buttons.length > 0 && h('div', { class: 'btns' }, buttons));
}

function renderHeader(trip, counts) {
  return [
    h('h1', {}, trip.title),
    trip.subtitle && h('p', { class: 'subtitle' }, trip.subtitle),
    h('p', { class: 'meta' }, dateRange(trip.startDate, trip.endDate)),
    trip.lastUpdated && h('p', { class: 'meta' }, '最后更新：' + trip.lastUpdated, h('span', { class: 'offline-tag' }, '离线')),
    h('div', { class: 'box legend' }, Object.keys(STATUS).map(s =>
      h('div', {}, badge(s), h('span', {}, STATUS[s][1]), h('span', { class: 'count' }, counts[s] + ' 项')))),
  ];
}

function renderChips(days, today, sections) {
  return [
    days.map(d => h('a', {
      href: '#day-' + d.date,
      class: 'chip' + (d.date === today ? ' today' : '') +
        (list(d.items).some(it => statusOf(it.status) === 'tbd') ? ' has-tbd' : ''),
    }, h('small', {}, weekday(d.date)), shortDate(d.date))),
    h('span', { class: 'chip-sep', 'aria-hidden': 'true' }),
    sections.map(([key, title]) => h('a', { href: '#' + key, class: 'chip sec' }, title)),
  ];
}

function renderDay(day, i, today) {
  const isToday = day.date === today;
  return h('section', { class: 'box day' + (isToday ? ' today' : ''), id: 'day-' + day.date },
    h('header', { class: 'day-head' },
      h('p', { class: 'day-date' }, `第 ${i + 1} 天 · ${shortDate(day.date)} ${weekday(day.date)}`,
        isToday && h('span', { class: 'today-tag' }, '今天')),
      h('h2', {}, day.title)),
    h('ol', { class: 'rows' }, list(day.items).map(it => renderItem(it))));
}

// ---- sections after the days ----

function renderPeople(ps) {
  return h('ul', { class: 'box rows' }, ps.map(p => h('li', { class: 'row' },
    h('h3', {}, p.name, p.from && h('span', { class: 'from' }, '来自 ' + p.from)),
    p.summary && h('p', {}, p.summary))));
}

function renderBookings(groups) {
  return Object.entries(groups).map(([key, items]) => [
    h('h3', { class: 'group' }, BOOKING_GROUPS[key] || key),
    h('ol', { class: 'box rows' }, list(items).map(it => renderItem(it))),
  ]);
}

function renderPlaces(places) {
  return h('ul', { class: 'box rows' }, places.map(p => {
    const links = linksOf(p);
    return h('li', { class: 'row' },
      h('h3', {}, extLink(mapUrl(p), 'place', p.name)),
      p.hours && h('p', { class: 'hours' }, '开放时间：' + p.hours),
      notes(p.notes),
      links.length > 0 && h('div', { class: 'btns' }, links.map(l => extLink(l.url, 'btn ext', l.label))));
  }));
}

function renderTips(tips) {
  return h('ul', { class: 'box rows' }, Object.entries(tips).map(([title, items]) =>
    h('li', { class: 'row' }, h('h3', {}, title), notes(items))));
}

function renderQuestions(qs) {
  return h('ul', { class: 'box rows' }, qs.map(q => {
    const meta = [q.owner && '负责：' + nameOf(q.owner), q.due && '截止：' + q.due].filter(Boolean).join(' · ');
    return h('li', { class: 'row tbd' }, h('h3', {}, q.text), meta && h('p', { class: 'meta' }, meta));
  }));
}

function renderPacking(items) {
  const packed = new Set(load('packed') || []);
  return [
    h('p', { class: 'hint' }, '勾选只保存在你自己的设备上。'),
    h('ul', { class: 'box rows packing' }, items.map(text => {
      const box = h('input', { type: 'checkbox' });
      box.checked = packed.has(text);
      box.onchange = () => {
        box.checked ? packed.add(text) : packed.delete(text);
        save('packed', [...packed]);
      };
      return h('li', { class: 'row' }, h('label', {}, box, h('span', {}, text)));
    })),
  ];
}

function renderLinks(links) {
  return h('ul', { class: 'box rows' }, links.map(l => h('li', { class: 'row' }, extLink(l.url, 'ext', l.label))));
}

// ---- page ----

function render(data) {
  const trip = data.trip || {};
  const days = list(data.days);
  const today = new URLSearchParams(location.search).get('today') || localISO();
  people = Object.fromEntries(list(data.people).map(p => [p.id, p]));

  const counts = { confirmed: 0, planned: 0, tbd: 0 };
  days.forEach(d => list(d.items).forEach(it => counts[statusOf(it.status)]++));
  const sections = SECTIONS.filter(([key]) => !isEmpty(data[key]));

  document.title = trip.title || '行程';
  fill('top', renderHeader(trip, counts));
  fill('chips', renderChips(days, today, sections));
  fill('main',
    days.map((d, i) => renderDay(d, i, today)),
    sections.map(([key, title, fn]) => h('section', { class: 'section', id: key }, h('h2', {}, title), fn(data[key]))));

  // Jump to the linked day/section, otherwise to today's card while the trip is on.
  const target = document.getElementById(location.hash.slice(1)) || document.getElementById('day-' + today);
  if (target) target.scrollIntoView();
  const chip = document.querySelector('.chip.today');
  if (chip) chip.parentNode.scrollLeft = chip.offsetLeft - 16; // horizontal only; keeps the page where it is
}

async function loadTrip() {
  try {
    const res = await fetch('trip.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return { data: await res.json() };
  } catch (err) {
    // Broken JSON or unreachable: fall back to the last good copy the service worker kept.
    const cached = 'caches' in window && (await caches.match('trip.json'));
    if (!cached) throw err;
    return { data: await cached.json(), warning: err };
  }
}

async function main() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  history.scrollRestoration = 'manual';
  const markOffline = () => document.body.classList.toggle('offline', !navigator.onLine);
  addEventListener('online', markOffline);
  addEventListener('offline', markOffline);
  markOffline();

  try {
    const { data, warning } = await loadTrip();
    render(data);
    if (warning) {
      document.getElementById('main').prepend(
        h('p', { class: 'notice' }, `trip.json 读取失败（${warning.message}），下面是上次保存的版本。`));
    }
  } catch (err) {
    fill('main', h('p', { class: 'notice' }, `行程加载失败：${err.message}`));
  }
}

main();
