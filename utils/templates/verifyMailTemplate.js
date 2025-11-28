import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const verifyMailTemplate = (name, otp) => {
  const templatePath = path.join(__dirname, 'verify-mail.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  html = html
    .replace('{{name}}', name)
    .replace('{{otp}}', otp)
    .replace('{{year}}', new Date().getFullYear());

  return html;
};

export default verifyMailTemplate;
