import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

export const metadata = {
  title: manifest.pages.terms.title,
  description: manifest.pages.terms.description,
};

export default function TermsOfUsePage() {
  return <Partial name="terms-of-use.html" />;
}
