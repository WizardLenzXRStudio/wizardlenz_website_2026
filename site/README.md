# Wizardlenz XR Studio website

Astro static site. Pages: Home, Academy, Studio, Originals, Gallery, About, Contact (+ Terms, Privacy, Refund, 404).

## Run
```
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs dist/
```

## Where things are
- `src/layouts/Base.astro`: head/SEO/JSON-LD, header, footer, portal cover
- `src/pages/**/index.astro`: one file per page (content)
- `src/styles/global.css`: all styling and design tokens
- `src/scripts/site.js`: motion, 3D world, planner, gallery, map (each part only runs on pages that have its elements)
- `public/_redirects` and `vercel.json`: 301s from the old `.html` URLs
- `src/scripts/gallery-data.js`, `src/scripts/admin.js`, `src/pages/admin/`: gallery data + admin page
- `google-apps-script/Code.gs`: the Drive backend you paste into script.google.com
- `public/img`, `public/vendor/three.min.js`

## Still to fill in
- Logos per institution (add a `logo` field to each entry in `PARTNERS` in `src/scripts/site.js`)
- Team photos, founder portraits, Reshik's quote, real gallery albums, game screenshots
- Legal pages: paste the exact text from the current site into `src/pages/{terms,privacy,refund}/index.astro`
- Contact form: set the form endpoint (attribute `data-form-endpoint` on `<html>`); until then the form opens the visitor's email app
- Gallery on Google Drive: follow `docs/gallery-setup.md` once (about 5 minutes), then use `/admin/`
