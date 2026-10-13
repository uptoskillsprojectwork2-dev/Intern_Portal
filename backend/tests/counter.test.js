import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Counter from '../src/models/Counter.js';
import { generateRequestNumber } from '../src/controllers/intern.controller.js';

test('Counter model - atomic sequence generation', async (t) => {
    await t.test('Counter.findByIdAndUpdate returns incremented sequence', async () => {
        const originalFindByIdAndUpdate = Counter.findByIdAndUpdate;
        let callCount = 0;

        Counter.findByIdAndUpdate = async (_id, update, options) => {
            callCount++;
            assert.equal(_id, 'certRequest:2026');
            assert.deepEqual(update, { $inc: { seq: 1 } });
            assert.equal(options.returnDocument, 'after');
            assert.equal(options.upsert, true);
            return { seq: callCount };
        };

        try {
            const num1 = await generateRequestNumber();
            const num2 = await generateRequestNumber();
            assert.match(num1, /^CERT-2026-\d{5}$/);
            assert.match(num2, /^CERT-2026-\d{5}$/);
            assert.notEqual(num1, num2);
        } finally {
            Counter.findByIdAndUpdate = originalFindByIdAndUpdate;
        }
    });
});
