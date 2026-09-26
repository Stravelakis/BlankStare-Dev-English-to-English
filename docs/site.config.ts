import type { DotFieldOptions } from './src/scripts/dot-field';

// Per-repo config. Most projects only touch this file and src/docs/*.md.

interface SocialLink {
  kind: 'github' | 'linkedin';
  label: string;
  href: string;
}

export const siteConfig = {
  projectName: 'BlankStare',
  description:
    'A free Chrome side panel that rewrites developer docs, error messages and terminal output into plain English or Greek, as you read. Bring your own free Groq key.',
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
  socialImageAlt: 'BlankStare: an art-deco side panel turning a TypeError into plain English, with the tagline "Developer docs, in plain English."',
  locale: 'en_GB',

  // Sidebar menu. Each id must match an element id on the page.
  nav: [
    { id: 'top', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'showcase', label: 'Showcase' },
    { id: 'docs', label: 'Docs' },
    { id: 'walkthrough', label: 'Walkthrough' },
  ],

  // Reading-level switch at the top of the sidebar. The ids are fixed (they
  // match src/docs/dev.md, plain.md, eli5.md); change labels only.
  vernaculars: [
    { id: 'dev', label: 'Dev' },
    { id: 'plain', label: 'English' },
    { id: 'eli5', label: 'ELI5' },
  ],

  playground: {
    // true only for JS/web projects, where running the code in the browser is real.
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

  // React Bits "Dot Field" settings, same names as on reactbits.dev.
  backgrounds: {
    page: {
      cursorRadius: 200,
      bulgeStrength: 6,
      cursorForce: 0,
      dotRadius: 2,
      dotSpacing: 5,
      glowRadius: 50,
      sparkle: true,
      gradientFrom: '#0001c6',
      gradientTo: '#00cade',
      glowColor: '#040410',
    },
    sidebar: {
      cursorRadius: 100,
      bulgeStrength: 0,
      cursorForce: 0,
      bulgeOnly: false,
      dotSpacing: 5,
      glowRadius: 50,
      gradientFrom: '#0001c6',
      gradientTo: '#00cade',
      glowColor: '#040410',
    },
  } satisfies Record<string, DotFieldOptions>,
};
