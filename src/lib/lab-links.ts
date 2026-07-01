// One source of truth for the Field Lab's outbound links. Workshops live on the
// events site; subscribe is the publication; submit is an external form.
export const EVENTS_URL = 'https://events.theairuntime.com';
export const WORKSHOPS_URL = 'https://events.theairuntime.com/boston';
export const PUBLICATION_URL = 'https://theairuntime.com';
export const SUBSCRIBE_URL = 'https://theairuntime.com/subscribe';

// The hiring / partner inbound. One channel, a mailto, no form.
export const CONTACT_EMAIL = 'info@theairuntime.com';

// The Airtable intake FORMS, embedded on /submit. These must be form share
// links (Form view > Share form > Embed), never view share links: a view
// embed exposes every submitted record, including emails, to the public.
// Each path degrades to a mailto CTA while its URL is empty.
export const SUBMIT_FORM_URL = '';
export const FIELD_NOTE_FORM_URL = '';
