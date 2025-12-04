import { envConfig } from '../../config/env.config';

/**
 * Logout Endpoint
 *
 * Logout user và clear session.
 *
 * Flow:
 * 1. Get id_token từ cookie (để identify session)
 * 2. Clear cookies
 * 3. Redirect đến OIDC end_session endpoint
 */
export default defineEventHandler(async (event) => {
  console.log('👋 Logout initiated');

  const config = envConfig.get();

  // Get id_token for logout hint
  const idToken = getCookie(event, `${config.tokenPrefix}id_token`);

  // Clear all auth cookies
  deleteCookie(event, `${config.tokenPrefix}access_token`);
  deleteCookie(event, `${config.tokenPrefix}id_token`);
  deleteCookie(event, `${config.tokenPrefix}refresh_token`);

  console.log('   🗑️  Cleared auth cookies');

  // Build logout URL
  const params = new URLSearchParams({
    post_logout_redirect_uri: `${config.publicUrl}/`,
  });

  if (idToken) {
    params.set('id_token_hint', idToken);
  }

  const logoutUrl = `${config.publicUrl}/api/oidc/session/end?${params.toString()}`;

  console.log(`   🔗 Redirecting to: ${logoutUrl}`);

  return sendRedirect(event, logoutUrl);
});
