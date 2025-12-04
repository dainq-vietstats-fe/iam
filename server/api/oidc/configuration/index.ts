import type { Configuration } from 'oidc-provider';
import { envConfig } from '../../../config/env.config';
import { jwkService } from '../../../services/jwk.service';
import { userService } from '../../../services/user.service';
import { createOIDCAdapter } from '../../../services/oidcDirectusAdapter';
import type { AccountClaims } from '../../../types';

/**
 * OIDC Provider Configuration
 *
 * Configuration cho node-oidc-provider theo OpenID Connect specs.
 * Tham khảo: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md
 */

const config = envConfig.get();

export function getOIDCConfiguration(): Configuration {
  return {
    // ========================
    // Issuer & Discovery
    // ========================
    issuer: config.publicUrl,

    // ========================
    // Clients
    // ========================
    clients: [
      {
        client_id: config.oidcClientId,
        client_secret: config.oidcClientSecret,
        grant_types: [
          'authorization_code',
          'refresh_token',
          'client_credentials',
        ],
        response_types: ['code'],
        redirect_uris: [
          `${config.publicUrl}/api/auth/callback`,
          'http://localhost:3001/callback', // For testing
        ],
        post_logout_redirect_uris: [
          `${config.publicUrl}/`,
          'http://localhost:3001/',
        ],
        token_endpoint_auth_method: 'client_secret_post',
      },
    ],

    // ========================
    // JWKS (Signing Keys)
    // ========================
    jwks: jwkService.getPublicJWKS(),

    // ========================
    // TTL Configuration
    // ========================
    ttl: {
      AccessToken: config.accessTokenTtl, // 1 hour default
      AuthorizationCode: 600, // 10 minutes
      IdToken: config.idTokenTtl, // 1 hour default
      RefreshToken: config.refreshTokenTtl, // 30 days default
      Session: 86400, // 24 hours
      Grant: 86400, // 24 hours
      Interaction: 3600, // 1 hour
      DeviceCode: 600, // 10 minutes
      ClientCredentials: config.accessTokenTtl,
    },

    // ========================
    // Features
    // ========================
    features: {
      // Disable dev interactions (we'll create custom login page)
      devInteractions: { enabled: false },

      // Enable device flow
      deviceFlow: { enabled: true },

      // Enable token revocation
      revocation: { enabled: true },

      // Enable client credentials grant
      clientCredentials: { enabled: true },

      // Enable RP-initiated logout
      rpInitiatedLogout: {
        enabled: true,
        logoutSource: async (ctx, form) => {
          // Custom logout page
          ctx.body = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Logout</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body>
              <h1>Logging out...</h1>
              <p>You are being logged out from all sessions.</p>
              ${form}
              <script>
                document.forms[0].submit();
              </script>
            </body>
            </html>
          `;
        },
      },
    },

    // ========================
    // Claims Configuration
    // ========================
    claims: {
      openid: ['sub'],
      profile: ['name', 'given_name', 'family_name', 'picture'],
      email: ['email', 'email_verified'],
    },

    // ========================
    // Find Account
    // ========================
    findAccount: async (ctx, sub, token) => {
      console.log(`🔍 Finding account: ${sub}`);

      const user = await userService.getUserById(sub);

      if (!user) {
        console.log(`❌ Account not found: ${sub}`);
        return undefined;
      }

      // Check if user is active
      if (user.status !== 'active') {
        console.log(`❌ Account suspended: ${sub}`);
        return undefined;
      }

      // Check token revocation (tokenValidAfter)
      if (token && user.token_valid_after) {
        const tokenIat = token.iat || 0;
        const validAfter = Math.floor(user.token_valid_after.getTime() / 1000);

        if (tokenIat < validAfter) {
          console.log(`❌ Token revoked: ${sub} (issued before ${validAfter})`);
          return undefined;
        }
      }

      console.log(`✅ Account found: ${user.email}`);

      return {
        accountId: sub,
        async claims(use, scope, claims, rejected): Promise<AccountClaims> {
          console.log(`📋 Generating claims for: ${user.email}`);
          console.log(`   - use: ${use}`);
          console.log(`   - scope: ${scope}`);

          return {
            sub: user.id,
            email: user.email,
            email_verified: true,
            name: user.name,
            picture: user.avatar,
          };
        },
      };
    },

    // ========================
    // Extra Token Claims
    // ========================
    extraTokenClaims: async (ctx, token) => {
      // Only add extra claims to AccessToken and IdToken
      if (token.kind !== 'AccessToken' && token.kind !== 'IdToken') {
        return {};
      }

      const userId = token.accountId;

      console.log(`➕ Adding extra claims for: ${userId}`);

      try {
        // Get user roles and policies
        const { roles, policies } = await userService.getUserDetailsWithAuth(
          userId
        );

        const extraClaims = {
          'https://fidt-identity.com': {
            roles: roles.map((r) => r.name),
            policies: policies.map((p) => ({
              id: p.id,
              name: p.name,
              effect: p.effect,
              resources: p.resources,
              actions: p.actions,
            })),
          },
        };

        console.log(`   ✅ Added ${roles.length} roles and ${policies.length} policies`);

        return extraClaims;
      } catch (error) {
        console.error('Error adding extra claims:', error);
        return {};
      }
    },

    // ========================
    // Adapter (Database)
    // ========================
    adapter: createOIDCAdapter,

    // ========================
    // Interactions
    // ========================
    interactions: {
      url(ctx, interaction) {
        // Redirect to custom login/consent page
        return `/interaction/${interaction.uid}`;
      },
    },

    // ========================
    // Cookie Configuration
    // ========================
    cookies: {
      keys: [config.oidcClientSecret], // Cookie signing keys
      long: {
        signed: true,
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        sameSite: 'lax',
      },
      short: {
        signed: true,
        maxAge: 600000, // 10 minutes
        httpOnly: true,
        sameSite: 'lax',
      },
    },

    // ========================
    // Routes
    // ========================
    routes: {
      authorization: '/oidc/auth',
      token: '/oidc/token',
      userinfo: '/oidc/me',
      jwks: '/oidc/jwks',
      registration: '/oidc/reg',
      revocation: '/oidc/token/revocation',
      introspection: '/oidc/token/introspection',
      end_session: '/oidc/session/end',
      code_verification: '/oidc/device',
      device_authorization: '/oidc/device/auth',
    },

    // ========================
    // PKCE Configuration
    // ========================
    pkce: {
      methods: ['S256'], // Only allow SHA-256
      required: () => true, // Require PKCE for all clients
    },

    // ========================
    // Rendering
    // ========================
    renderError: async (ctx, out, error) => {
      console.error('❌ OIDC Error:', error);
      ctx.type = 'html';
      ctx.body = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .error {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 { color: #e74c3c; }
            code {
              background: #f0f0f0;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>⚠️ Authentication Error</h1>
            <p><strong>Error:</strong> <code>${error.error || 'unknown_error'}</code></p>
            <p>${error.error_description || 'An unexpected error occurred'}</p>
          </div>
        </body>
        </html>
      `;
    },
  };
}
