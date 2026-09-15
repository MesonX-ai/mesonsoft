import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('advanced-llm-integration');

export const metadata = {
  title: manifest.pages['advanced-llm-integration'].title,
  description: manifest.pages['advanced-llm-integration'].description,
};

export default function AdvancedLLMIntegrationPage() {
  return <Partial name="advanced-llm-integration.html" />;
}
