export const REDACTION_VERSION = 'research-redaction-v1';
/** Defense in depth, not a claim of anonymity or exhaustive de-identification. */
export function redactResearch(text: string) {
  let redactions=0;
  const replace=()=>{redactions++;return '[redacted]';};
  const output=text
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,replace)
    .replace(/\b(?:sk-[a-z0-9_-]{12,}|AKIA[A-Z0-9]{16}|gh[pousr]_[a-zA-Z0-9]{12,}|Bearer\s+[a-zA-Z0-9._-]{12,})\b/gi,replace)
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,replace)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,replace)
    .replace(/(?:https?:\/\/|www\.)[^\s<>]+/gi,replace)
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,replace)
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g,replace)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
  return {text:output,redactions};
}
