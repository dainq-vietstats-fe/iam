# 05 - Implementation Guide (Hướng Dẫn Triển Khai)

## Mục Lục

1. [Setup Development Environment](#setup-development-environment)
2. [Step-by-Step Implementation](#step-by-step-implementation)
3. [Testing](#testing)
4. [Deployment](#deployment)
5. [Common Issues](#common-issues)

---

## Setup Development Environment

### Prerequisites

```bash
# Node.js >= 18.x
node --version  # v18.x or higher

# npm or pnpm
npm --version   # >= 9.x
```

### Install Dependencies

```bash
cd new-iam
npm install
```

### Environment Variables

Tạo file `.env`:

```bash
# Server
PORT=3000
PUBLIC_URL=http://localhost:3000

# Directus (Database)
DIRECTUS_URL=http://localhost:8055
DIRECTUS_TOKEN=your-directus-admin-token

# JWT Keys (generate với npm run generate:keys)
JWT_PRIMARY_PRIVATE_KEY={"kty":"RSA",...}
JWT_PRIMARY_PUBLIC_KEY={"kty":"RSA",...}

# Optional: Secondary keys for rotation
JWT_SECONDARY_PRIVATE_KEY=
JWT_SECONDARY_PUBLIC_KEY=

# OIDC Configuration
OIDC_CLIENT_ID=app
OIDC_CLIENT_SECRET=app-secret

# Token Configuration
TOKEN_PREFIX=fidt_
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
ID_TOKEN_TTL=3600
```

### Generate JWT Keys

```bash
npm run generate:keys
```

Hoặc manual:

```typescript
import { generateKeyPair, exportJWK } from "jose";

const { publicKey, privateKey } = await generateKeyPair("RS256");

const privateJWK = await exportJWK(privateKey);
const publicJWK = await exportJWK(publicKey);

privateJWK.kid = "key-" + Date.now();
publicJWK.kid = privateJWK.kid;
privateJWK.alg = "RS256";
publicJWK.alg = "RS256";
privateJWK.use = "sig";
publicJWK.use = "sig";

console.log("Private Key:", JSON.stringify(privateJWK));
console.log("Public Key:", JSON.stringify(publicJWK));
```

---

## Step-by-Step Implementation

### Step 1: Environment Config Service

**File**: `server/config/env.config.ts`

```typescript
import { JWK } from "jose";

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

class EnvironmentConfigService {
  private config: EnvironmentConfig | null = null;

  load(): EnvironmentConfig {
    if (this.config) {
      return this.config;
    }

    // Parse environment variables
    const requiredVars = [
      "DIRECTUS_URL",
      "DIRECTUS_TOKEN",
      "JWT_PRIMARY_PRIVATE_KEY",
      "JWT_PRIMARY_PUBLIC_KEY",
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }

    this.config = {
      port: parseInt(process.env.PORT || "3000"),
      publicUrl: process.env.PUBLIC_URL || "http://localhost:3000",

      directusUrl: process.env.DIRECTUS_URL!,
      directusToken: process.env.DIRECTUS_TOKEN!,

      jwtPrimaryPrivateKey: JSON.parse(process.env.JWT_PRIMARY_PRIVATE_KEY!),
      jwtPrimaryPublicKey: JSON.parse(process.env.JWT_PRIMARY_PUBLIC_KEY!),
      jwtSecondaryPrivateKey: process.env.JWT_SECONDARY_PRIVATE_KEY
        ? JSON.parse(process.env.JWT_SECONDARY_PRIVATE_KEY)
        : undefined,
      jwtSecondaryPublicKey: process.env.JWT_SECONDARY_PUBLIC_KEY
        ? JSON.parse(process.env.JWT_SECONDARY_PUBLIC_KEY)
        : undefined,

      oidcClientId: process.env.OIDC_CLIENT_ID || "app",
      oidcClientSecret: process.env.OIDC_CLIENT_SECRET || "app-secret",

      accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL || "3600"),
      refreshTokenTtl: parseInt(process.env.REFRESH_TOKEN_TTL || "2592000"),
      idTokenTtl: parseInt(process.env.ID_TOKEN_TTL || "3600"),
      tokenPrefix: process.env.TOKEN_PREFIX || "fidt_",
    };

    return this.config;
  }

  get(): EnvironmentConfig {
    if (!this.config) {
      throw new Error("Config not loaded. Call load() first.");
    }
    return this.config;
  }
}

export const envConfig = new EnvironmentConfigService();
```

---

### Step 2: TypeScript Types

**File**: `server/types/index.ts`

```typescript
import type { JWK } from "jose";

// User types
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name?: string;
  avatar?: string;
  status: "active" | "suspended";
  token_valid_after?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface Policy {
  id: string;
  name: string;
  effect: "allow" | "deny";
  resources: string[];
  actions: string[];
  conditions?: Record<string, any>;
}

// OIDC types
export interface OIDCData {
  internal_id: string;
  kind: string;
  session_id?: string;
  value: any;
  exp?: number;
  iat?: number;
}

// JWT payload
export interface JWTPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf?: number;
  jti?: string;
  scope?: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

// Account claims for OIDC Provider
export interface AccountClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}
```

---

### Step 3: JWK Service

**File**: `server/services/jwk.service.ts`

```typescript
import { importJWK, type JWK } from "jose";
import { envConfig } from "../config/env.config";

export class JWKService {
  private primaryPrivateKey: JWK | null = null;
  private primaryPublicKey: JWK | null = null;
  private secondaryPrivateKey: JWK | null = null;
  private secondaryPublicKey: JWK | null = null;

  async initialize() {
    const config = envConfig.get();

    this.primaryPrivateKey = config.jwtPrimaryPrivateKey;
    this.primaryPublicKey = config.jwtPrimaryPublicKey;

    if (config.jwtSecondaryPrivateKey) {
      this.secondaryPrivateKey = config.jwtSecondaryPrivateKey;
      this.secondaryPublicKey = config.jwtSecondaryPublicKey!;
    }

    console.log("✅ JWK Service initialized");
  }

  getSigningKey(): JWK {
    if (!this.primaryPrivateKey) {
      throw new Error("JWK Service not initialized");
    }
    return this.primaryPrivateKey;
  }

  getPublicJWKS(): { keys: JWK[] } {
    const keys: JWK[] = [];

    if (this.primaryPublicKey) {
      keys.push(this.primaryPublicKey);
    }

    if (this.secondaryPublicKey) {
      keys.push(this.secondaryPublicKey);
    }

    return { keys };
  }

  findPublicKey(kid: string): JWK | undefined {
    if (this.primaryPublicKey?.kid === kid) {
      return this.primaryPublicKey;
    }
    if (this.secondaryPublicKey?.kid === kid) {
      return this.secondaryPublicKey;
    }
    return undefined;
  }

  async getSigningKeyObject() {
    return await importJWK(this.getSigningKey(), "RS256");
  }
}

export const jwkService = new JWKService();
```

---

### Step 4: Directus Database Service

**File**: `server/services/directusDb.service.ts`

```typescript
import { Directus } from "@directus/sdk";
import { envConfig } from "../config/env.config";

export class DirectusDbService {
  private static instance: Directus<any> | null = null;

  static getInstance(): Directus<any> {
    if (!this.instance) {
      const config = envConfig.get();

      this.instance = new Directus(config.directusUrl, {
        auth: {
          staticToken: config.directusToken,
        },
      });

      console.log("✅ Directus connection initialized");
    }

    return this.instance;
  }
}

export const getDirectusClient = () => DirectusDbService.getInstance();
```

---

### Step 5: User Service

**File**: `server/services/user.service.ts`

```typescript
import { getDirectusClient } from "./directusDb.service";
import type { User, Role, Policy } from "../types";
import bcrypt from "bcrypt";

export class UserService {
  async getUserByEmail(email: string): Promise<User | null> {
    const directus = getDirectusClient();

    const result = await directus.items("users").readByQuery({
      filter: { email: { _eq: email } },
      limit: 1,
    });

    return result.data?.[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const directus = getDirectusClient();

    try {
      const user = await directus.items("users").readOne(id);
      return user as User;
    } catch {
      return null;
    }
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.password_hash) {
      return false;
    }
    return await bcrypt.compare(password, user.password_hash);
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const directus = getDirectusClient();

    const result = await directus.items("user_roles").readByQuery({
      filter: { user_id: { _eq: userId } },
      fields: ["role_id.*"],
    });

    return result.data?.map((ur: any) => ur.role_id) || [];
  }

  async getRolePolicies(roleIds: string[]): Promise<Policy[]> {
    if (roleIds.length === 0) return [];

    const directus = getDirectusClient();

    const result = await directus.items("role_policies").readByQuery({
      filter: { role_id: { _in: roleIds } },
      fields: ["policy_id.*"],
    });

    return result.data?.map((rp: any) => rp.policy_id) || [];
  }

  async getUserDetailsWithAuth(userId: string) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const roles = await this.getUserRoles(userId);
    const roleIds = roles.map((r) => r.id);
    const policies = await this.getRolePolicies(roleIds);

    return {
      user,
      roles,
      policies,
    };
  }
}

export const userService = new UserService();
```

---

### Step 6: OIDC Directus Adapter

**File**: `server/services/oidcDirectusAdapter.ts`

```typescript
import { getDirectusClient } from "./directusDb.service";
import type { OIDCData } from "../types";

export class OIDCDirectusAdapter {
  async upsert(id: string, payload: any, expiresIn: number): Promise<void> {
    const directus = getDirectusClient();

    const now = Math.floor(Date.now() / 1000);
    const exp = now + expiresIn;

    const oidcData: Partial<OIDCData> = {
      internal_id: id,
      kind: payload.kind,
      session_id: payload.uid,
      value: payload,
      exp,
      iat: now,
    };

    try {
      await directus.items("oidc_data").readOne(id);
      // Update existing
      await directus.items("oidc_data").updateOne(id, oidcData);
    } catch {
      // Create new
      await directus.items("oidc_data").createOne(oidcData);
    }
  }

  async find(id: string): Promise<any | null> {
    const directus = getDirectusClient();

    try {
      const result = await directus.items("oidc_data").readOne(id);
      if (!result) return null;

      const data = result as OIDCData;

      // Check expiration
      if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
        await this.destroy(id);
        return null;
      }

      return data.value;
    } catch {
      return null;
    }
  }

  async findByUserCode(userCode: string): Promise<any | null> {
    const directus = getDirectusClient();

    const result = await directus.items("oidc_data").readByQuery({
      filter: {
        kind: { _eq: "DeviceCode" },
        "value.userCode": { _eq: userCode },
      },
      limit: 1,
    });

    return result.data?.[0]?.value || null;
  }

  async destroy(id: string): Promise<void> {
    const directus = getDirectusClient();

    try {
      await directus.items("oidc_data").deleteOne(id);
    } catch {
      // Ignore errors
    }
  }

  async consume(id: string): Promise<void> {
    const directus = getDirectusClient();

    try {
      const data = await directus.items("oidc_data").readOne(id);
      if (data) {
        const value = (data as OIDCData).value;
        value.consumed = Math.floor(Date.now() / 1000);

        await directus.items("oidc_data").updateOne(id, { value });
      }
    } catch {
      // Ignore
    }
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    const directus = getDirectusClient();

    const result = await directus.items("oidc_data").readByQuery({
      filter: { "value.grantId": { _eq: grantId } },
    });

    const ids = result.data?.map((d: any) => d.internal_id) || [];

    for (const id of ids) {
      await this.destroy(id);
    }
  }
}

export const oidcAdapter = new OIDCDirectusAdapter();
```

---

### Step 7: OIDC Provider Configuration

**File**: `server/api/oidc/configuration/index.ts`

```typescript
import Provider from "oidc-provider";
import { envConfig } from "../../../config/env.config";
import { jwkService } from "../../../services/jwk.service";
import { oidcAdapter } from "../../../services/oidcDirectusAdapter";
import { userService } from "../../../services/user.service";
import type { AccountClaims } from "../../../types";

const config = envConfig.get();

export const oidcConfig: any = {
  // Issuer
  issuer: config.publicUrl,

  // Clients
  clients: [
    {
      client_id: config.oidcClientId,
      client_secret: config.oidcClientSecret,
      grant_types: [
        "authorization_code",
        "refresh_token",
        "client_credentials",
      ],
      response_types: ["code"],
      redirect_uris: [`${config.publicUrl}/auth/callback`],
      post_logout_redirect_uris: [`${config.publicUrl}/`],
      token_endpoint_auth_method: "client_secret_post",
    },
  ],

  // JWKs (signing keys)
  jwks: jwkService.getPublicJWKS(),

  // TTL
  ttl: {
    AccessToken: config.accessTokenTtl,
    AuthorizationCode: 600, // 10 minutes
    IdToken: config.idTokenTtl,
    RefreshToken: config.refreshTokenTtl,
    Session: 86400, // 24 hours
    Grant: 86400,
    Interaction: 3600, // 1 hour
  },

  // Features
  features: {
    devInteractions: { enabled: false },
    deviceFlow: { enabled: true },
    revocation: { enabled: true },
    clientCredentials: { enabled: true },
    rpInitiatedLogout: { enabled: true },
  },

  // Claims
  claims: {
    openid: ["sub"],
    profile: ["name", "given_name", "family_name", "picture"],
    email: ["email", "email_verified"],
  },

  // Find account
  findAccount: async (ctx: any, sub: string) => {
    const user = await userService.getUserById(sub);

    if (!user) return null;

    return {
      accountId: sub,
      async claims(): Promise<AccountClaims> {
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

  // Extra token claims (roles, policies)
  extraTokenClaims: async (ctx: any, token: any) => {
    if (token.kind !== "AccessToken" && token.kind !== "IdToken") {
      return {};
    }

    const userId = token.accountId;
    const { roles, policies } = await userService.getUserDetailsWithAuth(
      userId
    );

    return {
      "https://fidt-identity.com": {
        roles: roles.map((r) => r.name),
        policies: policies.map((p) => p.id),
      },
    };
  },

  // Adapter
  adapter: (name: string) => {
    return {
      async upsert(id: string, payload: any, expiresIn: number) {
        await oidcAdapter.upsert(id, payload, expiresIn);
      },
      async find(id: string) {
        return await oidcAdapter.find(id);
      },
      async findByUserCode(userCode: string) {
        return await oidcAdapter.findByUserCode(userCode);
      },
      async destroy(id: string) {
        await oidcAdapter.destroy(id);
      },
      async consume(id: string) {
        await oidcAdapter.consume(id);
      },
      async revokeByGrantId(grantId: string) {
        await oidcAdapter.revokeByGrantId(grantId);
      },
    };
  },

  // Interactions
  interactions: {
    url: (ctx: any, interaction: any) => {
      return `/interaction/${interaction.uid}`;
    },
  },
};
```

---

### Step 8: OIDC Provider Initialization

**File**: `server/api/oidc/provider.ts`

```typescript
import Provider from "oidc-provider";
import { oidcConfig } from "./configuration";
import { envConfig } from "../../config/env.config";

let providerInstance: Provider | null = null;

export function getOIDCProvider(): Provider {
  if (!providerInstance) {
    const config = envConfig.get();
    providerInstance = new Provider(config.publicUrl, oidcConfig);

    console.log("✅ OIDC Provider initialized");
  }

  return providerInstance;
}
```

---

### Step 9: OIDC Endpoints

**File**: `server/api/oidc/[...].ts`

```typescript
import { getOIDCProvider } from "./provider";

export default defineEventHandler(async (event) => {
  const provider = getOIDCProvider();
  const req = event.node.req;
  const res = event.node.res;

  // Pass request to OIDC provider
  await provider.callback()(req, res);
});
```

**File**: `server/api/oidc/jwks.json.ts`

```typescript
import { jwkService } from "../../services/jwk.service";

export default defineEventHandler(async (event) => {
  return jwkService.getPublicJWKS();
});
```

---

### Step 10: Authentication Endpoints

**File**: `server/api/auth/login.ts`

```typescript
import { generators } from "openid-client";
import { envConfig } from "../../config/env.config";

export default defineEventHandler(async (event) => {
  const config = envConfig.get();

  // Generate PKCE
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();

  // Store in session
  setCookie(event, "oidc_state", state, { httpOnly: true });
  setCookie(event, "oidc_code_verifier", codeVerifier, { httpOnly: true });

  // Redirect to authorization endpoint
  const params = new URLSearchParams({
    client_id: config.oidcClientId,
    response_type: "code",
    scope: "openid profile email",
    redirect_uri: `${config.publicUrl}/api/auth/callback`,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return sendRedirect(event, `${config.publicUrl}/api/oidc/auth?${params}`);
});
```

**File**: `server/api/auth/callback.ts`

```typescript
import { Issuer } from "openid-client";
import { envConfig } from "../../config/env.config";

export default defineEventHandler(async (event) => {
  const config = envConfig.get();
  const query = getQuery(event);

  const code = query.code as string;
  const state = query.state as string;

  // Verify state
  const savedState = getCookie(event, "oidc_state");
  if (state !== savedState) {
    throw createError({ statusCode: 400, message: "Invalid state" });
  }

  const codeVerifier = getCookie(event, "oidc_code_verifier");

  // Exchange code for tokens
  const issuer = await Issuer.discover(config.publicUrl);
  const client = new issuer.Client({
    client_id: config.oidcClientId,
    client_secret: config.oidcClientSecret,
  });

  const tokenSet = await client.callback(
    `${config.publicUrl}/api/auth/callback`,
    { code },
    { code_verifier: codeVerifier, state }
  );

  // Set tokens as httpOnly cookies
  setCookie(
    event,
    `${config.tokenPrefix}access_token`,
    tokenSet.access_token!,
    {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: config.accessTokenTtl,
    }
  );

  setCookie(event, `${config.tokenPrefix}id_token`, tokenSet.id_token!, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: config.idTokenTtl,
  });

  if (tokenSet.refresh_token) {
    setCookie(
      event,
      `${config.tokenPrefix}refresh_token`,
      tokenSet.refresh_token,
      {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: config.refreshTokenTtl,
      }
    );
  }

  return sendRedirect(event, "/");
});
```

**File**: `server/api/auth/check.ts`

```typescript
import { jwtVerify, importJWK } from "jose";
import { envConfig } from "../../config/env.config";
import { jwkService } from "../../services/jwk.service";
import { userService } from "../../services/user.service";

export default defineEventHandler(async (event) => {
  const config = envConfig.get();
  const accessToken = getCookie(event, `${config.tokenPrefix}access_token`);

  if (!accessToken) {
    throw createError({ statusCode: 401, message: "Not authenticated" });
  }

  try {
    // Verify JWT
    const publicKey = await importJWK(jwkService.getSigningKey(), "RS256");
    const { payload } = await jwtVerify(accessToken, publicKey);

    // Get user details
    const userDetails = await userService.getUserDetailsWithAuth(payload.sub!);

    return {
      user: {
        id: userDetails.user.id,
        email: userDetails.user.email,
        name: userDetails.user.name,
      },
      roles: userDetails.roles.map((r) => r.name),
      policies: userDetails.policies,
    };
  } catch (error) {
    throw createError({ statusCode: 401, message: "Invalid token" });
  }
});
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { jwkService } from "../server/services/jwk.service";
import { SignJWT, jwtVerify, importJWK } from "jose";

describe("JWK Service", () => {
  beforeAll(async () => {
    await jwkService.initialize();
  });

  it("should generate valid JWKS", () => {
    const jwks = jwkService.getPublicJWKS();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0].kty).toBe("RSA");
  });

  it("should sign and verify JWT", async () => {
    const privateKey = await importJWK(jwkService.getSigningKey(), "RS256");
    const publicKey = await importJWK(
      jwkService.getPublicJWKS().keys[0],
      "RS256"
    );

    const jwt = await new SignJWT({ sub: "user123" })
      .setProtectedHeader({ alg: "RS256", kid: jwkService.getSigningKey().kid })
      .setIssuer("https://test.com")
      .setExpirationTime("1h")
      .sign(privateKey);

    const { payload } = await jwtVerify(jwt, publicKey);
    expect(payload.sub).toBe("user123");
  });
});
```

### Integration Tests

```bash
# Start Directus
docker-compose up -d

# Run tests
npm test
```

---

## Deployment

### Production Environment

```bash
# Build
npm run build

# Start
npm start
```

### Docker

**Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**docker-compose.yml:**

```yaml
version: "3.8"

services:
  identity:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PUBLIC_URL=https://identity.example.com
      - DIRECTUS_URL=http://directus:8055
      - DIRECTUS_TOKEN=${DIRECTUS_TOKEN}
    depends_on:
      - directus

  directus:
    image: directus/directus:latest
    ports:
      - "8055:8055"
    environment:
      - DB_CLIENT=postgres
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_DATABASE=directus
      - DB_USER=directus
      - DB_PASSWORD=directus
      - ADMIN_EMAIL=admin@example.com
      - ADMIN_PASSWORD=admin
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=directus
      - POSTGRES_USER=directus
      - POSTGRES_PASSWORD=directus
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Common Issues

### Issue 1: "Invalid signature"

**Cause**: JWT signed với wrong key

**Solution**: Check JWT_PRIMARY_PRIVATE_KEY và JWT_PRIMARY_PUBLIC_KEY match

### Issue 2: "Token expired"

**Cause**: Access token expired

**Solution**: Implement token refresh flow

### Issue 3: "Key not found"

**Cause**: kid trong JWT header không match JWKS

**Solution**: Ensure kid trong private key và public key giống nhau

---

**Congratulations!** 🎉

Bạn đã hoàn thành việc implement một IAM system với OIDC provider!

**Next Steps:**

- Đọc lại các docs để hiểu sâu hơn
- Customize policies cho use case của bạn
- Implement MFA (Multi-Factor Authentication)
- Add social login (Google, Facebook)
- Deploy to production
