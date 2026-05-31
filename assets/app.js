const state = {
  sites: [],
  query: '',
  tag: 'all',
  view: 'grid',
};

const els = {
  grid: document.getElementById('grid'),
  search: document.getElementById('search'),
  filter: document.getElementById('filter'),
  viewToggle: document.getElementById('view-toggle'),
};

async function load() {
  try {
    const res = await fetch('sites.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`sites.json: ${res.status}`);
    state.sites = await res.json();
  } catch (e) {
    console.error(e);
    state.sites = [];
  }
  populateTagFilter();
  render();
}

function populateTagFilter() {
  const tags = new Set();
  state.sites.forEach(s => (s.tags || []).forEach(t => tags.add(t)));
  const opts = ['<option value="all">All tags</option>']
    .concat([...tags].sort().map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`));
  els.filter.innerHTML = opts.join('');
}

function render() {
  const q = state.query.trim().toLowerCase();
  const filtered = state.sites.filter(s => {
    if (state.tag !== 'all' && !(s.tags || []).includes(state.tag)) return false;
    if (!q) return true;
    const hay = [s.title, s.description, ...(s.tags || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });

  els.grid.className = 'grid' + (state.view === 'list' ? ' list-view' : '');

  if (filtered.length === 0) {
    els.grid.innerHTML = `
      <div class="empty" style="grid-column: 1 / -1">
        <h2>${state.sites.length === 0 ? 'No assignments yet' : 'No matches'}</h2>
        <p>${state.sites.length === 0
          ? 'Add a folder containing index.html and push to GitHub — it will appear here.'
          : 'Try a different search or tag filter.'}</p>
      </div>`;
    return;
  }

  els.grid.innerHTML = filtered.map(cardHtml).join('');
}

function cardHtml(s) {
  const thumb = s.thumbnail
    ? `<img src="${escapeAttr(s.thumbnail)}" alt="" loading="lazy">`
    : `<img src="assets/default-thumb.svg" alt="" loading="lazy">`;
  const tags = (s.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const updated = s.updated ? formatDate(s.updated) : '';
  return `
    <a class="card" href="${escapeAttr(s.slug)}/index.html">
      <div class="thumb">${thumb}</div>
      <div class="body">
        <div class="title">${escapeHtml(s.title || s.slug)}</div>
        ${s.description ? `<div class="desc">${escapeHtml(s.description)}</div>` : ''}
        ${tags ? `<div class="tags">${tags}</div>` : ''}
        <div class="footer">
          <span class="updated">${updated}</span>
          <span class="open">Open →</span>
        </div>
      </div>
    </a>`;
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

let searchTimer;
els.search.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = e.target.value;
    render();
  }, 120);
});
els.filter.addEventListener('change', e => {
  state.tag = e.target.value;
  render();
});
els.viewToggle.addEventListener('click', () => {
  state.view = state.view === 'grid' ? 'list' : 'grid';
  els.viewToggle.setAttribute('aria-pressed', state.view === 'list');
  render();
});

load();
