/* Gallery data: albums live in a Google Drive folder, served by a small Google Apps Script
   web app (see google-apps-script/Code.gs). Set PUBLIC_GALLERY_API to its URL in .env.
   Without it, the site shows sample albums so the design can be reviewed. */
import { GALLERY_API } from '../data/site-config.js';
export const API = (import.meta.env.PUBLIC_GALLERY_API || GALLERY_API || '').trim();
const IMG = (import.meta.env.PUBLIC_GALLERY_IMG_BASE || 'https://lh3.googleusercontent.com/d/').trim();
const KEY = 'wlz-albums-v2';
export const TYPES = ['Workshop', 'Bootcamp', 'Semester course', 'Faculty program', 'In-plant training', 'Event'];

const PHOTO = '/img/woxsen-2026.jpg';
export const SEED = [
  { id: 'woxsen-2026', title: '2026 program at Woxsen University', inst: 'Woxsen University', type: 'Workshop', when: '2026', h: 265, photos: [PHOTO], thumbs: [PHOTO], isNew: true },
  { id: 's1', title: 'Introduction to Extended Reality', inst: 'Sample University', type: 'Semester course', when: 'March 2026', h: 300, photos: [], thumbs: [], sample: true },
  { id: 's2', title: 'XR: The Horizon of the Digitalization', inst: 'Sample College of Engineering', type: 'Workshop', when: 'February 2026', h: 190, photos: [], thumbs: [], sample: true },
  { id: 's3', title: 'AR for Designers bootcamp', inst: 'Sample School of Design', type: 'Bootcamp', when: 'January 2026', h: 220, photos: [], thumbs: [], sample: true },
  { id: 's4', title: 'XR lab training for faculty', inst: 'Sample Institute of Technology', type: 'Faculty program', when: 'December 2025', h: 330, photos: [], thumbs: [], sample: true },
  { id: 's5', title: 'Summer in-plant training', inst: 'Wizardlenz XR Studio', type: 'In-plant training', when: 'June 2025', h: 40, photos: [], thumbs: [], sample: true },
  { id: 's6', title: 'VR experience zone at a tech fest', inst: 'Sample Arts and Science College', type: 'Event', when: 'April 2025', h: 170, photos: [], thumbs: [], sample: true }
];

const hue = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; };
export const imgUrl = (id, w) => `${IMG}${id}=w${w}`;
function norm(a) {
  const ps = a.photos || [];
  return {
    id: a.id, title: a.title, inst: a.inst, type: a.type, when: a.when, date: a.date || '', items: ps.map(p => ({ id: p.id, thumbId: p.thumbId || '' })),
    h: hue(a.id), photos: ps.map(p => imgUrl(p.id, 1800)), thumbs: ps.map(p => imgUrl(p.thumbId || p.id, 640)),
    isNew: !!a.created && Date.now() - a.created < 21 * 864e5
  };
}

async function fetchRaw() {
  const r = await fetch(API + (API.includes('?') ? '&' : '?') + 'action=albums', { cache: 'no-store' });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || 'Could not load albums');
  return d.albums;
}

/* Fresh list straight from Drive (used by the admin page). */
export const fetchAlbums = async () => (await fetchRaw()).map(norm);

/* Calls cb with cached albums at once (if any), then again with fresh ones. */
export function loadAlbums(cb) {
  if (!API) { cb(SEED, { seed: true }); return; }
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (Array.isArray(cached)) cb(cached.map(norm), {});
  fetchRaw().then(raw => {
    try { localStorage.setItem(KEY, JSON.stringify(raw)); } catch (e) {}
    cb(raw.map(norm), {});
  }).catch(() => { if (!cached) cb([], { error: true }); });
}
export const clearAlbumCache = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

/* Admin calls. Plain-text body keeps the request "simple" so the browser skips a CORS preflight. */
export async function adminCall(password, action, payload = {}) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ password, action, ...payload }) });
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || 'Request failed');
  return d;
}

/* Shrinks a photo in the browser before upload: long side 2000px, JPEG. Returns base64 (no prefix). */
export async function resizeToBase64(file, max = 2000, q = 0.86) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error(`Could not read ${file.name}. Please use a JPEG or PNG photo.`);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
  const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', q));
  return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
}

/* Photos: try the public Drive link first; if the browser can't load it (Drive sharing off or blocked),
   fetch the photo through the script instead. Results are cached in the browser. */
const mem = new Map(); const queue = []; let active = 0;
function pump() {
  while (active < 3 && queue.length) {
    const job = queue.shift(); active++;
    runProxy(job.id).then(job.res, job.rej).finally(() => { active--; pump(); });
  }
}
async function runProxy(id) {
  const key = API + '?photo=' + id;
  try { const c = await caches.open('wlz-photos'); const hit = await c.match(key); if (hit) return URL.createObjectURL(await hit.blob()); } catch (e) {}
  const d = await (await fetch(API + (API.includes('?') ? '&' : '?') + 'action=photo&id=' + encodeURIComponent(id))).json();
  if (!d.ok) throw new Error(d.error || 'photo');
  const bin = atob(d.data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: d.mime || 'image/jpeg' });
  try { (await caches.open('wlz-photos')).put(key, new Response(blob, { headers: { 'Content-Type': d.mime || 'image/jpeg' } })); } catch (e) {}
  return URL.createObjectURL(blob);
}
export function proxyUrl(id) { if (!mem.has(id)) mem.set(id, new Promise((res, rej) => { queue.push({ id, res, rej }); pump(); })); return mem.get(id); }
if (API && typeof document !== 'undefined') {
  document.addEventListener('error', e => {
    const img = e.target; if (!(img instanceof HTMLImageElement) || img.dataset.fb || !img.src.startsWith(IMG)) return;
    img.dataset.fb = '1';
    proxyUrl(img.src.slice(IMG.length).split('=')[0]).then(u => { img.src = u; }).catch(() => {});
  }, true);
}

export const resizePair = async file => ({ data: await resizeToBase64(file, 2000, 0.84), thumbData: await resizeToBase64(file, 560, 0.8) });

/* If a Drive link neither loads nor errors (it can hang), fall back to the script after a few seconds. */
if (API && typeof document !== 'undefined' && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return; const img = en.target; io.unobserve(img);
    setTimeout(() => { if (!img.dataset.fb && img.isConnected && !(img.complete && img.naturalWidth > 0)) img.dispatchEvent(new Event('error')); }, 6000);
  }));
  const watch = n => { if (n.nodeType !== 1) return; (n.tagName === 'IMG' ? [n] : [...n.querySelectorAll('img')]).forEach(i => { if (i.src && i.src.startsWith(IMG)) io.observe(i); }); };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(watch))).observe(document.documentElement, { childList: true, subtree: true });
}
