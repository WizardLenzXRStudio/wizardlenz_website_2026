import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.wizardlenzxrstudio.com',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [sitemap({ filter: (p) => !/\/(terms|privacy|refund|admin)\//.test(p) })],
});
