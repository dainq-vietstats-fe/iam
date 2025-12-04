import { Issuer } from 'openid-client';
import { envConfig } from '../../config/env.config';

/**
 * OAuth Callback Endpoint
 *
 * Handle authorization callback từ OIDC provider.
 *
 * Flow:
 * 1. Receive authorization code
 * 2. Verify state (CSRF protection)
 * 3. Exchange code for tokens (với code_verifier - PKCE)
 * 4. Set tokens as httpOnly cookies
 * 5. Redirect về home page
 */
export default defineEventHandler(async (event) => {
  console.log('🔄 OAuth callback received');

  const config = envConfig.get();
  const query = getQuery(event);

  // Extract parameters
  const code = query.code as string;
  const state = query.state as string;
  const error = query.error as string;

  // Check for errors
  if (error) {
    console.error('❌ OAuth error:', error, query.error_description);
    throw createError({
      statusCode: 400,
      message: `OAuth error: ${error}`,
    });
  }

  if (!code || !state) {
    console.error('❌ Missing code or state');
    throw createError({
      statusCode: 400,
      message: 'Missing authorization code or state',
    });
  }

  // Verify state (CSRF protection)
  const savedState = getCookie(event, 'oidc_state');

  if (!savedState || state !== savedState) {
    console.error('❌ Invalid state');
    throw createError({
      statusCode: 400,
      message: 'Invalid state parameter (CSRF protection)',
    });
  }

  console.log('   ✅ State verified');

  // Get code_verifier from cookie
  const codeVerifier = getCookie(event, 'oidc_code_verifier');

  if (!codeVerifier) {
    console.error('❌ Missing code_verifier');
    throw createError({
      statusCode: 400,
      message: 'Missing code verifier (PKCE)',
    });
  }

  try {
    // Discover OIDC endpoints
    console.log('   🔍 Discovering OIDC issuer...');
    const issuer = await Issuer.discover(config.publicUrl);

    // Create client
    const client = new issuer.Client({
      client_id: config.oidcClientId,
      client_secret: config.oidcClientSecret,
      redirect_uris: [`${config.publicUrl}/api/auth/callback`],
      response_types: ['code'],
    });

    console.log('   🔄 Exchanging code for tokens...');

    // Exchange authorization code for tokens
    const tokenSet = await client.callback(
      `${config.publicUrl}/api/auth/callback`,
      { code, state },
      { code_verifier: codeVerifier, state }
    );

    console.log('   ✅ Tokens received');
    console.log(`   - access_token: ${tokenSet.access_token?.substring(0, 20)}...`);
    console.log(`   - id_token: ${tokenSet.id_token?.substring(0, 20)}...`);
    console.log(`   - refresh_token: ${tokenSet.refresh_token ? 'present' : 'none'}`);

    // Set tokens as httpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    setCookie(
      event,
      `${config.tokenPrefix}access_token`,
      tokenSet.access_token!,
      {
        ...cookieOptions,
        maxAge: config.accessTokenTtl,
      }
    );

    setCookie(
      event,
      `${config.tokenPrefix}id_token`,
      tokenSet.id_token!,
      {
        ...cookieOptions,
        maxAge: config.idTokenTtl,
      }
    );

    if (tokenSet.refresh_token) {
      setCookie(
        event,
        `${config.tokenPrefix}refresh_token`,
        tokenSet.refresh_token,
        {
          ...cookieOptions,
          maxAge: config.refreshTokenTtl,
        }
      );
    }

    // Clear OIDC flow cookies
    deleteCookie(event, 'oidc_state');
    deleteCookie(event, 'oidc_code_verifier');

    console.log('   ✅ Login successful, redirecting to home');

    // Redirect to home page
    return sendRedirect(event, '/');
  } catch (error: any) {
    console.error('❌ Token exchange failed:', error.message);
    throw createError({
      statusCode: 500,
      message: 'Failed to exchange authorization code for tokens',
    });
  }
});
