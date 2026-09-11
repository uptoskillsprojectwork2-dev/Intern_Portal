import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import User from '../src/models/User.js';

dotenv.config();

const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{CertificateType}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #ffffff;
      color: #1e293b;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 40px;
    }
    .cert-card {
      width: 800px;
      padding: 48px;
      border: 8px double #3b82f6;
      border-radius: 16px;
      text-align: center;
      background: radial-gradient(circle at top right, #f8fafc, #ffffff);
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      position: relative;
    }
    .cert-header { margin-bottom: 24px; }
    .cert-header h1 {
      font-size: 32px;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .cert-header p {
      font-size: 14px;
      color: #64748b;
      margin-top: 6px;
    }
    .cert-body { margin: 32px 0; font-size: 16px; line-height: 1.8; }
    .cert-recipient {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      text-decoration: underline;
      margin: 12px 0;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      font-size: 13px;
      color: #475569;
    }
    .cert-badge {
      display: inline-block;
      padding: 6px 14px;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 999px;
      font-weight: 600;
      font-size: 12px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="cert-card">
    <div class="cert-header">
      <h1>Certificate of {{CertificateType}}</h1>
      <p>UPTOSKILLS INTERNSHIP PROGRAM</p>
    </div>
    <div class="cert-body">
      <p>This is proudly presented to</p>
      <div class="cert-recipient">{{InternName}}</div>
      <p>in recognition of successful participation and contributions in the <strong>{{Department}}</strong> domain.</p>
      <div class="cert-badge">Tenure: {{StartDate}} – {{EndDate}}</div>
    </div>
    <div class="cert-footer">
      <div>
        <strong>Issue Date:</strong> {{IssueDate}}<br />
        <strong>Intern Code:</strong> {{InternCode}}
      </div>
      <div>
        <strong>Certificate No:</strong> {{CertificateNumber}}<br />
        <strong>Verification:</strong> {{VerificationCode}}
      </div>
    </div>
  </div>
</body>
</html>`;

async function seedTemplates() {
  try {
    if (!process.env.MONGO_URI) {
      console.log('[SEED] MONGO_URI is not set in environment.');
      return;
    }

    console.log('[SEED] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });

    const admin = await User.findOne({ role: 'admin' });

    const templates = [
      {
        templateCode: 'TPL-COMPLETION-01',
        templateName: 'Standard Completion Certificate',
        certificateType: 'completion_certificate',
        title: 'Certificate of Internship Completion',
        description: 'Default template for successful internship completion.',
        content: sampleHtml,
        placeholders: [
          'InternName',
          'CertificateNumber',
          'Department',
          'StartDate',
          'EndDate',
          'IssueDate',
          'InternCode',
          'CertificateType',
          'VerificationCode'
        ],
        status: 'active',
        version: 1,
        createdBy: admin ? admin._id : undefined
      },
      {
        templateCode: 'TPL-OFFER-01',
        templateName: 'Standard Offer Letter',
        certificateType: 'offer_letter',
        title: 'Internship Offer Letter',
        description: 'Default template for internship offer letters.',
        content: sampleHtml,
        placeholders: [
          'InternName',
          'CertificateNumber',
          'Department',
          'StartDate',
          'EndDate',
          'IssueDate',
          'InternCode',
          'CertificateType',
          'VerificationCode'
        ],
        status: 'active',
        version: 1,
        createdBy: admin ? admin._id : undefined
      }
    ];

    for (const tpl of templates) {
      const existing = await CertificateTemplate.findOne({ templateCode: tpl.templateCode });
      if (!existing) {
        await CertificateTemplate.create(tpl);
        console.log(`[SEED] Created template: ${tpl.templateCode} (${tpl.certificateType})`);
      } else {
        existing.status = 'active';
        existing.content = tpl.content;
        await existing.save();
        console.log(`[SEED] Updated active template: ${tpl.templateCode}`);
      }
    }

    console.log('[SEED] Template seeding finished.');
  } catch (err) {
    console.log(`[SEED] Could not complete template seeding: ${err.message}`);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedTemplates();
