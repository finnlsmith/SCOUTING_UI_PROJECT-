#!/usr/bin/env node

/**
 * Pre-build environment variable validation script
 * 
 * This script validates that required environment variables are set
 * before building. Since 'prebuild' only runs before 'npm run build' 
 * (not before 'npm start'), we always validate - all builds require 
 * the environment variable to be set.
 * 
 * Note: This script runs BEFORE webpack compilation, so NODE_ENV might
 * not be set yet. We validate regardless because builds always need the env var.
 */

const requiredVars = {
  REACT_APP_BACKEND_URL: 'Backend API URL (e.g., https://your-api.com/api)'
};

const missing = [];

for (const [varName, description] of Object.entries(requiredVars)) {
  if (!process.env[varName] || process.env[varName].trim() === '') {
    missing.push({ name: varName, description });
  }
}

if (missing.length > 0) {
  console.error('\n❌ BUILD FAILED: Missing required environment variables\n');
  missing.forEach(({ name, description }) => {
    console.error(`  ✗ ${name}`);
    console.error(`    ${description}\n`);
  });
  console.error('Please set these environment variables before running npm run build.');
  console.error('Example:');
  console.error(`  ${missing[0].name}=https://your-api.com/api npm run build\n`);
  console.error('For local development, use: npm start (does not require env var)\n');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
  console.log(`   Backend URL: ${process.env.REACT_APP_BACKEND_URL}`);
}

