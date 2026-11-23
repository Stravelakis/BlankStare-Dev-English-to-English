// Per-repo config. Most projects only touch this file and src/docs/*.md.

interface SocialLink {
  kind: 'github' | 'linkedin';
  label: string;
  href: string;
}

export const siteConfig = {
  projectName: 'BlankStare',
  description:
    'A free Chrome side panel that rewrites developer docs, error messages and terminal output into plain English or Greek, as you read. Works with no key; add a free Gemini or Groq key for more.',
  repoUrl: 'https://github.com/Stravelakis/BlankStare-Dev-English-to-English',
  // Path under /public including the base path, e.g. '/repo-name/favicon.svg'. Empty = no favicon tag.
  faviconHref: '/BlankStare-Dev-English-to-English/favicon.png',

  // What a link to the site shows when shared (Open Graph / Twitter cards).
  // seoTitle is the front page's <title> and share title; empty falls back to
  // "Overview · projectName". socialImage is a 1200x630 PNG in /public
  // (without the base path); empty means no image, and most platforms then
  // show a bare, easily-ignored link. Always set both before publishing.
  seoTitle: 'BlankStare: developer docs and error messages in plain English (free Chrome extension)',
  socialImage: 'og-image.png',
  socialImageAlt: 'BlankStare: a brass-on-black side panel turning a TypeError into plain English, with the tagline "Developer docs, in plain English."',
  locale: 'en_GB',

  // Left menu, top group. The "On this page" group below it is built from the
  // headings of the reading level on screen.
  nav: [
    { id: 'top', label: 'Overview' },
    { id: 'features', label: 'What it does' },
    { id: 'showcase', label: 'Screenshots' },
  ],

  // Buttons and chips in the hero (primary = the filled button).
  heroLinks: [
    { label: 'Install it', href: '#install', primary: true },
    { label: 'Source on GitHub', href: 'https://github.com/Stravelakis/BlankStare-Dev-English-to-English' },
    { label: 'What changed', href: 'https://github.com/Stravelakis/BlankStare-Dev-English-to-English/blob/HEAD/CHANGELOG.md' },
    { label: 'Privacy', href: '/BlankStare-Dev-English-to-English/privacy/' },
  ],
  heroPills: ['Works with no key', 'No account', 'Free', 'English and Greek'],

  // The three cards under the hero. They switch the reading level.
  levelCards: [
    { id: 'dev', tag: 'Dev', title: 'How it is built', text: 'Manifest and permissions, the model router, what leaves the browser, storage, test and release.' },
    { id: 'plain', tag: 'English', title: 'How to use it', text: 'For people comfortable with tech who do not write code. Install, daily use, privacy, fixes.' },
    { id: 'eli5', tag: 'ELI5', title: 'Start from zero', text: 'Slow and complete. Every word explained, every click spelled out, with what you should see.' },
  ],

  // First visit lands on English; a reader's saved choice still wins.
  defaultVernacular: 'plain',

  // Tally form link (STANDARDS §8). Empty = no "Send feedback" link.
  feedbackUrl: '',

  // Reading-level switch at the top of the sidebar. The ids are fixed (they
  // match src/docs/dev.md, plain.md, eli5.md); change labels only.
  vernaculars: [
    { id: 'dev', label: 'Dev' },
    { id: 'plain', label: 'English' },
    { id: 'eli5', label: 'ELI5' },
  ],

  playground: {
    // true only for JS/web projects, where running the code in the browser is real.
    // Here it runs the extension's own utils/pure.js, unchanged (see index.astro).
    enabled: true,
    starterCode: `// try it\nconsole.log("hello from the playground")`,
  },

  author: {
    name: 'Stravelakis',
    links: [
      { kind: 'github', label: 'GitHub', href: 'https://github.com/Stravelakis' },
      { kind: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/stravelakiscom/' },
    ] as SocialLink[],
  },
};
