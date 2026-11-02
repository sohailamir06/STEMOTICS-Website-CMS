# Phase 10 — Testing, Content Verification & QA

## 1. Executive Summary & QA Mandate

This phase defines how the rebuilt platform is verified before launch:
1. **Content migration check:** every page and content block listed in [Phase 01](Phase-01-Website-Audit.md) exists on staging with approved wording.
2. **Brief rule tests:** boundary tests for shared time-slot capacity (§1), rosters (§2), camps (§3), medical form (§4), billing and the 4-week rule (§5), filters (§6), gallery order (§8), accounts (§10) and the date picker (§12).
3. **Payments, security, accessibility and cross-device checks.**

Rule tests (capacity, billing dates, cancellation) are written as **automated tests** (unit + API tests against a MongoDB replica set) so they run on every change, not only once before launch.

---

## 2. Content Verification Checklist (Page-by-Page)

| Page / Section | Reference URL | What to check | Pass criteria |
|---|---|---|---|
| **Homepage** | `/` | 5 real slides (no "Lorem ipsum" placeholders), content sections, testimonials, impact section, team section, newsletter, footer | Wording approved by STEMOTICS; slides, figures and team editable in CMS |
| **Course Catalog** | `/courses/` | 5 filter groups and options, product cards | Filter results match tagging (OR within group, AND across groups) |
| **Product pages** | `/product/*` (29) | Levels, time slots, weekday picker, child name, age | Content matches each live product page; slot and date rules work |
| **Camps** | camps page | PD Day, Winter, March Break products; themes; care options | 3 camps with their themes |
| **Medical Form** | medical form URL | All 16 fields from Phase 01 §6.7, consent texts | Submits, encrypts, updates roster status |
| **About Us** | `/about-us/` | Mission, vision, goals, services, TOT | Full live text migrated (not the abridged audit summary) |
| **FAQ** | `/faq/` | All 15 Q&As, class-size answer updated | Full live text; class-size copy consistent with new rule |
| **Cancellation Policy** | `/cancellation-refund-policy/` | On-site, off-site (deposit refund rules), transfers, new recurring-billing clause | Live terms preserved; recurring clause wording approved (D-9) |
| **Partner With Us** | `/partner-with-us/` | Full page copy | Matches live page |
| **Community Partners** | `/school-library-community-center/` | 19 schools, 13 libraries, community centre list | Cleaned list approved by STEMOTICS |
| **Image & Video Gallery** | `/image-gallery/`, `/video-gallery/` | Titles, dates, media | Ascending date order |
| **Redirects** | All old URLs | Every URL from the live sitemaps | Each returns 200 or a single 301 to the right page (D-10) |

---

## 3. Brief Rule Tests

### 3.1 Shared Time-Slot Capacity (Brief §1)

Setup: slot **Monday 5–6 PM**, capacity 9. Coding Junior, Robotics Senior and Game Design Junior are all offered in it.

| ID | Steps | Expected result |
|---|---|---|
| CAP-01 | Enrol 5 children in Coding Junior and 3 in Robotics Senior in Mon 5 PM | Slot shows 1 seat left on **all three** programs |
| CAP-02 | Enrol 1 child in Game Design Junior in Mon 5 PM | Slot is Full on all three programs; Add to Cart disabled for that slot |
| CAP-03 | Send a direct API request to enrol a 10th child in any program in that slot | `409 TIME_SLOT_FULL`; count stays 9 |
| CAP-04 | Staff raise Mon 5 PM capacity to 10 | Slot immediately shows 1 seat left on all three programs |
| CAP-05 | A child's enrolment ends (after cancellation service end date) | Count drops by 1; slot reopens automatically |
| CAP-06 | **Concurrency:** with 1 seat left, fire 10 simultaneous checkout requests for that slot | Exactly 1 succeeds, 9 get `409`; count = capacity |
| CAP-07 | Start checkout (seat held), abandon payment for 15+ minutes | Hold expires; seat released once; slot reopens |
| CAP-08 | Staff lower capacity from 9 to 7 while 9 are enrolled | No one is removed; slot stays Full until count < 7 |
| CAP-09 | Mon 6–7 PM slot is unaffected by Mon 5–6 PM being full | Mon 6 PM still selectable |
| CAP-10 | Camp registrations | Do not use or change any time-slot count |

### 3.2 Per-Slot Roster (Brief §2)

| ID | Steps | Expected result |
|---|---|---|
| ROS-01 | Print Mon 5 PM roster after CAP-02 | 9 children from 3 programs, each with name, age, program (and level), start date |
| ROS-02 | Print preview | Fits Letter landscape; headers repeat on each page |

### 3.3 Weekday Date Picker (Brief §12)

| ID | Steps | Expected result |
|---|---|---|
| DATE-01 | Choose a Wednesday 5 PM slot | Only Wednesdays selectable |
| DATE-02 | Look at past dates | All disabled |
| DATE-03 | Submit a Tuesday start date for a Wednesday slot via the API | Rejected with validation error |
| DATE-04 | Test with the browser set to a different time zone (e.g. UTC−8 and UTC+5) | Same weekdays enabled; stored date unchanged |
| DATE-05 | Select Monday, April 12, 2027 | Enrolment `startDate = 2027-04-12`; subscription anchor day 12 |
| DATE-06 [Proposed] | Staff add Good Friday (2027-03-26) as a closure | Shown as closed in Friday slots |

### 3.4 Monthly Billing (Brief §5)

| ID | Steps | Expected result |
|---|---|---|
| BILL-01 | Start date 2027-04-14 | First charge at checkout; next charges 2027-05-14, 2027-06-14 |
| BILL-02 | Anchor day 31, starting 2027-01-31 | Charges on 2027-02-28, 2027-03-31, 2027-04-30, 2027-05-31 |
| BILL-03 | Run the billing job twice on the same day | Each due subscription charged exactly once (unique Charge per cycle) |
| BILL-04 | Card declined on renewal | Charge `failed`, subscription `pastDue`, parent emailed, staff alerted; retry on +3 days |
| BILL-05 | Billing job runs at 03:00 Toronto time | Uses Toronto date even when the server clock is UTC |

### 3.5 4-Week Cancellation Rule (Brief §5)

Setup: anchor day 15. Last charge April 15, 2027; **next billing date N = May 15, 2027**.

| ID | Request date | Notice | Expected result |
|---|---|---|---|
| CANC-01 | 2027-04-16 | 29 days | **Case A:** no further charges; classes end **2027-05-14** |
| CANC-02 | 2027-04-17 | 28 days (boundary) | **Case A:** no further charges; classes end 2027-05-14 |
| CANC-03 | 2027-04-18 | 27 days (boundary) | **Case B:** May 15 charged; classes end **2027-06-14**; no charge on June 15 |
| CANC-04 | 2027-04-25 | 20 days | **Case B:** same as CANC-03 |
| CANC-05 | Any | — | The outcome (Case A or B, last charge date, last class date) is shown **before** the parent confirms, and in the confirmation email |
| CANC-06 | Case B, May 15 card declined | — | Subscription keeps `cancellation_pending`; retry follows BILL-04; no charge after May 15 cycle |
| CANC-07 | Notice spanning the DST change (N = 2027-04-10, request 2027-03-13) | 28 days | Case A (DST must not reduce the count to 27) |
| CANC-08 [Proposed] | Staff "cancel immediately" override | — | No further charges; override logged with staff user and reason |

### 3.6 Camps (Brief §3)

| ID | Steps | Expected result |
|---|---|---|
| CAMP-01 | Staff rename a theme | New name on the site and on future attendance sheets |
| CAMP-02 | Staff add a 5th theme / retire a theme | Retired theme hidden from new registrations but kept on past sheets |
| CAMP-03 | Attendance sheet filtered by day, then week, then theme, then age group | Correct children each time |
| CAMP-04 | Attendance sheet columns | Name, age, theme, parent phone, parent email, sign-in time & signature, sign-out time & signature |
| CAMP-05 | Bulk email to a camp filtered by theme + date | Recipient preview correct; one email per parent; send logged |

### 3.7 Medical Form (Brief §4)

| ID | Steps | Expected result |
|---|---|---|
| MED-01 | Parent enrols a child for the first time (PD Day Camp) | Pending medical record created (with empty fields); email with secure link sent; child shows `Pending` |
| MED-02 | Parent submits the form | Required fields enforced; status `Complete` on rosters and attendance sheets |
| MED-03 | Same child enrolled in a regular program later | No new email; status unchanged |
| MED-04 | Open an expired or altered token link | Rejected; no data shown |
| MED-05 | Staff click "Resend link" | New token emailed; old token invalid |
| MED-06 | Read the raw MongoDB document without the encryption key | Allergies, medical notes, emergency contacts, address are unreadable |
| MED-07 | Content Editor role requests a medical form via the API | `403` |

### 3.8 Filters, Gallery, Accounts

| ID | Steps | Expected result |
|---|---|---|
| FIL-01 | Staff create a new filter group "Location" with 2 options and tag products | Appears in sidebar; filtering works without a deploy |
| FIL-02 | Select Robotics + Coding (same group) and Ages 6-8 | Products that are (Robotics OR Coding) AND Ages 6-8 |
| FIL-03 | Delete an option used by 5 products | Confirmation shows "5 products"; tags removed |
| GAL-01 | Add entries dated 2026-07-22, 2025-03-01, 2026-01-10 | Displayed 2025-03-01, 2026-01-10, 2026-07-22 |
| ACC-01 | Guest checkout of a monthly program, then "Manage subscription" link | Guest can claim the account and cancel |
| ACC-02 | Password reset | Single-use, time-limited link; old sessions invalidated |
| ACC-03 | Order placed | Order SMS received; marketing SMS only if opted in; STOP stops marketing SMS |

---

## 4. Payment Integration Testing (sandbox)

Processor roles depend on [Decision D-1](README.md#5-pending-decisions).

- **PAY-01:** One-time purchase (camp) with test cards (approved, declined, 3-D Secure where supported). Webhook received, order created, receipt sent.
- **PAY-02:** Regular program checkout: card saved as a token, first charge approved, subscription created with correct anchor.
- **PAY-03:** Renewal decline handled as in BILL-04.
- **PAY-04:** Webhook with a wrong signature → `400`, nothing changed. Same webhook delivered twice → processed once.
- **PAY-05:** Browser network log shows card numbers sent only to the processor's domain, never to the STEMOTICS API.

---

## 5. Responsive Design, Accessibility & Performance

### 5.1 Devices & Browsers
- iPhone (Safari, current and previous iOS), Android (Chrome), iPad, Windows and macOS desktops (current Chrome, Edge, Firefox, Safari).

### 5.2 Accessibility (WCAG 2.1 AA)
- Automated checks with axe-core / Lighthouse on every page template.
- Contrast ≥ 4.5:1 for body text (check lime `#D9F293` combinations in particular).
- Full keyboard use: date picker, filters, cart, checkout, admin forms. Visible focus; ESC closes dialogs.
- Screen reader spot checks (NVDA on Windows, VoiceOver on iOS/macOS) for checkout and the medical form.

### 5.3 Performance
- LCP < 2.0 s and INP < 200 ms on mobile for home, course listing and product pages (see [Phase 08 §5](Phase-08-SEO-Security-Backups.md)).

---

## 6. Verification & Acceptance Criteria

- [ ] Content checklist (§2) signed off by STEMOTICS.
- [ ] All CAP, ROS, DATE, BILL and CANC tests automated and passing.
- [ ] CAMP, MED, FIL, GAL and ACC tests passing.
- [ ] Payment sandbox tests passing for the processors chosen in D-1.
- [ ] WCAG 2.1 AA checks and cross-device tests passing.
- [ ] Redirect map fully tested.
