import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('privacy-policy');

export const metadata = {
  title: manifest.pages.privacy.title,
  description: manifest.pages.privacy.description,
};

export default function PrivacyPolicyPage() {
  return <Partial name="privacy-policy.html" />;
}
