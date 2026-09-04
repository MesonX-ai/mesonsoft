import fs from 'node:fs';
import path from 'node:path';
import Partial from '../components/Partial';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

export const metadata = {
  title: manifest.pages.home.title,
  description: manifest.pages.home.description,
};

export default function HomePage() {
  return <Partial name="home.html" />;
}
