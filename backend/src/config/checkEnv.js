// backend/src/checkEnv.js
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'NODE_ENV',
  'BREVO_SMTP_USER',
  'BREVO_SMTP_KEY'
];

const checkEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n==================================================');
    console.error(' [FATAL ERROR] MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach((variable) => console.error(`   - ${variable}`));
    console.error(' Application startup aborted.');
    console.error('==================================================\n');
    
    // Stop the process immediately if environment variables are missing[cite: 1]
    process.exit(1);
  }
};

export default checkEnv;