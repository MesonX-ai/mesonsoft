import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('cloud-ai');

export const metadata = {
  title: manifest.pages['cloud-ai'].title,
  description: manifest.pages['cloud-ai'].description,
};

export default function CloudAIPage() {
  return <Partial name="cloud-ai.html" />;
}
