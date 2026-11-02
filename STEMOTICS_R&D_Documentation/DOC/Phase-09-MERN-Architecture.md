
# Phase 09 — MERN Architecture & Database Design

## 1. Objective

Design the technical architecture and database structure for the STEMOTICS public website, CMS, parent portal, registration system, and management workflows.

## 2. Technology Stack

- React.js: Frontend.
- Node.js: Backend runtime.
- Express.js: API framework.
- MongoDB: Database.
- Secure authentication.
- Cloudinary or equivalent: Media storage.
- Stripe: Payment integration.
- Helcim: Payment integration.
- SMTP or transactional email provider.
- Twilio: SMS integration.

## 3. Application Modules

- Public Website.
- CMS Admin Dashboard.
- Parent Portal.
- Course Management.
- Camp Management.
- Registration.
- Checkout.
- Subscription Management.
- Payment Management.
- Medical Forms.
- Attendance.
- Gallery.
- Newsletter.
- Communication.
- SEO.
- Backup Management.

## 4. Database Collections

### Core Collections

- users
- roles
- pages
- pageSections
- contentVersions
- siteSettings
- navigationMenus
- media

### Course Collections

- courses
- courseCategories
- filterGroups
- filterOptions
- schedules
- timeSlots
- enrollments

### Commerce Collections

- orders
- payments
- subscriptions

### Student Collections

- children
- parents
- campThemes
- attendance
- medicalForms

### Forms and Content Collections

- formBuilderTemplates
- formSubmissions
- galleryItems
- testimonials
- newsletterSubscribers
- campaigns
- smsConsent
- staff

### System Collections

- auditLogs
- backupRecords

## 5. API Structure

Recommended API modules:

- `/api/auth`
- `/api/users`
- `/api/pages`
- `/api/media`
- `/api/courses`
- `/api/categories`
- `/api/filters`
- `/api/schedules`
- `/api/enrollments`
- `/api/orders`
- `/api/payments`
- `/api/subscriptions`
- `/api/parents`
- `/api/children`
- `/api/camps`
- `/api/attendance`
- `/api/forms`
- `/api/gallery`
- `/api/testimonials`
- `/api/newsletter`
- `/api/campaigns`
- `/api/settings`
- `/api/backups`

## 6. Role-Based Access

Recommended roles:

- Super Admin.
- Website Admin.
- Content Editor.
- Course Manager.
- Camp Manager.
- Staff.
- Parent.

## 7. Technical Requirements

- Maintain modular backend architecture.
- Separate controllers, services, models, and routes.
- Validate API inputs.
- Implement centralized error handling.
- Use environment variables.
- Protect sensitive data.
- Apply role-based authorization.
- Maintain audit logs.
- Avoid hard-coded editable content.

## 8. Acceptance Criteria

- Database structure supports all required modules.
- API modules are organized.
- Authentication works.
- Authorization works.
- CMS content is database-driven.
- Media storage is integrated.
- Payment integrations are supported.
- Error handling is centralized.
