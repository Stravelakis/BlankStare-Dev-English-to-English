import { defineConfig } from 'astro/config';

// Stravelakis repos publish under the org's Pages domain, one path per repo.
export default defineConfig({
  site: 'https://docs.stravelakis.com',
  base: '/BlankStare-Dev-English-to-English',
  outDir: './dist',
});
