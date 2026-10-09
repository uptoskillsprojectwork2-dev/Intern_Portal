import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import User from '../src/models/User.js';

// Setup DNS & env
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, 'templates');

/**
 * Extracts simple Handlebars placeholder keys from HTML content.
 */
const extractPlaceholders = (content) => {
  const matches = content.match(/\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
};

/**
 * Metadata configuration for each certificate type.
 */
const TEMPLATE_METADATA = [
  {
    templateCode: 'TPL-COMP-01',
    templateName: 'Internship Completion Certificate',
    certificateType: 'completion_certificate',
    title: 'Certificate of Internship Completion',
    description: 'Official verified credential for successful internship completion.',
    filename: 'completion_certificate.html'
  },
  {
    templateCode: 'TPL-BONA-01',
    templateName: 'Bonafide Certificate',
    certificateType: 'bonafide',
    title: 'Bonafide Certificate',
    description: 'Official bonafide verification issued for academic or administrative purposes.',
    filename: 'bonafide.html'
  },
  {
    templateCode: 'TPL-OFFER-01',
    templateName: 'Internship Offer Letter',
    certificateType: 'offer_letter',
    title: 'Internship Offer Letter',
    description: 'Formal internship offer letter with role description and onboarding details.',
    filename: 'offer_letter.html'
  },
  {
    templateCode: 'TPL-OJT-01',
    templateName: 'On-the-Job Training Certificate',
    certificateType: 'ojt_certificate',
    title: 'Certificate of On-the-Job Training',
    description: 'Official credential recognizing practical on-the-job training and skills development.',
    filename: 'ojt_certificate.html'
  },
  {
    templateCode: 'TPL-EXP-01',
    templateName: 'Internship Experience Letter',
    certificateType: 'experience_letter',
    title: 'Internship Experience Certificate',
    description: 'Formal letter detailing internship tenure, performance, and competencies achieved.',
    filename: 'experience_letter.html'
  },
  {
    templateCode: 'TPL-IOM-01',
    templateName: 'Intern of the Month Certificate',
    certificateType: 'intern_of_month',
    title: 'Intern of the Month Award',
    description: 'Prestigious award recognizing the highest achieving intern of the month.',
    filename: 'intern_of_the_month.html'
  },
  {
    templateCode: 'TPL-LEAG-01',
    templateName: 'League Winner Certificate',
    certificateType: 'league_winner',
    title: 'Championship League Winner',
    description: 'Distinguished honor for first-place winners and top performers in competitive league events.',
    filename: 'league_winner.html'
  },
  {
    templateCode: 'TPL-CUST-01',
    templateName: 'Custom Recognition Certificate',
    certificateType: 'custom',
    title: 'Certificate of Special Recognition',
    description: 'Bespoke certificate template for custom milestones, special awards, and merit honors.',
    filename: 'custom.html'
  }
];

export async function seedTemplates() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn('[SEED] MONGO_URI is not defined. Skipping DB seed execution.');
    return { success: false, reason: 'MONGO_URI not configured' };
  }

  try {
    console.log('[SEED] Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.findOne();
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of TEMPLATE_METADATA) {
      const filePath = path.join(templatesDir, item.filename);
      let content = '';

      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
      } else {
        console.warn(`[SEED] Template file not found: ${filePath}`);
        continue;
      }

      const placeholders = extractPlaceholders(content);

      // Upsert by certificateType (Task B requirement)
      const existing = await CertificateTemplate.findOne({
        certificateType: item.certificateType
      });

      if (!existing) {
        await CertificateTemplate.create({
          templateCode: item.templateCode,
          templateName: item.templateName,
          certificateType: item.certificateType,
          title: item.title,
          description: item.description,
          content,
          placeholders,
          status: 'active',
          version: 1,
          createdBy: admin ? admin._id : undefined
        });
        createdCount++;
        console.log(`[SEED] Created template for certificateType: '${item.certificateType}' (${item.templateCode})`);
      } else {
        existing.templateName = item.templateName;
        existing.title = item.title;
        existing.description = item.description;
        existing.content = content;
        existing.placeholders = placeholders;
        existing.status = 'active';
        existing.version = (existing.version || 1) + 1;
        if (admin && !existing.createdBy) {
          existing.createdBy = admin._id;
        }
        await existing.save();
        updatedCount++;
        console.log(`[SEED] Updated active template for certificateType: '${item.certificateType}' (${item.templateCode})`);
      }
    }

    console.log(`[SEED] Seeding completed successfully. Created: ${createdCount}, Updated: ${updatedCount}`);
    return { success: true, createdCount, updatedCount };
  } catch (err) {
    console.error(`[SEED] Seeding failed with error: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

// Auto-run when executed directly via CLI
if (process.argv[1] && (process.argv[1].endsWith('seedTemplates.js') || process.argv[1].endsWith('seedTemplates'))) {
  seedTemplates();
}
