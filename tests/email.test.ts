// The gate's validation. Two failure modes matter and they pull in opposite
// directions: letting fakes through makes the warm list worthless, and rejecting
// real owners costs actual money. The role-address cases below are the ones
// most email validators get wrong.

import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyEmail, verifyName } from '../api/_lib/email.ts';

test('rejects malformed addresses', async () => {
  for (const e of ['', 'notanemail', 'a@', '@b.com', 'a b@c.com', 'a@b', 'a@@b.com', 'a..b@c.com']) {
    const v = await verifyEmail(e);
    assert.equal(v.ok, false, `${e} must be rejected`);
    assert.ok(v.reason, 'a rejection must explain itself to the visitor');
  }
});

test('rejects disposable providers', async () => {
  for (const e of ['x@mailinator.com', 'y@guerrillamail.com', 'z@10minutemail.com', 'q@yopmail.com']) {
    const v = await verifyEmail(e);
    assert.equal(v.ok, false, `${e} must be rejected`);
  }
});

test('rejects placeholder locals and domains', async () => {
  for (const e of ['test@test.com', 'asdf@asdf.com', 'a@a.com', 'foo@example.com', 'user@domain.com']) {
    const v = await verifyEmail(e);
    assert.equal(v.ok, false, `${e} must be rejected`);
  }
});

test('ACCEPTS role addresses — these are real SMB owner inboxes', async () => {
  // Blocking these would reject exactly the buyers this business wants. An
  // HVAC shop's real inbox is very often info@ or office@.
  for (const e of ['info@orellanalandscaping.com', 'office@acmehvac.com', 'service@plumbers.com', 'sales@roofing.com']) {
    const v = await verifyEmail(e);
    assert.equal(v.ok, true, `${e} must be ACCEPTED — role addresses are real buyers`);
  }
});

test('accepts ordinary business addresses', async () => {
  for (const e of ['alex@campos.works', 'j.smith@some-company.co.uk', "o'brien@firm.com", 'a+tag@gmail.com']) {
    const v = await verifyEmail(e);
    assert.equal(v.ok, true, `${e} must be accepted`);
  }
});

test('normalises for dedup without altering what is stored', async () => {
  const a = await verifyEmail('Alex.Campos+snapshot@Gmail.com');
  assert.equal(a.ok, true);
  // Stored address keeps its shape (lowercased); dedup key collapses aliasing.
  assert.equal(a.email, 'alex.campos+snapshot@gmail.com');
  assert.equal(a.dedupKey, 'alexcampos@gmail.com');

  const b = await verifyEmail('alexcampos@gmail.com');
  assert.equal(b.dedupKey, a.dedupKey, 'gmail dots and plus-tags must collapse to one person');
});

test('plus-tagging collapses on non-gmail too, but dots do not', async () => {
  const a = await verifyEmail('billing+xyz@acme.com');
  const b = await verifyEmail('billing@acme.com');
  assert.equal(a.dedupKey, b.dedupKey);

  const c = await verifyEmail('first.last@acme.com');
  assert.notEqual(c.dedupKey, 'firstlast@acme.com', 'dots are significant outside gmail');
});

test('googlemail is treated as gmail', async () => {
  const a = await verifyEmail('someone@googlemail.com');
  assert.equal(a.dedupKey, 'someone@gmail.com');
});

test('rejects absurd lengths', async () => {
  const long = 'a'.repeat(70) + '@example-business.com';
  assert.equal((await verifyEmail(long)).ok, false, 'local part over 64 chars is invalid');
  assert.equal((await verifyEmail('a@' + 'b'.repeat(300) + '.com')).ok, false);
});

test('non-string input does not throw', async () => {
  for (const bad of [null, undefined, 42, {}, []]) {
    const v = await verifyEmail(bad);
    assert.equal(v.ok, false);
  }
});

test('name validation is light but catches placeholders', () => {
  assert.equal(verifyName('Alex Campos').ok, true);
  assert.equal(verifyName('  Jo   Smith ').name, 'Jo Smith', 'whitespace is collapsed');
  assert.equal(verifyName('X').ok, false, 'single character is not a name');
  assert.equal(verifyName('test').ok, false);
  assert.equal(verifyName('asdf').ok, false);
  assert.equal(verifyName('http://spam.com').ok, false, 'links in a name field are spam');
  assert.equal(verifyName(null).ok, false);
});
