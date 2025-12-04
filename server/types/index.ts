import type { JWK } from 'jose';

// ========================
// User & Authentication
// ========================

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name?: string;
  avatar?: string;
  status: 'active' | 'suspended';
  token_valid_after?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at?: Date;
}

export interface Policy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  resources: string[];
  actions: string[];
  conditions?: Record<string, any>;
  created_at?: Date;
}

export interface UserRole {
  user_id: string;
  role_id: string;
}

export interface RolePolicy {
  role_id: string;
  policy_id: string;
}

// ========================
// OIDC Types
// ========================

export interface OIDCData {
  internal_id: string;
  kind: string; // AuthorizationCode, AccessToken, RefreshToken, Session, etc.
  session_id?: string;
  value: any; // The OIDC payload
  exp?: number; // Expiration timestamp (Unix)
  iat?: number; // Issued-at timestamp (Unix)
  created_at?: Date;
}

export interface AccountClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  [key: string]: any;
}

export interface OIDCInteraction {
  uid: string;
  params: any;
  prompt: any;
  session?: any;
}

// ========================
// JWT Types
// ========================

export interface JWTPayload {
  // Standard claims
  iss: string; // Issuer
  sub: string; // Subject (user ID)
  aud: string | string[]; // Audience
  exp: number; // Expiration time
  iat: number; // Issued at
  nbf?: number; // Not before
  jti?: string; // JWT ID

  // Custom claims
  scope?: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface SignedJWT {
  token: string;
  payload: JWTPayload;
}

// ========================
// Configuration
// ========================

export interface EnvironmentConfig {
  // Server
  port: number;
  publicUrl: string;

  // Directus
  directusUrl: string;
  directusToken: string;

  // JWT Keys
  jwtPrimaryPrivateKey: JWK;
  jwtPrimaryPublicKey: JWK;
  jwtSecondaryPrivateKey?: JWK;
  jwtSecondaryPublicKey?: JWK;

  // OIDC
  oidcClientId: string;
  oidcClientSecret: string;

  // Token TTL (seconds)
  accessTokenTtl: number;
  refreshTokenTtl: number;
  idTokenTtl: number;
  tokenPrefix: string;
}

// ========================
// API Response Types
// ========================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface UserDetailsResponse {
  user: Omit<User, 'password_hash'>;
  roles: Role[];
  policies: Policy[];
}

// ========================
// Event Context Extensions
// ========================

declare module 'h3' {
  interface H3EventContext {
    user?: {
      id: string;
      email: string;
      name?: string;
      roles: string[];
    };
  }
}
