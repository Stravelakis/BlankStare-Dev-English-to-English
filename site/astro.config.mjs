import { defineConfig } from 'astro/config';

// Served under the Stravelakis organisation site, which owns
// docs.stravelakis.com: every project without its own domain appears at
// /<repo>/. Never give this repository its own custom domain (HANDOFF §10).
export default defineConfig({
  site: 'https://docs.stravelakis.com',
  base: '/BlankStare-Dev-English-to-English',
  outDir: './dist',
});
