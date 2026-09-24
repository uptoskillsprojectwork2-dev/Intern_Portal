import mongoose from 'mongoose';

const certificateRequestSchema = new mongoose.Schema(
  {
    internId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user', // <--- CHANGED THIS to lowercase 'user'
      required: true
    },
    type: {
      type: String,
      required: true
    },
<<<<<<< HEAD
=======

    internCode: {
        type: String,
        required: true,
        index: true
    },

    certificateType: {
        type: String,
        required: true,
        trim: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_template"
    },

>>>>>>> origin/main
    reason: {
      type: String,
      required: true
    },
<<<<<<< HEAD
=======

    metadata: {
        type: Map,
        of: String,
        default: {}
    },

>>>>>>> origin/main
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    remarks: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user' // <--- CHANGED THIS to lowercase 'user'
    }
<<<<<<< HEAD
  },
  { timestamps: true }
=======
},
{
    timestamps: true
});

certificateRequestSchema.pre("save", async function () {
    const userModel = mongoose.model("user");

    const user = await userModel.findById(this.userId);
    if (!user) throw new Error("userId does not reference an existing user");

    if (this.templateId) {
        const certificateTemplateModel = mongoose.model("certificate_template");
        const template = await certificateTemplateModel.findById(this.templateId);
        if (!template) throw new Error("templateId does not reference an existing certificate template");
    }

    if (this.reviewedBy) {
        const reviewer = await userModel.findById(this.reviewedBy);
        if (!reviewer) throw new Error("reviewedBy does not reference an existing user");
    }

    if (this.certificateId) {
        const certificateModel = mongoose.model("certificate");
        const certificate = await certificateModel.findById(this.certificateId);
        if (!certificate) throw new Error("certificateId does not reference an existing certificate");
    }
});

const certificateRequestModel = mongoose.model(
    "certificate_request",
    certificateRequestSchema
>>>>>>> origin/main
);
export default mongoose.model('CertificateRequest', certificateRequestSchema);
