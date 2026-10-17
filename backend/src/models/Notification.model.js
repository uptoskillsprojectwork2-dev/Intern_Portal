import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "REQUEST_SUBMITTED",
        "REQUEST_FORWARDED",
        "REQUEST_REJECTED",
        "REQUEST_APPROVED",
        "CERTIFICATE_SENT",
        "ARCHIVE_WARNING",
      ],
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "certificate_request",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index as requested in the specification
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Avoid mongoose OverwriteModelError in hot reload environments
const Notification =
  mongoose.models.notification ||
  mongoose.model("notification", notificationSchema);

export default Notification;
