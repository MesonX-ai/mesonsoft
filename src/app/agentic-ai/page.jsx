import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import AgentCanvas from '../../components/AgentCanvas';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('agentic-ai');

export const metadata = {
  title: manifest.pages['agentic-ai'].title,
  description: manifest.pages['agentic-ai'].description,
};

export default function AgenticAIPage() {
  return (
    <>
      <Partial name="agentic-ai.html" />
      <AgentCanvas />
    </>
  );
}
