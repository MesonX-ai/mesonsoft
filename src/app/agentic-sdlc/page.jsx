import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('agentic-sdlc');

export const metadata = {
  title: manifest.pages['agentic-sdlc'].title,
  description: manifest.pages['agentic-sdlc'].description,
};

export default function AgenticSDLCPage() {
  return <Partial name="agentic-sdlc.html" />;
}