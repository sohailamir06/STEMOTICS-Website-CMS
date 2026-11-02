# STEMOTICS Website & CMS — Master R&D Documentation

## 1. Executive Project Overview

This documentation suite establishes the master architectural blueprint and implementation specification for rebuilding the [STEMOTICS](https://stemotics.com/) public web platform and developing a modern, user-friendly Content Management System (CMS).

The platform serves dual core purposes:
1. **Public Web Experience:** A modern, professional, responsive, and industry-leading educational website inspired by the reference site, preserving 100% of its branding, content, verified color scheme (`#00309A` royal blue, `#D9F293` electric lime, `#111111` dark text), and typography hierarchy, while introducing refined UX improvements.
2. **Operations & Management Platform:** A robust back-office system enabling non-technical staff to manage courses, seasonal camps, attendance rosters, recurring monthly subscription payments, automated emergency medical forms, gallery media, custom forms, and Twilio SMS communications without developer assistance.

This documentation incorporates the complete live audit of `https://stemotics.com/` and the updated client specifications dated **October 27, 2026**.

---

## 2. Technology Stack & Architecture

- **Frontend Application:** React.js 19, Vite, Tailwind CSS v4, Lucide-React, Framer Motion
- **Backend API:** Node.js (LTS v22), Express.js RESTful API, PM2 Cluster
- **Database & Data Modeling:** MongoDB Enterprise / Atlas replica set with field-level encryption, Mongoose ODM v8
- **Authentication & Security:** JWT with HttpOnly Secure Cookies, Granular Role-Based Access Control (RBAC), PIPEDA Compliance
- **Dual Payment Integration:** Stripe (one-time camp registrations & credit card checkout) and Helcim (recurring monthly subscription processing)
- **Media Asset Management:** Cloudinary CDN with automatic WebP conversion and responsive thumbnail generation
- **Communications:** Twilio Node API for Canadian SMS (CASL compliant) and SendGrid / Amazon SES for transactional and broadcast emails
- **Document Generation:** Puppeteer engine for generating pixel-perfect 8.5" x 11" landscape printable rosters and sign-in sheets

---

## 3. Client Requirements Reconciliation Matrix

| Client Requirement (PDF Brief) | Summary Specification | R&D Phase Reference |
|---|---|---|
| **Regular Programs Slot Capacity** | Default 9 children per slot; staff editable; auto-closes when full, auto-reopens when freed | [Phase 04](Phase-04-Course-Camp-Management.md) |
| **Printable Class Rosters** | 1-click printable PDF rosters with child name, age, program, start date, and medical alerts | [Phase 04](Phase-04-Course-Camp-Management.md) |
| **Camp Management & Themes** | Support PD Day, Winter, March Break, Summer camps; dynamic theme creation/renaming in CMS | [Phase 04](Phase-04-Course-Camp-Management.md) |
| **Camp Attendance Sheets** | Filterable by day/week/theme/age; includes parent phone/email and drop-off/pick-up signature lines | [Phase 04](Phase-04-Course-Camp-Management.md) |
| **Camp Bulk Email Engine** | Broadcast targeted emails to registered camp parents with date, theme, and age filters | [Phase 04](Phase-04-Course-Camp-Management.md) & [Phase 06](Phase-06-Forms-Communication.md) |
| **Automated Medical Form Workflow** | Auto-email link upon child's first enrollment; collect 16 verified fields; staff completion tracker | [Phase 06](Phase-06-Forms-Communication.md) |
| **Recurring Monthly Subscriptions** | Auto-charge saved card monthly from start date; integrate Helcim and Stripe | [Phase 05](Phase-05-Registration-Checkout.md) |
| **4-Week Cancellation Rule** | Notice required >= 4 weeks prior to next billing date; automated calculation and enforcement | [Phase 05](Phase-05-Registration-Checkout.md) |
| **Course Start Date Picker** | Restrict calendar selection strictly to matching course weekdays (e.g. Monday course -> only Mondays) | [Phase 04](Phase-04-Course-Camp-Management.md) & [Phase 05](Phase-05-Registration-Checkout.md) |
| **Dynamic Course Filters** | Manage the 5 client filter groups (Courses, Age Level, Categories, Difficulty, School Workshops) without coding | [Phase 04](Phase-04-Course-Camp-Management.md) |
| **Homepage Content & Metrics** | Editable hero slider, verified stats (5,000+ children, 20+ schools, 35+ centres, 15+ teachers), newsletter, LMS link | [Phase 01](Phase-01-Website-Audit.md) & [Phase 07](Phase-07-Gallery-Content-Management.md) |
| **Photo & Video Gallery** | Add photos/videos without coding; each with title and date; display in **ascending date order** | [Phase 07](Phase-07-Gallery-Content-Management.md) |
| **Customer Accounts & Checkout** | Guest checkout or account creation; Parent Portal for orders, subscriptions, cancellations | [Phase 05](Phase-05-Registration-Checkout.md) |
| **Twilio SMS Notifications** | Order confirmation SMS and opt-in promotional alerts compliant with Canadian telecommunications laws | [Phase 06](Phase-06-Forms-Communication.md) |
| **Custom Drag-and-Drop Form Builder**| Build custom forms (e.g. School Student Registration, STEM Night inquiries) and generate shareable links | [Phase 06](Phase-06-Forms-Communication.md) |
| **LMS Portal Link** | Prominent links to external Learning Portal (`https://learn.stemotics.com/`) in header, admin, and newsletter | [Phase 01](Phase-01-Website-Audit.md) & [Phase 07](Phase-07-Gallery-Content-Management.md) |

---

## 4. Master R&D Documentation Directory

The R&D documentation is organized into 11 specialized, interdependent phases:

1. [Phase 01 — Reference Website Audit & Content Inventory](Phase-01-Website-Audit.md)  
   *Complete audit of all 21 core pages, 29 products, 8 categories, 5 slider banners, 15 FAQs, and partner institutions.*
2. [Phase 02 — Brand Identity, Typography & Design System](Phase-02-Brand-Design-System.md)  
   *Verified CSS hex colors (`#00309A`, `#D9F293`), `Inter` typography hierarchy, modern UI tokens, and layout improvements.*
3. [Phase 03 — CMS Architecture & Admin Dashboard](Phase-03-CMS-Architecture.md)  
   *The 9 consolidated admin modules, visual section-based page editor, media library, and Role-Based Access Control (RBAC).*
4. [Phase 04 — Course, Program & Camp Management](Phase-04-Course-Camp-Management.md)  
   *9-student slot capacity rules, weekday date picker constraint, dynamic camp themes, printable attendance sheets with signatures, and 5 filter groups.*
5. [Phase 05 — Registration, Checkout & Parent Portal](Phase-05-Registration-Checkout.md)  
   *Guest checkout, recurring subscription engine, Stripe/Helcim dual integration, 4-week cancellation enforcement, and parent portal.*
6. [Phase 06 — Medical Forms, Custom Forms & Communication](Phase-06-Forms-Communication.md)  
   *Automated medical release trigger (16 verified fields), staff completion tracker, drag-and-drop custom form builder, and Twilio SMS.*
7. [Phase 07 — Gallery, Testimonials, Newsletter & Homepage Content](Phase-07-Gallery-Content-Management.md)  
   *Photo/video gallery in ascending date order, hero slider administration, verified impact metrics, testimonials, and LMS link integration.*
8. [Phase 08 — SEO, Performance, Security & Backups](Phase-08-SEO-Security-Backups.md)  
   *PIPEDA child privacy compliance, AES-256 field encryption, PCI-DSS Level 1 tokenization, Schema.org JSON-LD, and automated daily backups.*
9. [Phase 09 — MERN Architecture & Database Design](Phase-09-MERN-Architecture.md)  
   *Complete full-stack architecture, comprehensive Mongoose schemas, REST API route map, and background cron job workers.*
10. [Phase 10 — Testing, Content Verification & QA](Phase-10-Testing-QA.md)  
    *Page-by-page content equivalence checks, boundary testing for slot capacity and weekday pickers, 4-week cancellation test cases, and WCAG AA accessibility.*
11. [Phase 11 — Deployment, Training & Handover](Phase-11-Deployment-Handover.md)  
    *Implementation sequence following client dependencies, production infrastructure, pre-launch checklist, staff training curriculum, and handover package.*

---

## 5. Implementation Readiness & Next Steps

All open questions and requirements from the client brief have been addressed with concrete technical and operational specifications. The documentation is 100% complete, verified against live assets, and ready for development kickoff according to the suggested phase sequence.
