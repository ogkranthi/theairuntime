import { it,expect } from 'vitest';
import { redactResearch } from './research-redaction';
it('removes known identifiers, credentials and URLs without calling records anonymous',()=>{
 const source='Contact alice@example.invalid +1 (555) 123-4567 at https://private.invalid/path 192.168.10.1. Bearer abcdefghijklmnop ghp_1234567890123456';
 const result=redactResearch(source);expect(result.redactions).toBeGreaterThanOrEqual(6);expect(result.text).not.toContain('alice@');expect(result.text).not.toContain('private.invalid');expect(result.text).not.toContain('192.168');expect(result.text).not.toContain('ghp_');
});
it('preserves technical content and redacts multiline keys and JWTs',()=>{
 const result=redactResearch('Use a stable idempotency key.\n-----BEGIN PRIVATE KEY-----\nprivate material\n-----END PRIVATE KEY----- eyJheader.payload.signature');
 expect(result.text).toContain('stable idempotency key');expect(result.text).not.toContain('private material');expect(result.text).not.toContain('eyJheader');
});
