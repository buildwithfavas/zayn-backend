import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const accountBlockedMailTemplate = (
  name,
  reason = null,
  supportEmail = 'support@shoppingcart.com'
) => {
  const templatePath = path.join(__dirname, 'block-user.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  let reasonBlock = '';
  if (reason) {
    reasonBlock = `
    <div style="margin:24px 0;">
      <p style="margin:0 0 8px;font-weight:600;color:#111827;">Reason for blocking:</p>
      <div style="background:#f9fafb;padding:12px;border-radius:8px;color:#4b5563;border:1px solid #e5e7eb;">
        ${reason}
      </div>
    </div>`;
  }

  html = html
    .replace('{{name}}', name)
    .replace('{{reasonBlock}}', reasonBlock)
    .replace(/{{supportEmail}}/g, supportEmail) // Global replace for multiple occurrences
    .replace('{{year}}', new Date().getFullYear());

  return html;
};

export default accountBlockedMailTemplate;
