import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectToDB from '../src/config/database.js';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import { mapCertificateTitle } from '../src/services/certificate.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, 'templates');

const templateConfigs = [
  {
    type: 'offer_letter',
    file: 'offer_letter.html',
    code: 'tpl-offer-letter-v1',
    name: 'Internship Offer Letter',
    description: 'Executive navy and gold internship offer letter for incoming candidates.'
  },
  {
    type: 'bonafide',
    file: 'bonafide.html',
    code: 'tpl-bonafide-v1',
    name: 'Bonafide Certificate',
    description: 'Official verified bonafide certificate for academic or institutional verification.'
  },
  {
    type: 'ojt_certificate',
    file: 'ojt_certificate.html',
    code: 'tpl-ojt-certificate-v1',
    name: 'OJT Certificate',
    description: 'Accredited certificate verifying completion of On-The-Job Training.'
  },
  {
    type: 'experience_letter',
    file: 'experience_letter.html',
    code: 'tpl-experience-letter-v1',
    name: 'Experience Letter',
    description: 'Formal corporate experience letter validating tenure, role and accomplishments.'
  },
  {
    type: 'completion_certificate',
    file: 'completion_certificate.html',
    code: 'tpl-completion-certificate-v1',
    name: 'Internship Completion Certificate',
    description: 'Prestige gold and navy certificate of completion for successful interns.'
  },
  {
    type: 'intern_of_month',
    file: 'intern_of_month.html',
    code: 'tpl-intern-of-month-v1',
    name: 'Intern of the Month Certificate',
    description: 'Special recognition award for standout top-performing interns.'
  },
  {
    type: 'league_winner',
    file: 'league_winner.html',
    code: 'tpl-league-winner-v1',
    name: 'League Winner Certificate',
    description: 'Championship honor certificate for hackathon and league champions.'
  },
  {
    type: 'custom',
    file: 'custom.html',
    code: 'tpl-custom-v1',
    name: 'Certificate of Achievement',
    description: 'Flexible custom achievement and honorary citation template.'
  }
];

const standardPlaceholders = [
  '{{fullName}}',
  '{{internCode}}',
  '{{domain}}',
  '{{startDate}}',
  '{{endDate}}',
  '{{issueDate}}',
  '{{requestNumber}}',
  '{{certificateTitle}}',
  '{{qrCodeUrl}}'
];

export const seedTemplates = async () => {
  await connectToDB();

  console.log(`Seeding ${templateConfigs.length} professionally designed templates...`);

  for (const config of templateConfigs) {
    const filePath = path.join(templatesDir, config.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template file not found: ${filePath}`);
    }

    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const title = mapCertificateTitle(config.type);

    // Upsert by certificateType as required
    await CertificateTemplate.findOneAndUpdate(
      { certificateType: config.type },
      {
        templateCode: config.code,
        templateName: config.name,
        certificateType: config.type,
        title: title || config.name,
        description: config.description,
        content: htmlContent,
        placeholders: standardPlaceholders,
        status: 'active',
        version: 1
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`✓ Seeded template: ${config.name} (${config.type})`);
  }

  console.log('All 8 professional certificate templates seeded successfully.');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedTemplates()
    .then(async () => {
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Failed to seed templates:', err);
      try {
        await mongoose.connection.close();
      } catch {}
      process.exit(1);
    });
}
