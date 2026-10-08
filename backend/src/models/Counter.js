import mongoose from "mongoose";

/**
 * Counter model for atomic sequence generation.
 *
 * Each document represents a named counter (identified by _id).
 * The `seq` field is incremented atomically using findOneAndUpdate + $inc,
 * preventing duplicate sequence numbers under concurrent requests.
 *
 * Usage:
 *   import Counter from '../models/Counter.js';
 *   const counter = await Counter.findOneAndUpdate(
 *     { _id: 'certRequest' },
 *     { $inc: { seq: 1 } },
 *     { new: true, upsert: true }
 *   );
 *   // counter.seq is the new unique sequence number
 */
const counterSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    seq: {
        type: Number,
        default: 0
    }
});

const Counter = mongoose.model("counter", counterSchema);

export default Counter;
