// The security guard. If this regresses, /api/snapshot/run becomes an SSRF
// straight into the private network — so these run offline and deterministically,
// with no DNS dependency.

import test from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedAddress, assertPublicUrl, BlockedUrlError } from '../api/_lib/ssrf.ts';

test('blocks loopback, private, and link-local IPv4', () => {
  for (const ip of [
    '127.0.0.1', '127.255.255.254',
    '10.0.0.5', '10.255.255.255',
    '172.16.3.4', '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',   // cloud metadata — the one that matters most
    '0.0.0.0',
    '100.64.1.1',        // CGNAT
    '198.18.0.1',        // benchmarking
    '224.0.0.1',         // multicast
    '255.255.255.255',
  ]) {
    assert.equal(isBlockedAddress(ip), true, `${ip} must be blocked`);
  }
});

test('allows genuinely public IPv4', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '11.0.0.1']) {
    assert.equal(isBlockedAddress(ip), false, `${ip} must be allowed`);
  }
});

test('blocks private IPv6 including IPv4-mapped forms', () => {
  for (const ip of [
    '::1', '::',
    'fc00::1', 'fd00::1',        // unique local
    'fe80::1',                    // link-local
    'ff02::1',                    // multicast
    '::ffff:127.0.0.1',           // dotted IPv4-mapped
    '::ffff:7f00:1',              // hex IPv4-mapped loopback
    '::ffff:169.254.169.254',     // metadata via IPv6 mapping
    '64:ff9b::1',                 // NAT64
    '2001:db8::1',                // documentation
  ]) {
    assert.equal(isBlockedAddress(ip), true, `${ip} must be blocked`);
  }
});

test('allows public IPv6', () => {
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
});

test('non-IP input fails closed', () => {
  for (const s of ['', 'not-an-ip', 'example.com', '999.999.999.999']) {
    assert.equal(isBlockedAddress(s), true, `${s} must fail closed`);
  }
});

test('rejects non-http schemes', async () => {
  for (const u of ['file:///etc/passwd', 'gopher://127.0.0.1:6379/_INFO', 'ftp://example.com/', 'data:text/html,x']) {
    await assert.rejects(() => assertPublicUrl(u), BlockedUrlError, `${u} must be rejected`);
  }
});

test('rejects non-web ports', async () => {
  for (const u of ['http://example.com:22/', 'http://example.com:6379/', 'http://example.com:25/']) {
    await assert.rejects(() => assertPublicUrl(u), BlockedUrlError, `${u} must be rejected`);
  }
});

test('rejects literal private addresses without needing DNS', async () => {
  for (const u of [
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/',
    'http://192.168.0.1/admin',
    'http://[::1]/',
  ]) {
    await assert.rejects(() => assertPublicUrl(u), BlockedUrlError, `${u} must be rejected`);
  }
});

test('rejects encoded loopback bypasses', async () => {
  // Both of these are 127.0.0.1 wearing a hat. URL parsing normalises them to
  // the literal address, which is why the address check has to be the gate.
  for (const u of ['http://2130706433/', 'http://0x7f.0x0.0x0.0x1/', 'http://0177.0.0.1/']) {
    await assert.rejects(() => assertPublicUrl(u), BlockedUrlError, `${u} must be rejected`);
  }
});

test('rejects non-public hostnames before spending a DNS lookup', async () => {
  for (const u of [
    'http://localhost/',
    'http://localhost:8080/',
    'http://foo.localhost/',
    'http://printer.local/',
    'http://db.internal/',
    'http://svc.home.arpa/',
    'http://intranet/',   // no dot — cannot be a public name
  ]) {
    await assert.rejects(() => assertPublicUrl(u), BlockedUrlError, `${u} must be rejected`);
  }
});

test('accepts public literal addresses', async () => {
  for (const u of ['http://8.8.8.8/', 'https://93.184.216.34/path', 'http://[2606:4700:4700::1111]/']) {
    const parsed = await assertPublicUrl(u);
    assert.ok(parsed.href.length > 0);
  }
});

test('accepts standard web ports', async () => {
  for (const u of ['http://8.8.8.8/', 'https://8.8.8.8/', 'http://8.8.8.8:8080/', 'https://8.8.8.8:8443/']) {
    await assert.doesNotReject(() => assertPublicUrl(u));
  }
});

test('malformed URLs are rejected, not thrown as TypeError', async () => {
  for (const u of ['', 'not a url', 'http://', '///']) {
    await assert.rejects(() => assertPublicUrl(u), BlockedUrlError);
  }
});
