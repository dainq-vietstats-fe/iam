import { generators } from 'openid-client';
import { envConfig } from '../../config/env.config';

/**
 * Login Endpoint
 *
 * Khởi tạo Authorization Code Flow với PKCE.
 *
 * Flow:
 * 1. Generate code_verifier và code_challenge (PKCE)
 * 2. Generate state (CSRF protection)
 * 3. Store trong cookies
 * 4. Redirect đến /oidc/auth (authorization endpoint)
 */
export default defineEventHandler(async (event) => {
  console.log('🔐 Login initiated');

  const config = envConfig.get();

  // Generate PKCE parameters
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();

  console.log('   ✅ Generated PKCE parameters');
  console.log(`   - state: ${state.substring(0, 10)}...`);
  console.log(`   - code_challenge: ${codeChallenge.substring(0, 10)}...`);

  // Store in httpOnly cookies (secure)
  setCookie(event, 'oidc_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  setCookie(event, 'oidc_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.oidcClientId,
    response_type: 'code',
    scope: 'openid profile email',
    redirect_uri: `${config.publicUrl}/api/auth/callback`,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${config.publicUrl}/api/oidc/auth?${params.toString()}`;

  console.log(`   🔗 Redirecting to: ${authUrl}`);

  return sendRedirect(event, authUrl);
});
