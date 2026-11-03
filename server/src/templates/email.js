import { formatCents, formatLongDate } from '@stemotics/shared';

// Email templates. Each returns { subject, text, html }. Keep wording plain and include the
// facts parents need to act on (dates, amounts, links).

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Paragraphs are strings, or { link: { label, href } } for a button. (Check the type, not
// `p.link`: every string has a built-in .link() method.)
function layout(paragraphs) {
  const html = paragraphs
    .map((p) =>
      typeof p === 'object'
        ? `<p><a href="${escapeHtml(p.link.href)}" style="background:#00309a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(p.link.label)}</a></p>`
        : `<p>${escapeHtml(p)}</p>`
    )
    .join('\n');
  const text = paragraphs
    .map((p) => (typeof p === 'object' ? `${p.link.label}: ${p.link.href}` : p))
    .join('\n\n');
  const footer = 'STEMOTICS · 695 Bishop Street North, Cambridge, ON N3H 2K8 · 519-957-1073';
  return {
    text: `${text}\n\n--\n${footer}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:560px">${html}<hr><p style="font-size:12px;color:#666">${footer}</p></div>`
  };
}

export function orderConfirmationEmail({ order, nextBillingDate, setPasswordUrl, portalUrl }) {
  const lines = [
    `Hi ${order.contact.firstName},`,
    `Thank you for registering with STEMOTICS. Your order ${order.orderNumber} is confirmed.`,
    ...order.items.map(
      (item) =>
        `${item.childName}: ${item.title}, ${item.timeSlotLabel}, starting ${formatLongDate(item.startDate)}. First month: ${formatCents(item.amount)}.`
    ),
    `Your card will be charged automatically each month. Next charge: ${formatLongDate(nextBillingDate)}.`,
    'To cancel, please give at least 4 weeks’ notice before your next billing date; otherwise the upcoming month is still charged.',
    setPasswordUrl
      ? { link: { label: 'Set a password to manage your registration', href: setPasswordUrl } }
      : { link: { label: 'View your account', href: portalUrl } }
  ];
  return { subject: `Registration confirmed — ${order.orderNumber}`, ...layout(lines) };
}

export function passwordResetEmail({ firstName, resetUrl, isNewAccount }) {
  const lines = isNewAccount
    ? [
        `Hi ${firstName},`,
        'Set a password for your STEMOTICS account to view orders and manage subscriptions.',
        { link: { label: 'Set your password', href: resetUrl } },
        'This link expires in 24 hours.'
      ]
    : [
        `Hi ${firstName},`,
        'We received a request to reset your STEMOTICS password.',
        { link: { label: 'Reset your password', href: resetUrl } },
        'This link expires in 1 hour. If you did not ask for this, you can ignore this email.'
      ];
  return {
    subject: isNewAccount ? 'Set your STEMOTICS password' : 'Reset your STEMOTICS password',
    ...layout(lines)
  };
}

export function cancellationConfirmationEmail({ firstName, courseTitle, childName, subscription }) {
  const chargeLine =
    subscription.cancellationCase === 'B'
      ? `Because the request was made less than 4 weeks before the next billing date, one final payment of ${formatCents(subscription.monthlyAmount)} will be charged on ${formatLongDate(subscription.finalBillingDate)}.`
      : 'There will be no further charges.';
  return {
    subject: `Cancellation confirmed — ${courseTitle}`,
    ...layout([
      `Hi ${firstName},`,
      `We have received your cancellation for ${childName} in ${courseTitle}.`,
      chargeLine,
      `${childName}'s last day of classes is ${formatLongDate(subscription.serviceEndDate)}.`
    ])
  };
}

export function paymentFailedEmail({ firstName, amount, cycleDate, portalUrl }) {
  return {
    subject: 'Action needed: monthly payment declined',
    ...layout([
      `Hi ${firstName},`,
      `Your monthly payment of ${formatCents(amount)} due ${formatLongDate(cycleDate)} was declined. We will try again in a few days.`,
      'Please contact us or update your card to keep your child’s place.',
      { link: { label: 'View your account', href: portalUrl } }
    ])
  };
}

export function paymentReceiptEmail({ firstName, amount, cycleDate, courseTitle }) {
  return {
    subject: 'STEMOTICS monthly payment received',
    ...layout([
      `Hi ${firstName},`,
      `We received your monthly payment of ${formatCents(amount)} for ${courseTitle} (billing date ${formatLongDate(cycleDate)}). Thank you!`
    ])
  };
}
