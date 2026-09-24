import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import connectToDB from '../src/config/database.js';
import CertificateTemplate from '../src/models/CertificateTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certificatesDir = path.resolve(__dirname, '../../Certificates');

const templateConfigs = {
  bonafide_certificate: {
    certificateType: 'bonafide',
    name: 'Bonafide Certificate',
    code: 'bonafide-professional-v1',
    mapping: {
      certificateNumber: 'CertificateNumber', studentName: 'InternName', organizationName: 'OrganizationName',
      programName: 'ProgramName', departmentName: 'DepartmentName', academicYear: 'AcademicYear',
      purpose: 'Purpose', issueDate: 'IssueDate', place: 'Place', authorizedName: 'AuthorizedName', designation: 'Designation'
    }
  },
  experience_letter1: {
    certificateType: 'experience_letter',
    name: 'Experience Letter - Classic',
    code: 'experience-letter-classic-v1',
    mapping: {
      certificateNumber: 'CertificateNumber', internName: 'InternName', organizationName: 'OrganizationName',
      internPosition: 'InternPosition', domain: 'Domain', startDate: 'StartDate', endDate: 'EndDate',
      issueDate: 'IssueDate', place: 'Place', managerName: 'ManagerName', hrSignature: 'HRSignature'
    }
  },
  experience_letter2: {
    certificateType: 'experience_letter_detailed',
    name: 'Experience Letter - Detailed',
    code: 'experience-letter-detailed-v1',
    mapping: {
      referenceID: 'ReferenceID', issueDate: 'IssueDate', internName: 'InternName', organizationName: 'OrganizationName',
      position: 'Position', department: 'Department', startDate: 'StartDate', endDate: 'EndDate', duration: 'Duration',
      domain: 'Domain', workMode: 'WorkMode', reportingManager: 'ReportingManager',
      authorizedPersonName: 'AuthorizedPersonName', designation: 'Designation', authorizedSignature: 'AuthorizedSignature',
      companyEmail: 'CompanyEmail', companyPhone: 'CompanyPhone', companyWebsite: 'CompanyWebsite',
      companyAddress: 'CompanyAddress', verificationURL: 'VerificationURL'
    }
  },
  intern_of_month: {
    certificateType: 'intern_of_month',
    name: 'Intern of the Month',
    code: 'intern-of-month-professional-v1',
    mapping: {
      certificateNumber: 'CertificateNumber', internName: 'InternName', domain: 'Domain', month: 'Month', year: 'Year',
      issueDate: 'IssueDate', place: 'Place', managerName: 'ManagerName', authorizedName: 'AuthorizedName', organizationName: 'OrganizationName'
    }
  },
  internship_completion: {
    certificateType: 'completion_certificate',
    name: 'Internship Completion Certificate',
    code: 'internship-completion-professional-v1',
    mapping: {
      certificateNumber: 'CertificateNumber', internName: 'InternName', domain: 'Domain', startDate: 'StartDate',
      endDate: 'EndDate', issueDate: 'IssueDate', place: 'Place', mentorName: 'MentorName', hrName: 'HRName',
      hrSignature: 'HRSignature', organizationName: 'OrganizationName'
    }
  },
  league_winner: {
    certificateType: 'league_winner',
    name: 'League Winner Certificate',
    code: 'league-winner-professional-v1',
    mapping: {
      certificateNumber: 'CertificateNumber', internName: 'InternName', leagueName: 'LeagueName', issueDate: 'IssueDate',
      place: 'Place', organizer: 'Organizer', authorizedName: 'AuthorizedName', organizationName: 'OrganizationName'
    }
  },
  offer_letter: {
    certificateType: 'offer_letter',
    name: 'Internship Offer Letter',
    code: 'offer-letter-professional-v1',
    mapping: {
      issueDate: 'IssueDate', offerNumber: 'OfferNumber', internName: 'InternName', organizationName: 'OrganizationName',
      position: 'Position', department: 'Department', startDate: 'StartDate', endDate: 'EndDate', duration: 'Duration',
      mode: 'Mode', location: 'Location', stipend: 'Stipend', reportingManager: 'ReportingManager',
      authorizedPerson: 'AuthorizedPerson', authorizedPosition: 'AuthorizedPosition'
    }
  },
  ojt_certificate: {
    certificateType: 'ojt_certificate',
    name: 'OJT Certificate',
    code: 'ojt-professional-v1',
    mapping: {
      certificateNumber: 'CertificateNumber', internName: 'InternName', domain: 'Domain', startDate: 'StartDate',
      endDate: 'EndDate', issueDate: 'IssueDate', place: 'Place', mentorName: 'MentorName', hrName: 'HRName',
      hrSignature: 'HRSignature', organizationName: 'OrganizationName'
    }
  }
};

const transformScript = (script, mapping) => {
  for (const [property, handlebarsName] of Object.entries(mapping)) {
    const pattern = new RegExp(`(\\b${property}\\s*:\\s*)(?:\\n\\s*)?["'](?:[^"']*)["']`, 'g');
    script = script.replace(pattern, `$1{{{json ${handlebarsName}}}}`);
  }
  return script;
};

const buildTemplateContent = (folder, config) => {
  const folderPath = path.join(certificatesDir, folder);
  let html = fs.readFileSync(path.join(folderPath, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(folderPath, 'style.css'), 'utf8');
  const script = transformScript(fs.readFileSync(path.join(folderPath, 'script.js'), 'utf8'), config.mapping);

  html = html
    .replace(/<link\s+rel=["']stylesheet["']\s+href=["'](?:\.\/)?style\.css["']\s*\/?>/gi, '')
    .replace(/<script\s+src=["'](?:\.\/)?script\.js["']\s*>\s*<\/script>/gi, '')
    .replace(/<script\s+src=["'](?:\.\/)?script\.js["']\s*\/?>/gi, '');

  html = html.replace('</head>', `\n<style>\n${css}\n</style>\n</head>`);
  html = html.replace('</body>', `\n<script>\n${script}\n</script>\n</body>`);

  // Fail early if a local asset reference was accidentally left behind.
  if (/href=["'](?:\.\/)?style\.css|src=["'](?:\.\/)?script\.js/i.test(html)) {
    throw new Error(`Local asset reference remains in ${folder}`);
  }

  // Compile once so malformed Handlebars syntax is caught before DB update.
  Handlebars.compile(html);
  return html;
};

const run = async () => {
  await connectToDB();

  for (const [folder, config] of Object.entries(templateConfigs)) {
    const content = buildTemplateContent(folder, config);

    await CertificateTemplate.findOneAndUpdate(
      { templateCode: config.code },
      {
        templateCode: config.code,
        templateName: config.name,
        certificateType: config.certificateType,
        title: config.name,
        description: `Imported from Certificates/${folder}`,
        content,
        placeholders: Object.values(config.mapping),
        status: 'active',
        version: 1
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Imported: ${config.name} (${config.certificateType})`);
  }

  console.log('All professional certificate templates imported successfully.');
  await import('mongoose').then(({ default: mongoose }) => mongoose.connection.close());
};

run().catch((error) => {
  console.error('Certificate template import failed:', error);
  process.exitCode = 1;
});
