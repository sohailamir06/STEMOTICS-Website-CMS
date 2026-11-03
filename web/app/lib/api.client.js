import { createApiClient } from '@stemotics/shared';

export { ApiError } from '@stemotics/shared';

// Browser-side API calls (same origin; /api is proxied to the API server in development).
export const api = createApiClient('/api/v1');

// Guests have no session, so the payment and confirmation pages use the checkout token
// returned when the order was created. Kept only for this browser tab.
const tokenKey = (orderId) => `stemotics.checkout.${orderId}`;

export function saveCheckoutToken(orderId, token) {
  try {
    sessionStorage.setItem(tokenKey(orderId), token);
  } catch {
    // Private mode or storage disabled: the signed-in path still works.
  }
}

export function readCheckoutToken(orderId) {
  try {
    return sessionStorage.getItem(tokenKey(orderId)) ?? '';
  } catch {
    return '';
  }
}
