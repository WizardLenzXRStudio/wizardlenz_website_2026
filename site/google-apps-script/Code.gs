/**
 * Wizardlenz gallery backend: stores albums in Google Drive and serves them to the website.
 *
 * One folder "Wizardlenz Gallery" in the owner's Drive holds one sub-folder per album.
 * The album's details are kept in the sub-folder's description. Each photo is stored as two files:
 *   001.jpg    (the full photo)      001_t.jpg   (a small thumbnail for grids)
 * Photos are ordered by file name; the first photo is the album cover.
 *
 * Photos are also served through this script (action=photo), so the gallery works even if Drive
 * does not allow public link sharing for your account.
 *
 * Setup is in docs/gallery-setup.md.   Version 2
 */
var ROOT_NAME = 'Wizardlenz Gallery';

function props_() { return PropertiesService.getScriptProperties(); }

function root_() {
  var id = props_().getProperty('ROOT_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var it = DriveApp.getFoldersByName(ROOT_NAME);
  var f = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_NAME);
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  props_().setProperty('ROOT_ID', f.getId());
  return f;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function stem_(name) { return String(name).replace(/(_t)?\.[^.]+$/, ''); }

function listAlbums_() {
  var out = [], it = root_().getFolders();
  while (it.hasNext()) {
    var f = it.next(), meta = {};
    try { meta = JSON.parse(f.getDescription() || '{}'); } catch (e) {}
    if (!meta.title) continue;
    var mains = [], thumbs = {}, fi = f.getFiles();
    while (fi.hasNext()) {
      var x = fi.next();
      if (String(x.getMimeType()).indexOf('image/') !== 0) continue;
      var name = x.getName();
      if (/_t\.[^.]+$/.test(name)) thumbs[stem_(name)] = x.getId();
      else mains.push({ id: x.getId(), name: name });
    }
    mains.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    var photos = mains.map(function (m) { return { id: m.id, name: m.name, thumbId: thumbs[stem_(m.name)] || '' }; });
    out.push({ id: f.getId(), title: meta.title, inst: meta.inst || '', type: meta.type || '', when: meta.when || '', date: meta.date || '', created: meta.created || 0, photos: photos });
  }
  out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || (b.created - a.created); });
  return out;
}

function albumFolder_(id) {
  var it = root_().getFolders();
  while (it.hasNext()) { var f = it.next(); if (f.getId() === id) return f; }
  throw new Error('Album not found');
}

function fileInAlbum_(folder, fileId) {
  var it = folder.getFiles();
  while (it.hasNext()) { var x = it.next(); if (x.getId() === fileId) return x; }
  return null;
}

function inGallery_(file) {
  var rootId = root_().getId(), ps = file.getParents();
  while (ps.hasNext()) {
    var gp = ps.next().getParents();
    while (gp.hasNext()) { if (gp.next().getId() === rootId) return true; }
  }
  return false;
}

function makeFile_(folder, name, b64) {
  var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', name));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return file.getId();
}

function doGet(e) {
  var p = (e && e.parameter) || {}, action = p.action || 'ping';
  try {
    if (action === 'albums') return json_({ ok: true, albums: listAlbums_() });
    if (action === 'photo') {
      var f = DriveApp.getFileById(p.id);
      if (!inGallery_(f)) return json_({ ok: false, error: 'Not a gallery photo.' });
      var blob = f.getBlob();
      return json_({ ok: true, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) });
    }
  } catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  return json_({ ok: true, service: 'wizardlenz-gallery', version: 2 });
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    var pw = props_().getProperty('ADMIN_PASSWORD');
    if (!pw) return json_({ ok: false, error: 'Admin password is not set in Script properties.' });
    if (b.password !== pw) return json_({ ok: false, error: 'Wrong password.' });

    if (b.action === 'verify') return json_({ ok: true, version: 2 });

    if (b.action === 'createAlbum') {
      var m = b.meta || {};
      if (!m.title || !m.inst) return json_({ ok: false, error: 'Program name and institution are required.' });
      var f = root_().createFolder((m.date || 'undated') + ' ' + String(m.title).slice(0, 60));
      f.setDescription(JSON.stringify({ title: m.title, inst: m.inst, type: m.type || '', when: m.when || '', date: m.date || '', created: Date.now() }));
      return json_({ ok: true, id: f.getId() });
    }

    if (b.action === 'updateAlbum') {
      var fo = albumFolder_(b.albumId), old = {};
      try { old = JSON.parse(fo.getDescription() || '{}'); } catch (e2) {}
      var n = b.meta || {};
      if (!n.title || !n.inst) return json_({ ok: false, error: 'Program name and institution are required.' });
      fo.setDescription(JSON.stringify({ title: n.title, inst: n.inst, type: n.type || '', when: n.when || '', date: n.date || '', created: old.created || Date.now() }));
      fo.setName((n.date || 'undated') + ' ' + String(n.title).slice(0, 60));
      return json_({ ok: true });
    }

    if (b.action === 'addPhoto') {
      var folder = albumFolder_(b.albumId), base = b.name || ('n' + Date.now());
      var id = makeFile_(folder, base + '.jpg', b.data);
      var thumbId = b.thumbData ? makeFile_(folder, base + '_t.jpg', b.thumbData) : '';
      return json_({ ok: true, id: id, thumbId: thumbId });
    }

    if (b.action === 'deletePhoto') {
      var fd = albumFolder_(b.albumId);
      [b.photoId, b.thumbId].forEach(function (fid) { if (!fid) return; var x = fileInAlbum_(fd, fid); if (x) x.setTrashed(true); });
      return json_({ ok: true });
    }

    if (b.action === 'reorder') {
      var fr = albumFolder_(b.albumId), list = b.order || [];
      list.forEach(function (it, i) {
        var nn = ('00' + (i + 1)).slice(-3);
        var main = fileInAlbum_(fr, it.id); if (main) main.setName(nn + '.jpg');
        if (it.thumbId) { var t = fileInAlbum_(fr, it.thumbId); if (t) t.setName(nn + '_t.jpg'); }
      });
      return json_({ ok: true });
    }

    if (b.action === 'deleteAlbum') {
      albumFolder_(b.albumId).setTrashed(true);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}
