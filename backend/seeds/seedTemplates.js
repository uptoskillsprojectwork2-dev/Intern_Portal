import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import { PLACEHOLDERS } from '../src/controllers/template.controller.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateMetadata = [
  {
    templateCode: 'TPL-OFFER-01',
    templateName: 'Internship Offer Letter',
    certificateType: 'offer_letter',
    title: 'Internship Offer Letter',
    description: 'Official template for internship offer letters.',
    file: 'offer_letter.html'
  },
  {
    templateCode: 'TPL-BONA-01',
    templateName: 'Bonafide Certificate',
    certificateType: 'bonafide',
    title: 'Bonafide Certificate of Internship',
    description: 'Official bonafide certification verifying active internship status.',
    file: 'bonafide.html'
  },
  {
    templateCode: 'TPL-OJT-01',
    templateName: 'On-the-Job Training Certificate',
    certificateType: 'ojt',
    title: 'On-the-Job Training Certificate',
    description: 'Certificate awarded upon completion of OJT program.',
    file: 'ojt.html'
  },
  {
    templateCode: 'TPL-EXP-01',
    templateName: 'Internship Experience Letter',
    certificateType: 'experience_letter',
    title: 'Internship Experience Letter',
    description: 'Formal experience letter certifying intern service tenure.',
    file: 'experience_letter.html'
  },
  {
    templateCode: 'TPL-COMP-01',
    templateName: 'Internship Completion Certificate',
    certificateType: 'completion_certificate',
    title: 'Certificate of Internship Completion',
    description: 'Verified credential for successful internship completion.',
    file: 'completion.html'
  },
  {
    templateCode: 'TPL-IOM-01',
    templateName: 'Intern of the Month Certificate',
    certificateType: 'intern_of_the_month',
    title: 'Intern of the Month Award',
    description: 'Recognition certificate awarded to top monthly intern performer.',
    file: 'intern_of_the_month.html'
  },
  {
    templateCode: 'TPL-WIN-01',
    templateName: 'League Winner Certificate',
    certificateType: 'league_winner',
    title: 'League Winner Award Certificate',
    description: 'Award certificate for innovation league winners.',
    file: 'league_winner.html'
  },
  {
    templateCode: 'TPL-CUST-01',
    templateName: 'Custom Certificate',
    certificateType: 'custom',
    title: 'Custom Certificate',
    description: 'Generic customizable certificate template.',
    file: 'custom.html'
  }
];

export const seedTemplates = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uptoskill';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for template seeding.');
  }

  const defaultPlaceholders = PLACEHOLDERS.map(p => p.key);

  for (const meta of templateMetadata) {
    const htmlPath = path.join(__dirname, 'templates', meta.file);
    if (!fs.existsSync(htmlPath)) {
      console.warn(`Template HTML file missing: ${htmlPath}`);
      continue;
    }

    const content = fs.readFileSync(htmlPath, 'utf8');

    await CertificateTemplate.findOneAndUpdate(
      { certificateType: meta.certificateType },
      {
        templateCode: meta.templateCode,
        templateName: meta.templateName,
        certificateType: meta.certificateType,
        title: meta.title,
        description: meta.description,
        content,
        placeholders: defaultPlaceholders,
        status: 'active',
        version: 1
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Also seed completion alias if applicable
    if (meta.certificateType === 'completion_certificate') {
      await CertificateTemplate.findOneAndUpdate(
        { certificateType: 'completion' },
        {
          templateCode: 'TPL-COMP-02',
          templateName: 'Internship Completion Certificate (Alias)',
          certificateType: 'completion',
          title: meta.title,
          description: meta.description,
          content,
          placeholders: defaultPlaceholders,
          status: 'active',
          version: 1
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    console.log(`Seeded template for type: ${meta.certificateType}`);
  }

  console.log('Template seeding completed successfully.');
};

if (process.argv[1] && process.argv[1].endsWith('seedTemplates.js')) {
  seedTemplates()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
