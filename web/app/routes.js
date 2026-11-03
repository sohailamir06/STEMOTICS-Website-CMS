import { index, layout, route } from '@react-router/dev/routes';

// Paths follow Decision D-10 Option A (existing WordPress paths, Phase 08 §4.1).
// Routes are added stage by stage (see Project-Folder-Structure.md §3).
export default [
  index('routes/home.jsx'),
  route('courses', 'routes/courses.jsx'),
  route('product/:slug', 'routes/product.jsx'),

  // Stage 2: checkout and parent accounts (Brief §5, §10)
  route('checkout', 'routes/checkout.jsx'),
  route('checkout/pay/:orderId', 'routes/checkout-pay.jsx'),
  route('order-success/:orderId', 'routes/order-success.jsx'),
  route('login', 'routes/login.jsx'),
  route('register', 'routes/register.jsx'),
  route('forgot-password', 'routes/forgot-password.jsx'),
  route('reset-password/:token', 'routes/reset-password.jsx'),
  route('my-account', 'routes/my-account-redirect.jsx'), // legacy WooCommerce URL
  layout('routes/account/layout.jsx', [
    route('account', 'routes/account/index.jsx'),
    route('account/subscriptions/:id/cancel', 'routes/account/cancel-subscription.jsx')
  ]),

  route('*', 'routes/not-found.jsx')
];
