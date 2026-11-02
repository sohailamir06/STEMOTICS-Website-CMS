# STEMOTICS Website & CMS — Master R&D Documentation

## 1. Executive Project Overview

This documentation suite is the architectural blueprint and implementation specification for rebuilding the [STEMOTICS](https://stemotics.com/) public website and building a staff-friendly Content Management System (CMS) and registration platform.

The platform serves two purposes:
1. **Public Web Experience:** A modern, responsive educational website that keeps STEMOTICS branding and content (brand colours and fonts to be confirmed from the live CSS — see [Phase 02](Phase-02-Brand-Design-System.md)) while improving UX.
2. **Operations & Management Platform:** A back-office system that lets non-technical staff manage courses, camps, time-slot capacity, rosters, recurring monthly billing, medical/emergency forms, gallery media, custom forms, newsletters and Twilio SMS without developer assistance.

**Source documents:**
- Live site audit of `https://stemotics.com/` (see [Phase 01](Phase-01-Website-Audit.md)).
- Client brief: *"STEMOTICS New Website – Requirements for Designers"*, Oct 27, 2026 (Asfar Imam), sections §1–§12. All "Brief §n" references in these documents point to that PDF.

### 1.1 Scope Labels Used in These Documents

| Label | Meaning |
|---|---|
| **[Brief §n]** | Required by the client brief. In scope. |
| **[Proposed]** | Our recommendation, not in the brief. Needs client approval before it is estimated or built. |
| **[Decision D-n]** | Blocked on a decision listed in §5 below. |

---

## 2. Technology Stack (JavaScript MERN)

The platform uses a JavaScript-only MERN stack:

- **Frontend & Admin CMS:** React 19 (`.jsx`) on Vite, Tailwind CSS v4, Lucide-React, Framer Motion. Public pages must be **server-rendered or prerendered** for SEO — see [Decision D-8](#5-pending-decisions).
- **Rich-Text Editing:** TipTap (`@tiptap/react`).
- **Media Uploads:** Uppy (`@uppy/react`) with signed direct-to-Cloudinary uploads.
- **Backend API:** Node.js (current Active LTS at kickoff — Node 24; Node 22 reaches end-of-life in April 2027), Express, PM2.
- **Background Worker:** A **separate single-instance worker process** for billing, reminders and seat-hold expiry (never run scheduled jobs inside the clustered API — see [Phase 09 §6](Phase-09-MERN-Architecture.md)).
- **Database:** MongoDB Atlas replica set, Mongoose ODM, MongoDB Client-Side Field Level Encryption for medical and contact fields.
- **Authentication & Security:** JWT access + refresh tokens in HttpOnly, `SameSite` cookies, bcrypt, role-based access control, PIPEDA-aligned data handling.
- **Payments:** Helcim (recurring billing) and Stripe (online payments) — exact split is an open client question, [Decision D-1](#5-pending-decisions).
- **Media CDN:** Cloudinary (automatic WebP/AVIF, thumbnails). Videos embedded from YouTube by default.
- **Communications:** Twilio (SMS, Canada) and a transactional email provider (SendGrid / Amazon SES / Resend) via Nodemailer.
- **Printing:** Print-optimised HTML pages (`@media print`) for rosters and attendance sheets; server-side PDF (Puppeteer) only if staff need emailed PDFs [Proposed].

All library versions are pinned to the current stable releases at project kickoff, not to the versions in earlier drafts.

---

## 3. Client Requirements Traceability Matrix

| Brief § | Requirement (summary of the brief) | Where specified |
|---|---|---|
| §1 | **Capacity per time slot, shared across ALL regular programs in that slot.** Default 9, staff-editable per slot. Auto-close for every program in the slot when full; auto-reopen on withdrawal or cap increase. Regular programs only — not camps. | [Phase 04 §2](Phase-04-Course-Camp-Management.md), [Phase 09 §4](Phase-09-MERN-Architecture.md) |
| §2 | Printable roster **per time slot across all programs**: child name, age, program, start date. | [Phase 04 §2.3](Phase-04-Course-Camp-Management.md) |
| §3 | **Three camps** (PD Day, Winter, March Break), **4 themes each**, staff can add/edit/rename themes. Printable attendance sheet filterable by day/week, theme, age group, showing name, age, theme, parent phone, parent email, sign-in/sign-out time and signature. Bulk email to camp parents filterable by theme, age group, date. | [Phase 04 §3](Phase-04-Course-Camp-Management.md), [Phase 06 §4](Phase-06-Forms-Communication.md) |
| §4 | Email the parent a medical/emergency form link the **first time** a child is signed in to any regular program or camp; staff see per-child completion status. | [Phase 06 §2](Phase-06-Forms-Communication.md) |
| §5 | Recurring **monthly** subscription from the chosen start date until cancelled. Cancel ≥ 4 weeks before the next billing date or the upcoming month is still charged; display and enforce. Integrate Helcim and Stripe. | [Phase 05](Phase-05-Registration-Checkout.md), [Phase 09 §4–6](Phase-09-MERN-Architecture.md) |
| §6 | Staff can **add/remove filter groups and options**, tag products, and the course listing filters automatically. | [Phase 04 §4](Phase-04-Course-Camp-Management.md) |
| §7 | Editable homepage slider (slides, links, text). Homepage shows featured programs, running count of children benefited, schools served, community centres, teachers & staff (photos and details), testimonials, newsletter sign-up. Admin sends newsletters/promotions. Link to LMS. | [Phase 07](Phase-07-Gallery-Content-Management.md) |
| §8 | Staff add photos/videos; each entry has title and date; display in **ascending** date order. | [Phase 07 §2](Phase-07-Gallery-Content-Management.md) |
| §9 | Keep About Us, Contact Us, FAQ, Cancellation & Refund Policy, Partner With Us in navigation; content editable by staff. | [Phase 03](Phase-03-CMS-Architecture.md), [Phase 01 §6](Phase-01-Website-Audit.md) |
| §10 | Guest checkout or account creation. Accounts: view orders, cancel subscriptions, place new orders, reset password. Order SMS; opt-in marketing SMS (Twilio, Canada). | [Phase 05](Phase-05-Registration-Checkout.md), [Phase 06 §4](Phase-06-Forms-Communication.md) |
| §11 | Staff-built custom forms with shareable links (e.g. medical form for camps and off-site programs; school student registration). May power the §4 medical form. | [Phase 06 §3](Phase-06-Forms-Communication.md) |
| §12 | Start date picker allows only the weekday the course runs on. | [Phase 04 §5](Phase-04-Course-Camp-Management.md) |

### 3.1 Items Answered by the Brief

| Topic | Answer from the brief |
|---|---|
| Billing cycle | Calendar **monthly**, anchored to the chosen start date (§5). The live site's "Monthly [4 weeks]" label is legacy wording and will not be carried over. |
| 4-week rule | Notice ≥ 4 weeks before the next billing date → no further charges. Less notice → the upcoming month is still charged, then the subscription ends (§5). |
| Default slot capacity | 9 per time slot, editable per slot (§1). The live FAQ ("Up to 10 children") is outdated copy that staff will update. |
| Gallery order | Ascending by date (§8). |
| Medical form frequency | Sent the **first time** a child is signed in (§4). No expiry/renewal is required by the brief. |

### 3.2 Items Not in the Brief (all marked [Proposed])

Summer Camp; waitlist for full slots; studio holiday/closure calendar in the date picker; page revision history, device preview and section drag-reorder; Brand & Theme settings panel (colour/font switcher); two-factor authentication; staff fee-waiver overrides; email open/bounce analytics; emergency SMS broadcasts; medical-form annual renewal; instructor-scoped medical access; Puppeteer PDF generation; Redis; staff training programme. These are reasonable additions but must be approved and estimated separately.

---

## 4. Documentation Directory

1. [Phase 01 — Reference Website Audit & Content Inventory](Phase-01-Website-Audit.md) — pages, 29 products, homepage, FAQ, policies, partners, medical form fields (checked against the live site, Nov 2, 2026).
2. [Phase 02 — Brand Identity, Typography & Design System](Phase-02-Brand-Design-System.md) — design tokens (to be confirmed from live CSS), components, breakpoints.
3. [Phase 03 — CMS Architecture & Admin Dashboard](Phase-03-CMS-Architecture.md) — admin modules, content editor, media library, RBAC.
4. [Phase 04 — Course, Time Slot & Camp Management](Phase-04-Course-Camp-Management.md) — shared time-slot capacity, per-slot rosters, 3 camps × 4 themes, attendance sheets, dynamic filters, weekday date picker.
5. [Phase 05 — Registration, Checkout & Parent Portal](Phase-05-Registration-Checkout.md) — guest/account checkout, monthly subscriptions, 4-week rule, payment gateway split.
6. [Phase 06 — Medical Forms, Custom Forms & Communication](Phase-06-Forms-Communication.md) — first-enrolment medical form workflow, form builder, email, Twilio SMS.
7. [Phase 07 — Gallery, Homepage Content & Newsletter](Phase-07-Gallery-Content-Management.md) — ascending-date gallery, hero slider, homepage counters, staff profiles, newsletter, LMS link.
8. [Phase 08 — SEO, Performance, Security & Backups](Phase-08-SEO-Security-Backups.md) — URL/redirect strategy, encryption, PCI scope, Core Web Vitals, backups.
9. [Phase 09 — MERN Architecture & Data Model](Phase-09-MERN-Architecture.md) — Mongoose models, seat reservation, billing worker, API structure.
10. [Phase 10 — Testing & QA](Phase-10-Testing-QA.md) — content checks, shared-slot capacity tests, cancellation tests, payments, accessibility.
11. [Phase 11 — Deployment, Training & Handover](Phase-11-Deployment-Handover.md) — proposed build sequence, infrastructure, launch checklist, handover.

**Supporting document:** [Project Folder & File Structure](Project-Folder-Structure.md) — monorepo layout: `web/` (public site + parent portal), `cms/` (staff admin), `server/` (API + worker), `shared/`.

---

## 5. Pending Decisions

Nothing marked with a decision below should be built until the decision is recorded here.

### 5.1 For STEMOTICS (client)

| ID | Question | Why it matters / our recommendation |
|---|---|---|
| **D-1** | **Payment split** (open question in Brief §5): which processor takes the first payment and which takes recurring charges? | A card saved in Stripe cannot be reused by Helcim, so "Stripe for the first payment, Helcim for monthly charges" forces parents to enter their card twice. **Recommendation:** Regular Programs entirely on Helcim (first and recurring charges via HelcimPay.js); Stripe for one-time purchases (camps, parties, workshops). A single processor for everything is simpler still. |
| **D-2** | Do camps stay one-time payments? (open question in Brief §5) | Docs assume yes. |
| **D-3** | Brief §1 ends "Applies to Regular Programs only — not Camps (" — what was the rest of the sentence? | May describe camp capacity rules. |
| **D-4** | Real names of the 4 themes for each of the 3 camps. | Needed to seed the CMS. Example theme names in earlier drafts were invented. |
| **D-5** | Real homepage figures: children benefited, schools, community centres, teachers/staff. Should schools and centres be counters, logo strips, or lists? | Earlier drafts used invented figures (5,000+ / 20+ / 35+ / 15+). |
| **D-6** | Brief §4 says "the first time a child is **signed in**" — does this mean first **enrolment** (our assumption) or first attendance sign-in? | Enrolment gets the form before the first class. |
| **D-7** | Does a regular-program seat count as taken from the moment of booking (even if the start date is weeks away), or only from the start date? | Affects when slots show as full. Our default: from booking until the enrolment ends. |
| **D-9** | Approved wording for the new recurring-billing clause in the Cancellation & Refund Policy. | The live policy has no recurring-billing text. |

### 5.2 For the development team

| ID | Question | Recommendation |
|---|---|---|
| **D-8** | Rendering strategy for public pages. A client-rendered Vite SPA risks SEO when replacing a WordPress site. | Use React Router v7 framework mode (Vite-based, keeps the React/Vite stack) with SSR or prerendering for public pages; the admin can stay client-rendered. Next.js is the alternative. |
| **D-10** | Keep legacy WordPress URLs or move to new URLs with 301 redirects? | Either works; pick one and maintain a single redirect map (see [Phase 08 §4](Phase-08-SEO-Security-Backups.md)). |
| **D-11** | Medical form: fixed system form, or built with the form builder (Brief §11 suggests it "could be")? | System form whose core fields are locked (status, allergies, emergency contacts drive rosters and encryption), with optional staff-added extra questions. |

---

## 6. Status

These documents are a **draft specification**. All acceptance-criteria checkboxes are unchecked (`[ ]`) and are ticked only when the feature is built and verified. Development can start on the foundation and catalog work (see [Phase 11 §2](Phase-11-Deployment-Handover.md)) while decisions D-1 to D-11 are resolved.
