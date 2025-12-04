#!/usr/bin/env node

/**
 * Generate JWT Keys Script
 *
 * Generates RSA key pairs for JWT signing and verification.
 * Run with: npm run generate:keys
 */

import { generateKeyPair, exportJWK } from 'jose';

async function generateKeys() {
  console.log('🔐 Generating RSA key pairs for JWT signing...\n');

  // Generate primary key pair
  console.log('Generating primary key pair...');
  const primary = await generateKeyPair('RS256');
  const primaryPrivateJWK = await exportJWK(primary.privateKey);
  const primaryPublicJWK = await exportJWK(primary.publicKey);

  // Add metadata
  const primaryKid = 'key-' + Date.now();
  primaryPrivateJWK.kid = primaryKid;
  primaryPublicJWK.kid = primaryKid;
  primaryPrivateJWK.alg = 'RS256';
  primaryPublicJWK.alg = 'RS256';
  primaryPrivateJWK.use = 'sig';
  primaryPublicJWK.use = 'sig';

  console.log('✅ Primary keys generated (kid: ' + primaryKid + ')\n');

  // Generate secondary key pair (for rotation)
  console.log('Generating secondary key pair (for rotation)...');
  const secondary = await generateKeyPair('RS256');
  const secondaryPrivateJWK = await exportJWK(secondary.privateKey);
  const secondaryPublicJWK = await exportJWK(secondary.publicKey);

  const secondaryKid = 'key-' + (Date.now() + 1);
  secondaryPrivateJWK.kid = secondaryKid;
  secondaryPublicJWK.kid = secondaryKid;
  secondaryPrivateJWK.alg = 'RS256';
  secondaryPublicJWK.alg = 'RS256';
  secondaryPrivateJWK.use = 'sig';
  secondaryPublicJWK.use = 'sig';

  console.log('✅ Secondary keys generated (kid: ' + secondaryKid + ')\n');

  // Print env vars
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Add these to your .env file:\n');
  console.log('# Primary Keys');
  console.log('JWT_PRIMARY_PRIVATE_KEY=' + JSON.stringify(primaryPrivateJWK));
  console.log('JWT_PRIMARY_PUBLIC_KEY=' + JSON.stringify(primaryPublicJWK));
  console.log('\n# Secondary Keys (for rotation)');
  console.log('JWT_SECONDARY_PRIVATE_KEY=' + JSON.stringify(secondaryPrivateJWK));
  console.log('JWT_SECONDARY_PUBLIC_KEY=' + JSON.stringify(secondaryPublicJWK));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('⚠️  IMPORTANT:');
  console.log('   - Keep private keys SECRET');
  console.log('   - Never commit .env to git');
  console.log('   - Backup your keys securely');
  console.log('   - Rotate keys periodically for security\n');
}

generateKeys().catch(console.error);
