import { randomToken } from '../../utils/tokens.js';

// Built-in fake gateway for development and tests (never allowed in production, see env.js).
// The payment page shows "Approve" / "Decline" buttons instead of card fields.
//   payment.testOutcome = 'approve'            → approved; later monthly charges succeed
//   payment.testOutcome = 'approve_then_fail'  → approved; later monthly charges are declined
//   payment.testOutcome = 'decline'            → declined
export function createTestGateway() {
  return {
    name: 'test',

    async startPayment() {
      return { mode: 'test' };
    },

    async completePayment(order, payment) {
      const outcome = payment.testOutcome;
      if (outcome !== 'approve' && outcome !== 'approve_then_fail') {
        return { approved: false, message: 'Test card declined.' };
      }
      return {
        approved: true,
        transactionId: `test_txn_${randomToken(8)}`,
        customerId: `test_cus_${order.parent}`,
        cardToken: outcome === 'approve_then_fail' ? 'test_tok_fail_later' : 'test_tok_ok',
        cardLabel: 'Test card •••• 4242'
      };
    },

    async chargeSavedCard({ cardToken }) {
      if (cardToken === 'test_tok_fail_later') {
        return { approved: false, message: 'Test card declined.' };
      }
      return { approved: true, transactionId: `test_txn_${randomToken(8)}` };
    }
  };
}
