import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "certificate_request",
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "certificate_template",
      required: true,
      index: true,
    },

    htmlContent: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "draft",
      index: true,
    },

    fileUrl: {
      type: String,
    },

    emailSentAt: {
      type: Date,
    },

    // Optional metadata retained for the later PDF/finalization phase.
    certificateNumber: { type: String, unique: true, sparse: true, trim: true },
    internCode: { type: String, index: true },
    certificateType: { type: String, trim: true },
    domain: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    issuedDate: { type: Date },
    pdfPath: { type: String },
    verificationCode: { type: String, unique: true, sparse: true, trim: true, index: true },
    qrCodePath: { type: String },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

const Certificate = mongoose.model("certificate", certificateSchema);

export default Certificate;
