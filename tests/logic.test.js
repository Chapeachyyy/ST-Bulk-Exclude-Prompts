import test from 'node:test';
import assert from 'node:assert/strict';
import { countStateChanges, getRangeFromFirst } from '../logic.js';

test('getRangeFromFirst returns null for an empty chat', () => {
    assert.equal(getRangeFromFirst(0, 0), null);
    assert.equal(getRangeFromFirst(5, -1), null);
    assert.equal(getRangeFromFirst(5, 1.5), null);
});

test('getRangeFromFirst returns null for invalid targets', () => {
    assert.equal(getRangeFromFirst(Number.NaN, 5), null);
    assert.equal(getRangeFromFirst(undefined, 5), null);
    assert.equal(getRangeFromFirst(null, 5), null);
    assert.equal(getRangeFromFirst('abc', 5), null);
    assert.equal(getRangeFromFirst('', 5), null);
});

test('getRangeFromFirst starts at the first message and ends at the target', () => {
    assert.deepEqual(getRangeFromFirst(0, 5), { start: 0, end: 0 });
    assert.deepEqual(getRangeFromFirst(3, 5), { start: 0, end: 3 });
});

test('getRangeFromFirst clamps the target to the chat bounds', () => {
    assert.deepEqual(getRangeFromFirst(-4, 5), { start: 0, end: 0 });
    assert.deepEqual(getRangeFromFirst(99, 5), { start: 0, end: 4 });
});

test('getRangeFromFirst truncates fractional targets', () => {
    assert.deepEqual(getRangeFromFirst(2.9, 5), { start: 0, end: 2 });
});

test('countStateChanges counts only messages whose state differs', () => {
    const chat = [
        { is_system: false },
        { is_system: true },
        { is_system: false },
        { is_system: false },
    ];
    assert.equal(countStateChanges(chat, 0, 3, true), 3);
    assert.equal(countStateChanges(chat, 0, 3, false), 1);
    assert.equal(countStateChanges(chat, 1, 1, true), 0);
});

test('countStateChanges handles non-array input and out-of-range bounds', () => {
    assert.equal(countStateChanges(null, 0, 3, true), 0);
    assert.equal(countStateChanges([{ is_system: false }], 0, 99, true), 1);
    assert.equal(countStateChanges([{ is_system: false }], -5, 0, true), 1);
    assert.equal(countStateChanges([], 0, 0, true), 0);
});
