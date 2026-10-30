import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import Certificate from '../src/models/Certificate.js';

dotenv.config();

function resolveMongoUri() {
  const configured = new URL(process.env.MONGO_URI);
  if (configured.protocol !== 'mongodb+srv:' || !process.env.MONGO_SEED_HOSTS) return process.env.MONGO_URI;

  const query = new URLSearchParams(configured.search);
  for (const [key, value] of new URLSearchParams(process.env.MONGO_SRV_OPTIONS || '')) {
    if (!query.has(key)) query.set(key, value);
  }
  if (!query.has('tls') && !query.has('ssl')) query.set('tls', 'true');
  const auth = configured.username
    ? `${configured.username}${configured.password ? `:${configured.password}` : ''}@`
    : '';
  const hosts = process.env.MONGO_SEED_HOSTS.split(',').map((host) => `${host.trim()}:27017`).join(',');
  return `mongodb://${auth}${hosts}${configured.pathname || '/'}?${query.toString()}`;
}

let connected = false;
try {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured.');
  if (!process.env.CERTIFICATE_BACKUP_PATH) throw new Error('Set CERTIFICATE_BACKUP_PATH to the backup destination.');
  const connection = mongoose.connect(resolveMongoUri(), { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  connection.catch(() => {});
  let connectionTimer;
  try {
    await Promise.race([
      connection,
      new Promise((_, reject) => { connectionTimer = setTimeout(() => reject(new Error('Database connection check timed out after 10 seconds.')), 10000); }),
    ]);
  } finally {
    clearTimeout(connectionTimer);
  }
  connected = true;

  const certificates = await Certificate.find({}).lean();
  const backup = {
    format: 'intern-portal-certificate-backup-v1',
    createdAt: new Date().toISOString(),
    documentCount: certificates.length,
    documents: certificates,
  };
  const backupPath = path.resolve(process.env.CERTIFICATE_BACKUP_PATH);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.writeFile(backupPath, JSON.stringify(backup), { flag: 'wx', mode: 0o600 });
  console.log(`Backed up ${certificates.length} certificate documents to ${backupPath}`);
} catch (error) {
  console.error(`Certificate backup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (connected) await mongoose.disconnect();
  else if (process.exitCode) process.exit(process.exitCode);
}
