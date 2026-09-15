import fs from 'node:fs';
import path from 'node:path';
import Partial from '../../components/Partial';
import { setCurrentPageKey } from '../../lib/page-context';

const manifest = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'partials', 'manifest.json'), 'utf8')
);

setCurrentPageKey('enterprise-grade-security');

export const metadata = {
  title: manifest.pages['enterprise-grade-security'].title,
  description: manifest.pages['enterprise-grade-security'].description,
};

export default function EnterpriseGradeSecurityPage() {
  return <Partial name="enterprise-grade-security.html" />;
}
