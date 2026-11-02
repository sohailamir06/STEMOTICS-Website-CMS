
# Phase 05 — Registration, Checkout & Parent Portal

## 1. Objective

Implement course registration, checkout, recurring subscriptions, payment integrations, and a parent portal.

## 2. Registration

The system must support:

- Guest checkout.
- Registered account checkout.
- Course selection.
- Child information.
- Age selection.
- Schedule selection.
- Starting date.
- Parent information.
- Order confirmation.
- Registration status.
- Email notifications.

## 3. Course Start Date Picker

The date picker must allow only the weekdays on which the course runs.

Examples:

- Monday course: Mondays only.
- Tuesday course: Tuesdays only.
- Saturday course: Saturdays only.

The available weekdays must be configured through the course schedule manager.

## 4. Checkout

Required functionality:

- Cart management.
- Course quantity.
- Course pricing.
- Parent information.
- Child information.
- Order summary.
- Payment selection.
- Order confirmation.
- Payment status.
- Order history.

## 5. Parent Portal

Registered parents must be able to:

- View orders.
- View subscriptions.
- Cancel subscriptions.
- Place new orders.
- Reset passwords.
- View registration details.
- Manage permitted child and parent information.

## 6. Monthly Subscription Management

Regular Programs must support recurring monthly subscriptions.

Requirements:

- Subscription starts from the selected start date.
- Monthly recurring billing.
- Parent cancellation.
- Four-week cancellation notice.
- Upcoming billing information.
- Cancellation policy display.
- Subscription status.
- Billing history.

If cancellation occurs less than four weeks before the next billing date, the upcoming month is charged, as specified in the client requirements.

## 7. Payment Integrations

Required payment processors:

- Stripe.
- Helcim.

Client confirmation is required regarding:

- First payment processor.
- Ongoing recurring payment processor.
- Whether subscriptions apply only to Regular Programs.
- Whether Camps are one-time payments.

## 8. Payment Security

- Use secure payment provider integrations.
- Do not store raw card details.
- Verify payment events server-side.
- Handle failed payments.
- Handle payment confirmations.
- Handle subscription status changes.
- Log payment events appropriately.

## 9. Acceptance Criteria

- Guest checkout works.
- Registered checkout works.
- Course start date restrictions work.
- Orders are recorded.
- Payment status is accurate.
- Parent portal works.
- Subscription billing is correct.
- Cancellation rules are enforced.
- Payment notifications work.
