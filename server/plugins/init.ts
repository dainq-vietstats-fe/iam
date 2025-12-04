/**
 * Initialization Plugin
 *
 * Initialize tất cả services khi Nitro server khởi động.
 * Chạy trước khi server accept requests.
 */

import { envConfig } from '../config/env.config';
import { jwkService } from '../services/jwk.service';
import { DirectusDbService } from '../services/directusDb.service';

export default defineNitroPlugin(async (nitroApp) => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🚀 FIDT Identity Service - Starting up...');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Load environment configuration
    console.log('📋 Step 1: Loading environment configuration...');
    envConfig.load();

    // 2. Initialize JWK Service
    console.log('📋 Step 2: Initializing JWK Service...');
    await jwkService.initialize();

    // 3. Test Directus connection
    console.log('📋 Step 3: Testing Directus connection...');
    const directusOk = await DirectusDbService.testConnection();

    if (!directusOk) {
      console.warn('⚠️  Directus connection test failed');
      console.warn('   Services may not work properly');
    }

    // 4. Log service endpoints
    const config = envConfig.get();
    console.log('\n📡 Service Endpoints:');
    console.log(`   - Public URL: ${config.publicUrl}`);
    console.log(`   - OIDC Discovery: ${config.publicUrl}/.well-known/openid-configuration`);
    console.log(`   - JWKS: ${config.publicUrl}/api/oidc/jwks.json`);
    console.log(`   - Authorization: ${config.publicUrl}/api/oidc/auth`);
    console.log(`   - Token: ${config.publicUrl}/api/oidc/token`);
    console.log(`   - UserInfo: ${config.publicUrl}/api/oidc/me`);
    console.log(`   - Login: ${config.publicUrl}/api/auth/login`);
    console.log(`   - Logout: ${config.publicUrl}/api/auth/logout`);

    // 5. Log key info
    const keyInfo = jwkService.getKeyInfo();
    console.log('\n🔑 JWT Keys:');
    console.log(`   - Primary Key: ${keyInfo.primary.kid} (${keyInfo.primary.alg})`);
    if (keyInfo.secondary) {
      console.log(`   - Secondary Key: ${keyInfo.secondary.kid} (${keyInfo.secondary.alg})`);
    }
    console.log(`   - Key Rotation: ${keyInfo.rotationEnabled ? 'Enabled' : 'Disabled'}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ FIDT Identity Service - Ready!');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ Failed to initialize FIDT Identity Service:');
    console.error(error);
    console.error('\n═══════════════════════════════════════════════════════════\n');

    // Exit process on initialization failure
    process.exit(1);
  }
});
