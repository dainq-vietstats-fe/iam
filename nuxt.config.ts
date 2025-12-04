// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  runtimeConfig: {
    // Server-side only
    directusUrl: process.env.DIRECTUS_URL,
    directusToken: process.env.DIRECTUS_TOKEN,
    jwtPrimaryPrivateKey: process.env.JWT_PRIMARY_PRIVATE_KEY,
    jwtPrimaryPublicKey: process.env.JWT_PRIMARY_PUBLIC_KEY,
    jwtSecondaryPrivateKey: process.env.JWT_SECONDARY_PRIVATE_KEY,
    jwtSecondaryPublicKey: process.env.JWT_SECONDARY_PUBLIC_KEY,
    oidcClientId: process.env.OIDC_CLIENT_ID || 'app',
    oidcClientSecret: process.env.OIDC_CLIENT_SECRET || 'app-secret',
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '3600',
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '2592000',
    idTokenTtl: process.env.ID_TOKEN_TTL || '3600',
    tokenPrefix: process.env.TOKEN_PREFIX || 'fidt_',

    // Public (exposed to client)
    public: {
      publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
    },
  },

  nitro: {
    experimental: {
      openAPI: false,
    },
  },

  typescript: {
    typeCheck: true,
    strict: true,
  },
})
