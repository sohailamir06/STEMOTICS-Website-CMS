import { createAuthService } from './authService.js';
import { createEmailService } from './emailService.js';
import { createPaymentGateway } from './payments/index.js';
import { createAccountService } from './accountService.js';
import { createCheckoutService } from './checkoutService.js';
import { createSubscriptionService } from './subscriptionService.js';
import { createBillingJobs } from '../jobs/billing.js';

// Builds every service from the environment, once. Used by the API (app.js) and the worker,
// so both use the same email transport and payment gateway.
export function createServices(env) {
  const email = createEmailService(env);
  const gateway = createPaymentGateway(env.PAYMENTS_GATEWAY);
  const authService = createAuthService(env);
  const accountService = createAccountService({ env, email });
  const checkoutService = createCheckoutService({ env, gateway, email, accountService });
  const subscriptionService = createSubscriptionService({ env, email });
  const billing = createBillingJobs({ env, gateway, email });
  return {
    email,
    gateway,
    authService,
    accountService,
    checkoutService,
    subscriptionService,
    billing
  };
}
