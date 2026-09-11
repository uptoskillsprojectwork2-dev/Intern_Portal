import test, { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';
import {
  formatDisplayDate,
  generateVerificationCode,
  generateDraftForRequest,
  getDraftCertificateById,
  updateDraftHtmlContent
} from '../src/services/certificateDraft.service.js';
import verifyAuth from '../src/middlewares/verifyAuth.js';
import requireAdmin from '../src/middlewares/requireAdmin.js';

describe('Day 3 Certificate Draft Unit & Service Tests', () => {

  describe('1. Date Formatting & Code Generators', () => {
    it('formats valid dates correctly into readable strings', () => {
      const formatted = formatDisplayDate('2026-06-15T00:00:00.000Z');
      assert.ok(formatted.includes('2026'));
      assert.ok(formatted.includes('June'));
      assert.ok(formatted.includes('15'));
    });

    it('handles null, undefined, or invalid dates gracefully', () => {
      assert.equal(formatDisplayDate(null), '');
      assert.equal(formatDisplayDate(undefined), '');
      assert.equal(formatDisplayDate('not-a-date'), '');
    });

    it('generates a secure verification code with correct prefix and entropy', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();
      assert.ok(code1.startsWith('VER-'), 'Code should start with VER-');
      assert.ok(code1.length >= 10, 'Code should have sufficient length');
      assert.notEqual(code1, code2, 'Generated codes should be unique');
    });
  });

  describe('2. Handlebars Template Compilation & Real Data Population', () => {
    it('populates all standard certificate placeholders accurately', () => {
      const rawTemplate = `
        <div class="cert">
          <h1>{{CertificateType}}</h1>
          <p>Presented to {{InternName}} (ID: {{InternCode}})</p>
          <p>Domain: {{Department}}</p>
          <p>Tenure: {{StartDate}} to {{EndDate}}</p>
          <p>Certificate No: {{CertificateNumber}} | Verification: {{VerificationCode}}</p>
          <p>Issued on {{IssueDate}}</p>
        </div>
      `;

      const data = {
        InternName: 'Jane Doe',
        CertificateNumber: 'CERT-2026-00042',
        Department: 'Machine Learning',
        StartDate: 'January 01, 2026',
        EndDate: 'June 30, 2026',
        IssueDate: 'July 01, 2026',
        InternCode: 'INT-9988',
        CertificateType: 'Internship Completion',
        VerificationCode: 'VER-ABC123XYZ'
      };

      const compiled = Handlebars.compile(rawTemplate);
      const rendered = compiled(data);

      assert.ok(rendered.includes('Jane Doe'), 'InternName was not populated');
      assert.ok(rendered.includes('CERT-2026-00042'), 'CertificateNumber was not populated');
      assert.ok(rendered.includes('Machine Learning'), 'Department was not populated');
      assert.ok(rendered.includes('January 01, 2026'), 'StartDate was not populated');
      assert.ok(rendered.includes('June 30, 2026'), 'EndDate was not populated');
      assert.ok(rendered.includes('July 01, 2026'), 'IssueDate was not populated');
      assert.ok(rendered.includes('INT-9988'), 'InternCode was not populated');
      assert.ok(rendered.includes('Internship Completion'), 'CertificateType was not populated');
      assert.ok(rendered.includes('VER-ABC123XYZ'), 'VerificationCode was not populated');
      assert.ok(!rendered.includes('{{'), 'Rendered output should have no unparsed placeholders');
    });
  });

  describe('3. Duplicate Draft Protection Logic', () => {
    it('returns existing certificate when request.certificateId is already populated', async () => {
      const mockCertId = new mongoose.Types.ObjectId();
      const existingCert = {
        _id: mockCertId,
        certificateNumber: 'CERT-2026-00001',
        status: 'draft',
        htmlContent: '<p>Existing Draft</p>'
      };

      // Mock Certificate.findById
      const originalFindById = mongoose.model('certificate').findById;
      mongoose.model('certificate').findById = (id) => {
        if (id.toString() === mockCertId.toString()) {
          return Promise.resolve(existingCert);
        }
        return Promise.resolve(null);
      };

      try {
        const mockRequest = {
          _id: new mongoose.Types.ObjectId(),
          certificateId: mockCertId,
          status: 'approved'
        };

        const result = await generateDraftForRequest(mockRequest, new mongoose.Types.ObjectId());
        assert.equal(result._id.toString(), mockCertId.toString());
        assert.equal(result.certificateNumber, 'CERT-2026-00001');
      } finally {
        mongoose.model('certificate').findById = originalFindById;
      }
    });
  });

  describe('4. Missing Template Protection', () => {
    it('throws controlled 404 error when active template is missing', async () => {
      const originalFindOne = mongoose.model('certificate_template').findOne;
      mongoose.model('certificate_template').findOne = () => Promise.resolve(null);

      try {
        const mockRequest = {
          _id: new mongoose.Types.ObjectId(),
          certificateType: 'non_existent_type',
          userId: {
            _id: new mongoose.Types.ObjectId(),
            fullName: 'Test Intern'
          }
        };

        await assert.rejects(
          async () => {
            await generateDraftForRequest(mockRequest, new mongoose.Types.ObjectId());
          },
          (err) => {
            assert.equal(err.statusCode, 404);
            assert.ok(err.message.includes('No active certificate template found'));
            return true;
          }
        );
      } finally {
        mongoose.model('certificate_template').findOne = originalFindOne;
      }
    });
  });

  describe('5. Draft Retrieval & Validation', () => {
    it('rejects invalid certificate ID format with 400', async () => {
      await assert.rejects(
        async () => {
          await getDraftCertificateById('invalid-mongo-id');
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.ok(err.message.includes('Invalid certificate ID'));
          return true;
        }
      );
    });

    it('returns 404 when certificate draft is not found', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const originalFindById = mongoose.model('certificate').findById;
      mongoose.model('certificate').findById = () => ({
        populate: () => ({
          populate: () => Promise.resolve(null)
        })
      });

      try {
        await assert.rejects(
          async () => {
            await getDraftCertificateById(validId);
          },
          (err) => {
            assert.equal(err.statusCode, 404);
            assert.ok(err.message.includes('not found'));
            return true;
          }
        );
      } finally {
        mongoose.model('certificate').findById = originalFindById;
      }
    });
  });

  describe('6. Draft HTML Modification & Non-Editable Protection', () => {
    it('rejects invalid certificate ID format for update with 400', async () => {
      await assert.rejects(
        async () => {
          await updateDraftHtmlContent('invalid-id', '<p>New HTML</p>');
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('rejects empty or whitespace-only updated HTML with 400', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      await assert.rejects(
        async () => {
          await updateDraftHtmlContent(validId, '   ');
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.ok(err.message.includes('non-empty string'));
          return true;
        }
      );
    });

    it('strictly prevents editing when certificate is finalized or non-draft', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const finalizedCert = {
        _id: validId,
        status: 'finalized',
        htmlContent: '<p>Final</p>'
      };

      const originalFindById = mongoose.model('certificate').findById;
      mongoose.model('certificate').findById = () => Promise.resolve(finalizedCert);

      try {
        await assert.rejects(
          async () => {
            await updateDraftHtmlContent(validId, '<p>Modified Content</p>');
          },
          (err) => {
            assert.equal(err.statusCode, 409);
            assert.ok(err.message.includes('only \'draft\' is editable'));
            return true;
          }
        );
      } finally {
        mongoose.model('certificate').findById = originalFindById;
      }
    });

    it('persists modified HTML content when certificate status is draft', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      let savedHtml = '';
      const draftCert = {
        _id: validId,
        status: 'draft',
        htmlContent: '<p>Old Content</p>',
        save: async function () {
          savedHtml = this.htmlContent;
          return this;
        }
      };

      const originalFindById = mongoose.model('certificate').findById;
      mongoose.model('certificate').findById = () => Promise.resolve(draftCert);

      try {
        const result = await updateDraftHtmlContent(validId, '<p>Updated Content</p>');
        assert.equal(result.htmlContent, '<p>Updated Content</p>');
        assert.equal(savedHtml, '<p>Updated Content</p>');
      } finally {
        mongoose.model('certificate').findById = originalFindById;
      }
    });
  });

  describe('7. Authentication & Admin Authorization Middlewares', () => {
    it('rejects unauthenticated requests with 401', () => {
      const req = { cookies: {}, headers: {} };
      let statusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => { responseBody = body; }
          };
        }
      };

      verifyAuth(req, res, () => {
        assert.fail('Should not call next() when unauthenticated');
      });

      assert.equal(statusCode, 401);
      assert.ok(responseBody.message);
    });

    it('rejects non-admin users with 403', async () => {
      const originalFindById = mongoose.model('user').findById;
      mongoose.model('user').findById = () => ({
        select: () => Promise.resolve({ role: 'intern' })
      });

      try {
        const req = { user: { id: '123', role: 'intern' } };
        let statusCode = null;
        let responseBody = null;
        const res = {
          status: (code) => {
            statusCode = code;
            return {
              json: (body) => { responseBody = body; }
            };
          }
        };

        await requireAdmin(req, res, () => {
          assert.fail('Should not call next() for non-admin user');
        });

        assert.equal(statusCode, 403);
        assert.ok(responseBody.message.includes('Admin access required'));
      } finally {
        mongoose.model('user').findById = originalFindById;
      }
    });

    it('permits admin users to proceed', async () => {
      const originalFindById = mongoose.model('user').findById;
      mongoose.model('user').findById = () => ({
        select: () => Promise.resolve({ role: 'admin' })
      });

      try {
        const req = { user: { id: 'admin-1', role: 'admin' } };
        let nextCalled = false;
        const res = {
          status: () => ({ json: () => {} })
        };

        await requireAdmin(req, res, () => {
          nextCalled = true;
        });

        assert.ok(nextCalled, 'next() must be called for admin users');
      } finally {
        mongoose.model('user').findById = originalFindById;
      }
    });
  });

  describe('8. Live MongoDB Environment Verification', () => {
    it('reports live MongoDB Atlas connection status truthfully', async (t) => {
      let isConnected = false;
      try {
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000
        });
        isConnected = true;
      } catch (err) {
        // As instructed: "Do not claim blocked tests passed."
        // Clearly record environment blockage
        t.diagnostic(`[ENVIRONMENT BLOCKED] MongoDB Atlas connection unreachable: ${err.message}`);
        t.skip(`BLOCKED: Live database tests cannot run without active MongoDB connection (${err.code || err.message})`);
        return;
      } finally {
        if (isConnected) {
          await mongoose.disconnect();
        }
      }
      assert.ok(isConnected, 'Live MongoDB is connected');
    });
  });
});
