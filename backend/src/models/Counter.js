import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true
    },
    seq: {
      type: Number,
      default: 0,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Counter = mongoose.models.Counter || mongoose.models.counter || mongoose.model('Counter', counterSchema);
mongoose.models.counter = Counter;

export default Counter;
