import { LMS_URL } from '@stemotics/shared';

// Site-wide contact details from the live site audit (Phase 01 §4).
// Stage 5 moves these into a staff-editable SiteSettings document; until then they are served
// from here so web/ already reads them through the API instead of hard-coding them.
export const siteDefaults = Object.freeze({
  name: 'STEMOTICS',
  phone: '+1 519-957-1073',
  email: 'info@stemotics.com',
  address: {
    street: '695 Bishop Street North, Unit #4, 2nd Floor',
    city: 'Cambridge',
    province: 'ON',
    postalCode: 'N3H 2K8'
  },
  lmsUrl: LMS_URL,
  social: {
    facebook: 'https://www.facebook.com/stemoticscanada/',
    twitter: 'https://twitter.com/stemotics',
    linkedin: 'https://www.linkedin.com/in/stemotics'
  }
});
