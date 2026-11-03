import { createTestGateway } from './testGateway.js';

// Every payment processor implements the same three methods, so checkout, the billing worker
// and the portal never depend on which processor is used:
//
//   startPayment(order)                   → data the payment page needs (e.g. a hosted-fields token)
//   completePayment(order, payment)       → { approved, transactionId, customerId, cardToken, cardLabel, message }
//   chargeSavedCard({ customerId, cardToken, amount, idempotencyKey })
//                                         → { approved, transactionId, message }
//
// Helcim and Stripe adapters are added once STEMOTICS confirms the split (Decision D-1).
export function createPaymentGateway(name) {
  if (name === 'test') return createTestGateway();
  throw new Error(
    `Payment gateway "${name}" is not implemented yet. It is built after Decision D-1 (Phase 05 §3.2).`
  );
}
