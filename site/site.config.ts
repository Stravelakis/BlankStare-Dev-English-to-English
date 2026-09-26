import type { DotFieldOptions } from './src/scripts/dot-field';

// Per-repo config for the shared docs-theme (repo standards §7).

interface SocialLink {
  kind: 'github' | 'linkedin';
  label: string;
  href: string;
}

export const siteConfig = {
  projectName: 'BlankStare',
  description:
    'A free Chrome side panel that turns developer docs, error messages and tech jargon into plain English while you browse. Bring your own free Groq key.',
  repoUrl: 'https://github.com/Stravelakis/BlankStare-Dev-English-to-English',
  faviconHref: '/BlankStare-Dev-English-to-English/favicon.png',

  seoTitle: 'BlankStare — developer English to plain English, free, in your browser',
  socialImage: 'og-image.png',
  socialImageAlt:
    'BlankStare: the Chrome side panel explaining a TypeError in plain English.',
  locale: 'en_GB',

  nav: [
    { id: 'top', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'showcase', label: 'Screenshots' },
    { id: 'docs', label: 'Docs' },
  ],

  vernaculars: [
    { id: 'dev', label: 'Dev' },
    { id: 'plain', label: 'English' },
    { id: 'eli5', label: 'ELI5' },
  ],

    // BlankStare is a Chrome extension that needs a Groq key; a page sandbox
  // cannot run it honestly, so the docs show real screenshots instead.
  playground: {
    enabled: false,
    starterCode: '',
  },

  author: {
    name: 'Stravelakis',
    links: [
      { kind: 'github', label: 'GitHub', href: 'https://github.com/Stravelakis' },
      { kind: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/stravelakiscom/' },
    ] as SocialLink[],
  },

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
