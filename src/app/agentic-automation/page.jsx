import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('agentic-automation');

export const metadata = {
  title: manifest.pages['agentic-automation'].title,
  description: manifest.pages['agentic-automation'].description,
};

export default function AgenticAutomationPage() {
  return <Partial name="agentic-automation.html" />;
}
