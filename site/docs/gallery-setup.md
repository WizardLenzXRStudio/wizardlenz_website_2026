# Gallery on Google Drive: one-time setup (about 5 minutes)

The gallery keeps every album in a folder called **Wizardlenz Gallery** in a Google Drive you choose. A small
Google Apps Script (free) lets the website read the albums and lets the admin page add or delete them.
You do this once.

## 1. Create the script
1. Sign in to the Google account whose Drive should hold the photos (for example the company account).
2. Go to https://script.google.com and click **New project**. Name it `Wizardlenz Gallery`.
3. Delete the sample code, then paste in the whole of `google-apps-script/Code.gs` from this project. Save.

## 2. Set the admin password
1. In the script editor open **Project Settings** (gear icon) and scroll to **Script properties**.
2. Click **Add script property**. Name: `ADMIN_PASSWORD`. Value: a long password only your admin knows. Save.

## 3. Deploy it
1. Click **Deploy** > **New deployment**. Click the gear next to "Select type" and choose **Web app**.
2. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
3. Approve the permissions when Google asks (it needs your Drive). If you see "Google hasn't verified this app",
   click **Advanced** > **Go to Wizardlenz Gallery (unsafe)**. It is your own script.
4. Copy the **Web app URL** (it ends in `/exec`).

## 4. Connect the website
Put the Web app URL in `src/data/site-config.js` (the `GALLERY_API` line). Restart the site (`start-site.bat`) or rebuild (`npm run build`).
(Alternative: set `PUBLIC_GALLERY_API` in a `.env` file or in your host's environment settings; it overrides the config file.)

## 5. Use it
- Open `/admin/`, sign in with the admin password, fill the form, add photos, press **Publish**.
- Photos land in Drive under **Wizardlenz Gallery** > one folder per album. You can also open Drive and
  add or remove photos there; image files are shown in file-name order (`001.jpg`, `002.jpg`, ...), first one is the cover.
- **Updating the script** (when `Code.gs` changes, for example in version 2): paste the new code over the old, save, then
  **Deploy** > **Manage deployments** > click the pencil (edit) > **Version: New version** > **Deploy**.
  The Web app URL stays the same, so nothing else changes. Do *not* choose "New deployment", which would create a different URL.

## Notes
- Photos are resized to 2000 px on the long side before upload, so albums stay quick to load.
- Anyone with the Web app URL can *read* the albums (that is what the public gallery does). Only someone with the
  admin password can add or delete.
- Google limits Apps Script to about 6 minutes per request and some daily quotas; a 40 photo album is well within them.
