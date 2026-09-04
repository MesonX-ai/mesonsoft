import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

export const metadata = {
  title: manifest.pages.about.title,
  description: manifest.pages.about.description,
};

export default function AboutPage() {
  return <Partial name="about.html" />;
}
