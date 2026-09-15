import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('contact');

export const metadata = {
  title: manifest.pages.contact.title,
  description: manifest.pages.contact.description,
};

export default function ContactPage() {
  return <Partial name="contact.html" />;
}
