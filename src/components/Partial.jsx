import fs from 'node:fs';
import path from 'node:path';
import parse from 'html-react-parser';

const PARTIALS_DIR = path.join(process.cwd(), 'src', 'partials');

/**
 * Renders one of the extracted HTML partials exactly as saved from the
 * original site (class attributes, inline styles, SVGs, data-* attributes
 * and comments are preserved by html-react-parser).
 */
export default function Partial({ name }) {
  const html = fs.readFileSync(path.join(PARTIALS_DIR, name), 'utf8');
  return parse(html);
}
