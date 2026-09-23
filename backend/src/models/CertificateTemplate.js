import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    certificateType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // HTML template source.
    // Required only for HTML templates.
    htmlContent: {
      type: String,
      default: "",
    },

    // Template format: HTML or PDF.
    templateType: {
      type: String,
      enum: ["html", "pdf"],
      default: "html",
      index: true,
    },

    // Uploaded PDF template information.
    pdfPath: {
      type: String,
      default: "",
    },

    pdfUrl: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    // Kept for compatibility with the portal's earlier template model.
    templateCode: {
      type: String,
      trim: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    description: {
      type: String,
      trim: true,
    },

    placeholders: {
      type: [String],
      default: [],
    },

    logoPath: {
      type: String,
    },

    backgroundPath: {
      type: String,
    },

    signaturePath: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

certificateTemplateSchema.pre("save", async function () {
  if (!this.createdBy) return;

  const User = mongoose.model("user");

  const creator = await User.findById(this.createdBy).select("_id");

  if (!creator) {
    throw new Error(
      "createdBy does not reference an existing user"
    );
  }
});

const CertificateTemplate = mongoose.model(
  "certificate_template",
  certificateTemplateSchema
);

export default CertificateTemplate;