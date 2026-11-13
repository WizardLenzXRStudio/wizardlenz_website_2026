/* Gallery admin: sign in, add albums, edit or delete existing ones. Photos live in Google Drive. */
import { API, fetchAlbums, adminCall, resizePair, clearAlbumCache } from './gallery-data.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SESSION = 'wlz-admin-pw';
const MAX_PHOTOS = 40;
const TYPES = ['Workshop', 'Bootcamp', 'Semester course', 'Faculty program', 'In-plant training', 'Event'];
let pw = '';
try { pw = sessionStorage.getItem(SESSION) || ''; } catch (e) {}
const netMsg = m => (m === 'Failed to fetch' ? 'The connection to Google Drive dropped. Please try again.' : m);
const monthLabel = d => new Date(d + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
async function retry(fn, tries = 3) { let last; for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { last = e; await new Promise(r => setTimeout(r, 700 * (i + 1))); } } throw last; }

/* ---------- a reorderable photo grid (used by "new album" and "edit album") ----------
   items: array of { url, ... } owned by the caller. Photo 1 is the cover. */
function photoGrid(el, items, noteEl, onChange) {
  let dragI = null;
  const draw = () => {
    if (noteEl) noteEl.hidden = items.length < 2;
    el.innerHTML = items.map((p, i) => `<div class="thumb" draggable="true" data-i="${i}"><img src="${p.url}" alt="Photo ${i + 1}" draggable="false"><span class="n">${i === 0 ? '1 · Cover' : i + 1}</span><div class="mv"><button type="button" data-mv="-1" aria-label="Move photo ${i + 1} earlier"${i === 0 ? ' disabled' : ''}>←</button><button type="button" data-mv="1" aria-label="Move photo ${i + 1} later"${i === items.length - 1 ? ' disabled' : ''}>→</button><button type="button" data-mv="x" aria-label="Remove photo ${i + 1}">×</button></div></div>`).join('');
    onChange && onChange();
  };
  const move = (from, to) => { if (to < 0 || to >= items.length || from === to) return; const [p] = items.splice(from, 1); items.splice(to, 0, p); draw(); };
  el.addEventListener('click', e => { const b = e.target.closest('[data-mv]'); if (!b) return; const i = +b.closest('.thumb').dataset.i; if (b.dataset.mv === 'x') { const [p] = items.splice(i, 1); if (p.file) URL.revokeObjectURL(p.url); draw(); } else move(i, i + +b.dataset.mv); });
  el.addEventListener('dragstart', e => { const t = e.target.closest('.thumb'); if (!t) return; dragI = +t.dataset.i; t.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  el.addEventListener('dragover', e => { const t = e.target.closest('.thumb'); if (dragI === null || !t) return; e.preventDefault(); el.querySelectorAll('.thumb').forEach(x => x.classList.toggle('over', x === t)); });
  el.addEventListener('drop', e => { const t = e.target.closest('.thumb'); if (dragI === null || !t) return; e.preventDefault(); e.stopPropagation(); const from = dragI; dragI = null; move(from, +t.dataset.i); });
  el.addEventListener('dragend', () => { dragI = null; el.querySelectorAll('.thumb').forEach(x => x.classList.remove('drag', 'over')); });
  const addFiles = files => { [...files].filter(f => f.type.startsWith('image/')).slice(0, Math.max(0, MAX_PHOTOS - items.length)).forEach(f => items.push({ file: f, url: URL.createObjectURL(f) })); draw(); };
  return { draw, addFiles };
}
function wireDrop(dropEl, inputEl, addFiles) {
  inputEl.addEventListener('change', () => { addFiles(inputEl.files); inputEl.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => dropEl.addEventListener(ev, e => { e.preventDefault(); dropEl.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dropEl.addEventListener(ev, e => { e.preventDefault(); dropEl.classList.remove('over'); }));
  dropEl.addEventListener('drop', e => addFiles(e.dataTransfer.files));
}

/* ---------- sign in ---------- */
const login = $('#adLogin'), app = $('#adApp'), setup = $('#adSetup');
function showApp(v) { if (API && !(v && v.version >= 2)) { setup.hidden = false; setup.innerHTML = 'Your Google script is an older version, so photos may not show on the site and Edit will not work. Paste the newest <code>google-apps-script/Code.gs</code> into your script, then <b>Deploy &gt; Manage deployments &gt; pencil &gt; Version: New version &gt; Deploy</b>.'; } login.hidden = true; app.hidden = false; $('#adOut').hidden = !API; if (API) loadList(); else $('#adList').innerHTML = '<p class="thumbs-note">Connect Google Drive to see and manage your albums here.</p>'; }
if (!API) { setup.hidden = false; showApp({ version: 2 }); }
else if (pw) { adminCall(pw, 'verify').then(r => showApp(r)).catch(() => { pw = ''; try { sessionStorage.removeItem(SESSION); } catch (e) {} login.hidden = false; }); }
else login.hidden = false;
login.addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('#adLoginErr'); err.hidden = true;
  const v = $('#adPw').value;
  if (!v) { err.textContent = 'Enter the admin password.'; err.hidden = false; return; }
  try { var vr = await adminCall(v, 'verify'); pw = v; try { sessionStorage.setItem(SESSION, v); } catch (x) {} $('#adPw').value = ''; showApp(vr); }
  catch (x) { err.textContent = x.message === 'Failed to fetch' ? 'Could not reach Google Drive. Check your connection and the web app address.' : x.message; err.hidden = false; }
});
$('#adOut').addEventListener('click', () => { pw = ''; try { sessionStorage.removeItem(SESSION); } catch (e) {} app.hidden = true; login.hidden = false; });

/* ---------- new album ---------- */
const newItems = [];
const errEl = $('#adErr'), okEl = $('#adOk'), prog = $('#adProg'), bar = prog.querySelector('i');
const newGrid = photoGrid($('#adThumbs'), newItems, $('#adNote'), () => { errEl.hidden = true; });
wireDrop($('#adDrop'), $('#adFiles'), newGrid.addFiles);
$('#adForm').addEventListener('reset', () => { newItems.forEach(p => URL.revokeObjectURL(p.url)); newItems.length = 0; newGrid.draw(); errEl.hidden = true; okEl.hidden = true; prog.hidden = true; });

$('#adForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#adName').value.trim(), inst = $('#adInst').value.trim(), d = $('#adDate').value, type = $('#adType').value;
  const miss = [!name && 'a program name', !inst && 'the institution', !newItems.length && 'at least one photo'].filter(Boolean);
  okEl.hidden = true;
  if (miss.length) { errEl.textContent = 'Add ' + miss.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' before publishing.'; errEl.hidden = false; return; }
  if (!API) { errEl.textContent = 'Google Drive is not connected yet, so nothing can be published. See docs/gallery-setup.md.'; errEl.hidden = false; return; }
  errEl.hidden = true;
  const date = d || new Date().toISOString().slice(0, 7), when = monthLabel(date);
  const go = $('#adGo'); go.disabled = true; prog.hidden = false; bar.style.width = '2%';
  const total = newItems.length; let done = 0;
  try {
    const { id } = await retry(() => adminCall(pw, 'createAlbum', { meta: { title: name, inst, type, when, date } }));
    for (let i = 0; i < total; i++) {
      okEl.textContent = `Uploading photo ${i + 1} of ${total}...`; okEl.hidden = false;
      const pair = await resizePair(newItems[i].file);
      await retry(() => adminCall(pw, 'addPhoto', { albumId: id, name: String(i + 1).padStart(3, '0'), ...pair }));
      done++; bar.style.width = Math.max(4, Math.round(done / total * 100)) + '%';
    }
    clearAlbumCache();
    okEl.innerHTML = `Published "${esc(name)}" with ${total} ${total === 1 ? 'photo' : 'photos'}. <a href="/gallery/#album-${encodeURIComponent(id)}" style="color:var(--cyan)">View it in the gallery</a>`;
    newItems.forEach(p => URL.revokeObjectURL(p.url)); newItems.length = 0; newGrid.draw(); $('#adName').value = ''; $('#adInst').value = '';
    loadList();
  } catch (x) {
    errEl.textContent = netMsg(x.message) + (done ? ` ${done} of ${total} photos were saved; the album may be incomplete, so check the list below.` : '');
    errEl.hidden = false; okEl.hidden = true; loadList();
  } finally { go.disabled = false; setTimeout(() => { prog.hidden = true; bar.style.width = '0'; }, 1200); }
});

/* ---------- existing albums: list, edit, delete ---------- */
const list = $('#adList');
let albumsCache = [];
async function loadList() {
  list.innerHTML = '<p class="thumbs-note">Loading albums...</p>';
  try {
    albumsCache = await fetchAlbums();
    if (!albumsCache.length) { list.innerHTML = '<p class="thumbs-note">No albums yet. The first one you publish will appear here.</p>'; return; }
    list.innerHTML = albumsCache.map(a => `<div class="arow" data-id="${esc(a.id)}">${a.thumbs[0] ? `<img src="${a.thumbs[0]}" alt="" loading="lazy">` : '<div class="ph">No photo</div>'}<div><b>${esc(a.title)}</b><span>${esc(a.inst)} · ${esc(a.type)} · ${esc(a.when)} · ${a.photos.length} ${a.photos.length === 1 ? 'photo' : 'photos'}</span></div><div class="acts"><a class="btn btn-ghost btn-sm" href="/gallery/#album-${encodeURIComponent(a.id)}">View</a><button type="button" class="btn btn-ghost btn-sm" data-edit>Edit</button><button type="button" class="btn btn-danger btn-sm" data-del>Delete</button></div></div>`).join('');
  } catch (x) { list.innerHTML = `<p class="err" style="color:#FCA5A5">Could not load the albums: ${esc(x.message)}</p>`; }
}

function openEditor(row) {
  const a = albumsCache.find(x => x.id === row.dataset.id); if (!a) return;
  if ($('.aedit', row)) { $('.aedit', row).remove(); return; }
  document.querySelectorAll('.aedit').forEach(x => x.remove());
  const items = a.items.map((it, i) => ({ id: it.id, thumbId: it.thumbId, url: a.thumbs[i] }));
  const startIds = items.map(i => i.id);
  const ed = document.createElement('div'); ed.className = 'aedit';
  ed.innerHTML = `
    <div class="aedit-grid">
      <div class="field full"><label>Program name</label><input data-f="title" type="text" value="${esc(a.title)}"></div>
      <div class="field"><label>Institution</label><input data-f="inst" type="text" value="${esc(a.inst)}"></div>
      <div class="field"><label>Date</label><input data-f="date" type="month" value="${esc(a.date)}"></div>
      <div class="field full"><label>Program type</label><select data-f="type">${TYPES.map(t => `<option${t === a.type ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
      <label class="drop" data-drop><b>Add more photos</b><span>Drop photos here or tap to choose.</span><input data-files type="file" accept="image/*" multiple class="sr-only"></label>
      <p class="thumbs-note" data-note hidden>Drag a photo, or use the arrows, to change the order. Photo 1 is the cover. × removes it from the album.</p>
      <div class="thumbs" data-thumbs></div>
      <p class="err" data-err role="alert" hidden></p>
      <p class="ok" data-ok role="status" hidden></p>
      <div class="prog" data-prog hidden><i></i></div>
      <div class="field full" style="flex-direction:row;flex-wrap:wrap;gap:10px"><button type="button" class="btn btn-primary" data-save>Save changes</button><button type="button" class="btn btn-ghost" data-cancel>Cancel</button></div>
    </div>`;
  row.appendChild(ed);
  const g = photoGrid($('[data-thumbs]', ed), items, $('[data-note]', ed));
  g.draw(); wireDrop($('[data-drop]', ed), $('[data-files]', ed), g.addFiles);
  const err = $('[data-err]', ed), ok = $('[data-ok]', ed), pr = $('[data-prog]', ed), pb = $('i', pr);
  $('[data-cancel]', ed).addEventListener('click', () => { items.forEach(p => p.file && URL.revokeObjectURL(p.url)); ed.remove(); });
  $('[data-save]', ed).addEventListener('click', async () => {
    const f = k => $(`[data-f="${k}"]`, ed).value.trim();
    const title = f('title'), inst = f('inst'), date = f('date') || a.date || new Date().toISOString().slice(0, 7), type = f('type');
    err.hidden = true; ok.hidden = true;
    if (!title || !inst) { err.textContent = 'Program name and institution cannot be empty.'; err.hidden = false; return; }
    if (!items.length) { err.textContent = 'An album needs at least one photo. To remove the whole album, use Delete.'; err.hidden = false; return; }
    const saveBtn = $('[data-save]', ed); saveBtn.disabled = true; pr.hidden = false; pb.style.width = '3%';
    const fresh = items.filter(p => p.file), removed = a.items.filter(it => !items.some(p => p.id === it.id));
    const steps = 2 + fresh.length + removed.length; let n = 0; const tick = () => { n++; pb.style.width = Math.round(n / steps * 100) + '%'; };
    try {
      ok.textContent = 'Saving details...'; ok.hidden = false;
      await retry(() => adminCall(pw, 'updateAlbum', { albumId: a.id, meta: { title, inst, type, date, when: monthLabel(date) } })); tick();
      for (let i = 0; i < fresh.length; i++) {
        ok.textContent = `Uploading new photo ${i + 1} of ${fresh.length}...`;
        const pair = await resizePair(fresh[i].file);
        const r = await retry(() => adminCall(pw, 'addPhoto', { albumId: a.id, name: 'n' + Date.now() + '_' + i, ...pair }));
        fresh[i].id = r.id; fresh[i].thumbId = r.thumbId; tick();
      }
      for (const it of removed) { ok.textContent = 'Removing photos...'; await retry(() => adminCall(pw, 'deletePhoto', { albumId: a.id, photoId: it.id, thumbId: it.thumbId })); tick(); }
      ok.textContent = 'Saving the order...';
      await retry(() => adminCall(pw, 'reorder', { albumId: a.id, order: items.map(p => ({ id: p.id, thumbId: p.thumbId || '' })) })); tick();
      clearAlbumCache(); items.forEach(p => p.file && URL.revokeObjectURL(p.url));
      await loadList();
      const again = list.querySelector(`.arow[data-id="${CSS.escape(a.id)}"]`); if (again) { const msg = document.createElement('p'); msg.className = 'ok'; msg.style.cssText = 'grid-column:1/-1;margin:0;color:var(--cyan);font-size:14px'; msg.textContent = 'Saved.'; again.appendChild(msg); setTimeout(() => msg.remove(), 4000); }
    } catch (x) { err.textContent = netMsg(x.message) + ' Some changes may already be saved; reopen Edit to check.'; err.hidden = false; ok.hidden = true; saveBtn.disabled = false; }
  });
}

list.addEventListener('click', async e => {
  const ebtn = e.target.closest('[data-edit]'); if (ebtn) { openEditor(ebtn.closest('.arow')); return; }
  const b = e.target.closest('[data-del]'); if (!b) return;
  const row = b.closest('.arow');
  if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Really delete?'; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ''; b.textContent = 'Delete'; } }, 4000); return; }
  b.disabled = true; b.textContent = 'Deleting...';
  try { await adminCall(pw, 'deleteAlbum', { albumId: row.dataset.id }); clearAlbumCache(); row.remove(); if (!list.querySelector('.arow')) loadList(); }
  catch (x) { b.disabled = false; b.textContent = 'Delete'; errEl.textContent = x.message; errEl.hidden = false; }
});
