import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const accountUnblockedMailTemplate = (name, supportEmail = 'support@shoppingcart.com') => {
  const templatePath = path.join(__dirname, 'unblock-email.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const loginUrl = (process.env.FRONTEND_URL || 'https://yourapp.com') + '/login';

  html = html
    .replace('{{name}}', name)
    .replace('{{loginUrl}}', loginUrl)
    .replace(/{{supportEmail}}/g, supportEmail)
    .replace('{{year}}', new Date().getFullYear());

  return html;
};

export default accountUnblockedMailTemplate;
