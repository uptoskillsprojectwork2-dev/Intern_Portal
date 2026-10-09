import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import User from '../src/models/User.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, 'templates');

const templatePlaceholders = [
    'fullName', 'internCode', 'domain', 'startDate', 'endDate',
    'issuedDate', 'requestNumber', 'certificateTitle', 'qrCodeUrl'
];

export async function seedAllTemplates() {
  try {
    if (!process.env.MONGO_URI) {
      console.log('[SEED] MONGO_URI not set.');
      return { success: false, reason: 'MONGO_URI not set' };
    }

    console.log('[SEED] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const admin = await User.findOne({ role: 'admin' });

    let createdCount = 0;
    let updatedCount = 0;

    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const type = file.replace('.html', '');
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');

      const existing = await CertificateTemplate.findOne({ certificateType: type });

      if (!existing) {
        await CertificateTemplate.create({
          templateCode: `TPL-${type.toUpperCase().substring(0,4)}-01`,
          templateName: `Template for ${type}`,
          certificateType: type,
          title: `Certificate for ${type}`,
          description: `Automatically seeded template for ${type}`,
          placeholders: templatePlaceholders,
          status: 'active',
          version: 1,
          content: content,
          createdBy: admin ? admin._id : undefined
        });
        createdCount++;
        console.log(`[SEED] Created template: ${type}`);
      } else {
        existing.content = content;
        existing.placeholders = templatePlaceholders;
        existing.status = 'active';
        await existing.save();
        updatedCount++;
        console.log(`[SEED] Updated active template: ${type}`);
      }
    }

    console.log(`[SEED] Template seeding finished. Created: ${createdCount}, Updated: ${updatedCount}`);
    return { success: true, createdCount, updatedCount };
  } catch (err) {
    console.error(`[SEED] Seeding error: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('seedTemplates.js')) {
  seedAllTemplates();
}
