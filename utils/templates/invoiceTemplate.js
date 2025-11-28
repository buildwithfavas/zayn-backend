import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const invoiceTemplateGenerate = (order, item, discount) => {
  const subtotal = item.oldPrice * item.quantity;
  const total = item.price * item.quantity;

  const templatePath = path.join(__dirname, 'invoice.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const transactionIdBlock = order.payment.transactionId
    ? `<strong>Transaction ID:</strong> ${order.payment.transactionId}`
    : '';

  const itemVariantBlock = item.variant
    ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">${item.variant}</div>`
    : '';

  const oldPriceBlock =
    item.oldPrice > item.price
      ? `<span class="old-price">₹${item.oldPrice.toFixed(2)}</span>`
      : `₹${item.oldPrice.toFixed(2)}`;

  const shippingChargeBlock = order.shippingCharge
    ? `
    <div class="summary-row">
      <span>Shipping Charges</span>
      <span class="amount">₹${order.shippingCharge.toFixed(2)}</span>
    </div>
    `
    : '';

  html = html
    .replace(/{{orderId}}/g, order.orderId)
    .replace('{{customerName}}', order.shippingAddress.name)
    .replace('{{addressLine}}', order.shippingAddress.address_line)
    .replace('{{locality}}', order.shippingAddress.locality)
    .replace('{{city}}', order.shippingAddress.city)
    .replace('{{state}}', order.shippingAddress.state)
    .replace('{{pinCode}}', order.shippingAddress.pin_code)
    .replace('{{mobile}}', order.shippingAddress.mobile)
    .replace(
      '{{invoiceDate}}',
      new Date(order.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    )
    .replace('{{paymentMethod}}', order.payment.method)
    .replace('{{transactionIdBlock}}', transactionIdBlock)
    .replace('{{itemName}}', item.name)
    .replace('{{itemVariantBlock}}', itemVariantBlock)
    .replace('{{quantity}}', item.quantity)
    .replace('{{oldPriceBlock}}', oldPriceBlock)
    .replace('{{price}}', item.price.toFixed(2))
    .replace('{{totalItemPrice}}', (item.price * item.quantity).toFixed(2))
    .replace('{{subtotal}}', subtotal.toFixed(2))
    .replace('{{discount}}', discount.toFixed(2))
    .replace('{{shippingChargeBlock}}', shippingChargeBlock)
    .replace('{{total}}', total.toFixed(2));

  return html;
};
