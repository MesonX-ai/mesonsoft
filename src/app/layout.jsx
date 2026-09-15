import fs from 'node:fs';
import path from 'node:path';
import Partial from '../components/Partial';
import ScriptLoader from '../components/ScriptLoader';
import { getCurrentPageKey } from '../lib/page-context';

const PARTIALS_DIR = path.join(process.cwd(), 'src', 'partials');
const manifest = JSON.parse(fs.readFileSync(path.join(PARTIALS_DIR, 'manifest.json'), 'utf8'));

const BASE_BODY_CLASSES = (manifest.bodyClasses || []).filter(
  (c) => !c.startsWith('page-id-') && !c.startsWith('elementor-page-')
);

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  themeColor: '#1bb0ce',
};

export const metadata = {
  title: manifest.defaultTitle,
  description: manifest.defaultDescription,
  icons: {
    icon: [
      { url: '/favicon.ico' },
      ...manifest.icons
        .filter((i) => /icon/i.test(i.rel) && !/apple/.test(i.rel))
        .map((i) => ({ url: i.href, sizes: i.sizes, type: i.href.endsWith('.png') ? 'image/png' : undefined })),
    ],
    apple: manifest.icons
      .filter((i) => /apple/i.test(i.rel))
      .map((i) => i.href),
  },
};

export default function RootLayout({ children }) {
  const pageKey = getCurrentPageKey();
  const allPageClasses = manifest.pageBodyClasses?.[pageKey] || [];
  const pageSpecificClasses = allPageClasses.filter(
    (c) => c.startsWith('page-id-') || c.startsWith('elementor-page-')
  );
  const bodyClasses = [...BASE_BODY_CLASSES, ...pageSpecificClasses];

  return (
    <html lang="en">
      <body
        className={bodyClasses.join(' ')}
        data-framed=""
        data-elementor-device-mode="desktop"
      >
        {/* original stylesheets, in their original order */}
        {manifest.cssLinks.map((href) => (
          <link key={href} rel="stylesheet" href={href} precedence="default" />
        ))}
        <link rel="stylesheet" href="/assets/inline-head.css" precedence="default" />

        {/* original WordPress/Elementor scripts, loaded in original order */}
        <ScriptLoader scripts={manifest.scripts} />

        <div id="inner-body">
          <Partial name="header.html" />
          {children}
          <Partial name="footer.html" />
        </div>
        <Partial name="hidden.html" />
      </body>
    </html>
  );
}
