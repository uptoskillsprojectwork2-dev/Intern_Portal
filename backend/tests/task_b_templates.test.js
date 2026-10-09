import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';

// Target controllers, services, and validators
import {
  PLACEHOLDER_LIST,
  ALLOWED_CERTIFICATE_TYPES,
  getPlaceholders,
  getAllTemplates,
  getTemplateByType,
  getTemplateById,
  createTemplate,
  updateTemplate,
  activateTemplate,
  archiveTemplate
} from '../src/controllers/template.controller.js';

import {
  CERTIFICATE_TITLE_MAP,
  getCertificateTitle,
  renderCertificatePdf
} from '../src/services/certificate.service.js';

import CertificateTemplate from '../src/models/CertificateTemplate.js';
import User from '../src/models/User.js';
import packageJson from '../package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '..', 'seeds', 'templates');

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
};

test('Task B: Certificate Template Design and Visual Editor Test Suite', async (t) => {
  const origUserFindById = User.findById;
  User.findById = () => ({
    select: () => Promise.resolve({ _id: new mongoose.Types.ObjectId(), fullName: 'Admin' }),
    exec: () => Promise.resolve({ _id: new mongoose.Types.ObjectId(), fullName: 'Admin' })
  });

  t.after(() => {
    User.findById = origUserFindById;
  });

  // ============================================================================
  // 1. Template Files & Design Rules Verification
  // ============================================================================
  await t.test('1.1: All required template files exist in seeds/templates/', () => {
    const requiredTypes = [
      'completion_certificate.html',
      'bonafide.html',
      'offer_letter.html',
      'ojt_certificate.html',
      'experience_letter.html',
      'intern_of_the_month.html',
      'league_winner.html',
      'custom.html'
    ];

    for (const filename of requiredTypes) {
      const filePath = path.join(templatesDir, filename);
      assert.ok(fs.existsSync(filePath), `Template file missing: ${filename}`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.length > 500, `Template content is too small: ${filename}`);
    }
  });

  await t.test('1.2: Templates adhere to A4 landscape (1123 x 794 px) and ornamental border', () => {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      assert.ok(content.includes('1123'), `${file} must specify 1123px width`);
      assert.ok(content.includes('794'), `${file} must specify 794px height`);
      assert.ok(content.includes('border'), `${file} must specify decorative border`);
    }
  });

  await t.test('1.3: Templates include UPTOSKILL branding, Playfair Display & Inter fonts, and {{fullName}} underline', () => {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      assert.ok(content.includes('UPTO'), `${file} must contain UPTOSKILLS branding`);
      assert.ok(content.includes('Playfair+Display'), `${file} must import Playfair Display font`);
      assert.ok(content.includes('Inter'), `${file} must import Inter font`);
      assert.ok(content.includes('{{fullName}}'), `${file} must contain {{fullName}} placeholder`);
      assert.ok(content.includes('border-bottom'), `${file} must contain thin underline for recipient name`);
    }
  });

  await t.test('1.4: Templates include {{qrCodeUrl}} placeholder and seal/badge placeholder', () => {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      assert.ok(content.includes('{{qrCodeUrl}}'), `${file} must include {{qrCodeUrl}} placeholder`);
      assert.ok(content.includes('seal') || content.includes('badge'), `${file} must include seal/badge markup`);
    }
  });

  await t.test('1.5: All templates compile cleanly with Handlebars without syntax errors', () => {
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
      assert.doesNotThrow(() => {
        const compiled = Handlebars.compile(content);
        const rendered = compiled({
          fullName: 'Jane Doe',
          internCode: 'INT-9999',
          domain: 'Full Stack Web Development',
          startDate: '12 Jan 2026',
          endDate: '12 Apr 2026',
          issueDate: '15 Apr 2026',
          requestNumber: 'CERT-2026-00001',
          certificateTitle: 'Internship Completion Certificate',
          qrCodeUrl: 'https://example.com/qr.png'
        });
        assert.ok(rendered.includes('Jane Doe'));
      }, `Template ${file} threw during Handlebars compilation or execution`);
    }
  });

  await t.test('1.6: package.json script seed:templates points to node seeds/seedTemplates.js', () => {
    assert.equal(packageJson.scripts['seed:templates'], 'node seeds/seedTemplates.js');
  });

  // ============================================================================
  // 2. Placeholders & Mappers Verification
  // ============================================================================
  await t.test('2.1: GET /api/admin/templates/placeholders returns canonical list with required keys', () => {
    const res = mockRes();
    getPlaceholders({}, res);
    assert.equal(res.statusCode, 200);

    const keys = res.body.placeholders.map(p => p.key);
    assert.ok(keys.includes('{{fullName}}'));
    assert.ok(keys.includes('{{internCode}}'));
    assert.ok(keys.includes('{{domain}}'));
    assert.ok(keys.includes('{{startDate}}'));
    assert.ok(keys.includes('{{endDate}}'));
    assert.ok(keys.includes('{{issueDate}}'));
    assert.ok(keys.includes('{{requestNumber}}'));
    assert.ok(keys.includes('{{certificateTitle}}'));
    assert.ok(keys.includes('{{qrCodeUrl}}'));
  });

  await t.test('2.2: getCertificateTitle mapper correctly maps all certificate types to human-readable titles', () => {
    assert.equal(getCertificateTitle('completion_certificate'), 'Internship Completion Certificate');
    assert.equal(getCertificateTitle('bonafide'), 'Bonafide Certificate');
    assert.equal(getCertificateTitle('offer_letter'), 'Internship Offer Letter');
    assert.equal(getCertificateTitle('ojt_certificate'), 'On-the-Job Training Certificate');
    assert.equal(getCertificateTitle('experience_letter'), 'Experience Letter');
    assert.equal(getCertificateTitle('intern_of_month'), 'Intern of the Month Award');
    assert.equal(getCertificateTitle('intern_of_the_month'), 'Intern of the Month Award');
    assert.equal(getCertificateTitle('league_winner'), 'League Winner Certificate');
    assert.equal(getCertificateTitle('custom'), 'Certificate of Recognition');
  });

  // ============================================================================
  // 3. Validation Logic Verification
  // ============================================================================
  await t.test('3.1: Reject template create when {{fullName}} is missing from content', async () => {
    const origFindOne = CertificateTemplate.findOne;
    CertificateTemplate.findOne = () => Promise.resolve(null);

    try {
      const res = mockRes();
      await createTemplate({
        user: { id: new mongoose.Types.ObjectId().toString() },
        body: {
          templateCode: 'TPL-TEST-01',
          templateName: 'Test Template',
          certificateType: 'custom',
          title: 'Custom Title',
          content: '<div>Certificate without the required name placeholder</div>'
        }
      }, res);

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.message.includes('{{fullName}}'));
    } finally {
      CertificateTemplate.findOne = origFindOne;
    }
  });

  await t.test('3.2: Reject template create when content has unbalanced {{ }} brackets', async () => {
    const origFindOne = CertificateTemplate.findOne;
    CertificateTemplate.findOne = () => Promise.resolve(null);

    try {
      const res = mockRes();
      await createTemplate({
        user: { id: new mongoose.Types.ObjectId().toString() },
        body: {
          templateCode: 'TPL-TEST-02',
          templateName: 'Test Template',
          certificateType: 'custom',
          title: 'Custom Title',
          content: '<div>Certificate for {{fullName}} with unbalanced {{#if unclosed</div>'
        }
      }, res);

      assert.equal(res.statusCode, 400);
      assert.ok(
        res.body.message.toLowerCase().includes('unbalanced') ||
        res.body.message.toLowerCase().includes('handlebars') ||
        res.body.message.toLowerCase().includes('syntax')
      );
    } finally {
      CertificateTemplate.findOne = origFindOne;
    }
  });

  await t.test('3.3: Reject template update when updated content is missing {{fullName}}', async () => {
    const origFindById = CertificateTemplate.findById;
    CertificateTemplate.findById = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      status: 'draft',
      save: () => Promise.resolve()
    });

    try {
      const res = mockRes();
      await updateTemplate({
        user: { id: new mongoose.Types.ObjectId().toString() },
        params: { id: new mongoose.Types.ObjectId().toString() },
        body: {
          content: '<div>Missing required placeholder completely</div>'
        }
      }, res);

      assert.equal(res.statusCode, 400);
      assert.ok(res.body.message.includes('{{fullName}}'));
    } finally {
      CertificateTemplate.findById = origFindById;
    }
  });

  await t.test('3.4: Reject template update when content has unbalanced brackets', async () => {
    const origFindById = CertificateTemplate.findById;
    CertificateTemplate.findById = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      status: 'draft',
      save: () => Promise.resolve()
    });

    try {
      const res = mockRes();
      await updateTemplate({
        user: { id: new mongoose.Types.ObjectId().toString() },
        params: { id: new mongoose.Types.ObjectId().toString() },
        body: {
          content: '<div>{{fullName}} {{#with missing_close}}</div>'
        }
      }, res);

      assert.equal(res.statusCode, 400);
    } finally {
      CertificateTemplate.findById = origFindById;
    }
  });

  // ============================================================================
  // 4. Admin Template CRUD API Logic
  // ============================================================================
  await t.test('4.1: getAllTemplates returns templates list without content payload', async () => {
    const origFind = CertificateTemplate.find;
    CertificateTemplate.find = () => ({
      select: () => ({
        populate: () => ({
          sort: () => Promise.resolve([
            { _id: new mongoose.Types.ObjectId(), templateCode: 'TPL-COMP-01', certificateType: 'completion_certificate' }
          ])
        })
      })
    });

    try {
      const res = mockRes();
      await getAllTemplates({ query: {} }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.templates.length, 1);
      assert.equal(res.body.total, 1);
    } finally {
      CertificateTemplate.find = origFind;
    }
  });

  await t.test('4.2: getTemplateByType returns active template', async () => {
    const origFindOne = CertificateTemplate.findOne;
    CertificateTemplate.findOne = () => ({
      populate: () => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        certificateType: 'completion_certificate',
        status: 'active',
        content: '<div>{{fullName}}</div>'
      })
    });

    try {
      const res = mockRes();
      await getTemplateByType({ params: { certificateType: 'completion_certificate' } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.template.certificateType, 'completion_certificate');
    } finally {
      CertificateTemplate.findOne = origFindOne;
    }
  });

  await t.test('4.3: activateTemplate deactivates sibling templates and activates target', async () => {
    let deactivated = false;
    let activated = false;

    const origFindById = CertificateTemplate.findById;
    const origUpdateMany = CertificateTemplate.updateMany;

    CertificateTemplate.findById = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      certificateType: 'offer_letter',
      status: 'draft',
      content: '<div>Valid template with {{fullName}}</div>',
      save: () => {
        activated = true;
        return Promise.resolve();
      }
    });

    CertificateTemplate.updateMany = () => {
      deactivated = true;
      return Promise.resolve();
    };

    try {
      const res = mockRes();
      await activateTemplate({
        user: { id: new mongoose.Types.ObjectId().toString() },
        params: { id: new mongoose.Types.ObjectId().toString() }
      }, res);

      assert.equal(res.statusCode, 200);
      assert.ok(deactivated, 'Sibling templates should be deactivated');
      assert.ok(activated, 'Target template should be saved as active');
    } finally {
      CertificateTemplate.findById = origFindById;
      CertificateTemplate.updateMany = origUpdateMany;
    }
  });

  // ============================================================================
  // 5. PDF Rendering Safety & Parameters
  // ============================================================================
  await t.test('5.1: renderCertificatePdf rejects empty or non-string htmlContent with 400', async () => {
    await assert.rejects(
      async () => renderCertificatePdf(''),
      (err) => err.statusCode === 400
    );

    await assert.rejects(
      async () => renderCertificatePdf(null),
      (err) => err.statusCode === 400
    );
  });
});
