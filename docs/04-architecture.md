# 04 - Architecture (Kiến Trúc Hệ Thống)

## Mục Lục

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [Security Architecture](#security-architecture)
6. [Scalability](#scalability)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Web App     │  │  Mobile App  │  │  3rd Party   │          │
│  │  (Browser)   │  │  (iOS/Android│  │  Client      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │         HTTP/HTTPS + Cookies        │
          │         Authorization: Bearer <JWT> │
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────────┐
│         ▼                  ▼                  ▼                  │
│  ┌────────────────────────────────────────────────────┐         │
│  │         SAUL API Gateway (RPC Framework)           │         │
│  │  ┌──────────────────────────────────────────────┐ │         │
│  │  │  1. Token Verification (JWT + JWKS)          │ │         │
│  │  │  2. TokenValidAfter Checking                 │ │         │
│  │  │  3. Policy Evaluation (RBAC/PBAC)            │ │         │
│  │  │  4. Rate Limiting & Throttling               │ │         │
│  │  │  5. Request Routing                          │ │         │
│  │  └──────────────────────────────────────────────┘ │         │
│  └────────────┬───────────────────────┬───────────────┘         │
│               │                       │                         │
└───────────────┼───────────────────────┼─────────────────────────┘
                │                       │
                │ Verify Token          │ Route Request
                │                       │
                ▼                       ▼
┌──────────────────────────────┐  ┌─────────────────────┐
│   FIDT IDENTITY SERVICE      │  │  BACKEND SERVICES   │
│ ┌──────────────────────────┐ │  │  ┌───────────────┐ │
│ │  OIDC Provider           │ │  │  │ Sales2 API    │ │
│ │  (node-oidc-provider)    │ │  │  ├───────────────┤ │
│ │  ┌────────────────────┐  │ │  │  │ Customer API  │ │
│ │  │ Authorization      │  │ │  │  ├───────────────┤ │
│ │  │ Endpoint           │  │ │  │  │ Order API     │ │
│ │  ├────────────────────┤  │ │  │  └───────────────┘ │
│ │  │ Token Endpoint     │  │ │  └─────────────────────┘
│ │  ├────────────────────┤  │ │
│ │  │ UserInfo Endpoint  │  │ │
│ │  ├────────────────────┤  │ │
│ │  │ JWKS Endpoint      │  │ │
│ │  ├────────────────────┤  │ │
│ │  │ Logout Endpoint    │  │ │
│ │  └────────────────────┘  │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │  Services Layer          │ │
│ │  ├─ JWK Service          │ │
│ │  ├─ User Service         │ │
│ │  ├─ Role Service         │ │
│ │  ├─ Policy Service       │ │
│ │  └─ OIDC Adapter         │ │
│ └──────────────────────────┘ │
└──────────────┬───────────────┘
               │
               │ Read/Write
               ▼
┌──────────────────────────────┐
│    DIRECTUS (Database)       │
│  ┌────────────────────────┐  │
│  │ Tables:                │  │
│  │  - users               │  │
│  │  - roles               │  │
│  │  - user_roles          │  │
│  │  - oidc_data           │  │
│  │  - remote_config       │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

---

## Component Architecture

### 1. FIDT Identity Service

**Vai trò**: OpenID Connect Provider (Authorization Server)

**Responsibilities:**

- ✅ User authentication (login/logout)
- ✅ Token issuance (access, ID, refresh tokens)
- ✅ Session management
- ✅ OIDC protocol compliance
- ✅ Key management (JWK rotation)

**Technology Stack:**

- **Framework**: Nuxt 3 (full-stack Vue.js)
- **OIDC Library**: node-oidc-provider v9.1.3
- **JWT Library**: jose v6.0.11
- **Language**: TypeScript

**Directory Structure:**

```
new-iam/
├── server/
│   ├── api/
│   │   ├── oidc/              # OIDC endpoints
│   │   │   ├── [...].ts       # Catch-all OIDC provider
│   │   │   ├── jwks.json.ts   # Public JWKS endpoint
│   │   │   └── configuration/ # OIDC config
│   │   ├── auth/              # Auth endpoints
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   ├── callback.ts
│   │   │   └── check.ts
│   │   └── user/
│   │       └── me.ts          # Get current user
│   ├── services/
│   │   ├── jwk.service.ts              # Key management
│   │   ├── user.service.ts             # User operations
│   │   ├── oidcDirectusAdapter.ts      # OIDC storage
│   │   └── directusDb.service.ts       # DB connection
│   ├── config/
│   │   └── env.config.ts               # Environment config
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   └── utils/
│       └── token.ts                    # Token utilities
├── pages/
│   └── interaction/
│       └── [uid].vue          # Login/consent page
└── nuxt.config.ts
```

### 2. SAUL API Gateway

**Vai trò**: API Gateway + Authorization Server

**Responsibilities:**

- ✅ Token verification (JWT signature + claims)
- ✅ Policy evaluation (RBAC/PBAC)
- ✅ TokenValidAfter checking (revocation)
- ✅ Rate limiting
- ✅ Request routing to backend services
- ✅ Audit logging

**Technology:**

- **Framework**: Custom RPC framework (@fidt/saul-server)
- **Protocol**: RPC over HTTP

**Key Functions:**

```typescript
// Token verification
async function verifyToken(token: string): Promise<UserContext> {
  // 1. Verify JWT signature với public keys từ JWKS
  const payload = await jwtVerify(token, publicKey);

  // 2. Check claims (exp, iss, aud)
  validateClaims(payload);

  // 3. Check TokenValidAfter
  const user = await getUserById(payload.sub);
  if (token.iat < user.tokenValidAfter) {
    throw new Error("Token revoked");
  }

  return {
    userId: payload.sub,
    roles: payload.roles,
    policies: payload.policies,
  };
}

// Policy evaluation
async function checkPermission(
  user: UserContext,
  resource: string,
  action: string
): Promise<boolean> {
  for (const policy of user.policies) {
    if (policy.resource === resource && policy.action === action) {
      return true;
    }
  }
  return false;
}
```

### 3. Directus (Database)

**Vai trò**: Identity Store + Data Backend

**Responsibilities:**

- ✅ User data storage
- ✅ Role & permission management
- ✅ OIDC session data
- ✅ Configuration storage

**Schema:** (See [Database Schema](#database-schema) section)

### 4. Backend Services

**Vai trò**: Business Logic APIs

**Responsibilities:**

- ✅ Business operations (orders, customers, ...)
- ✅ Accept Bearer tokens
- ✅ Trust SAUL gateway (assume verified)

**Integration:**

```
Request Flow:
Client → SAUL (verify token + check permissions)
      → Backend Service (trusted request)
```

---

## Data Flow

### Authentication Flow (Login)

```
┌─────┐                  ┌──────────┐                ┌─────────┐
│User │                  │ Identity │                │Directus │
└──┬──┘                  └────┬─────┘                └────┬────┘
   │                          │                           │
   │ (1) GET /auth/login      │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │ (2) Generate state,      │                           │
   │     code_verifier (PKCE) │                           │
   │                          │                           │
   │ (3) Redirect to          │                           │
   │     /oidc/authorization  │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ (4) Show login page      │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ (5) POST credentials     │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │                          │ (6) Query user            │
   │                          ├──────────────────────────>│
   │                          │                           │
   │                          │ (7) User data             │
   │                          │<──────────────────────────┤
   │                          │                           │
   │                          │ (8) Verify password       │
   │                          │                           │
   │                          │ (9) Create session        │
   │                          │    & authorization code   │
   │                          ├──────────────────────────>│
   │                          │                           │
   │ (10) Redirect to         │                           │
   │      /auth/callback      │                           │
   │      + code=abc123       │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ (11) POST /token         │                           │
   │      + code              │                           │
   │      + code_verifier     │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │                          │ (12) Verify code          │
   │                          ├──────────────────────────>│
   │                          │                           │
   │                          │ (13) Get user roles,      │
   │                          │      policies             │
   │                          ├──────────────────────────>│
   │                          │                           │
   │                          │ (14) Sign JWT tokens      │
   │                          │      (access, ID, refresh)│
   │                          │                           │
   │ (15) Set httpOnly cookies│                           │
   │      + access_token      │                           │
   │      + id_token          │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ (16) Logged in!          │                           │
   │                          │                           │
```

### Authorization Flow (API Call)

```
┌─────┐      ┌──────┐      ┌─────────┐      ┌─────────┐
│User │      │ SAUL │      │Identity │      │Backend  │
└──┬──┘      └───┬──┘      └────┬────┘      └────┬────┘
   │             │              │                │
   │ (1) API Call             │                │
   │  + Cookie: access_token   │                │
   ├────────────>│              │                │
   │             │              │                │
   │             │ (2) Extract JWT              │
   │             │              │                │
   │             │ (3) Fetch JWKS (cached)      │
   │             ├─────────────>│                │
   │             │              │                │
   │             │ (4) Public keys              │
   │             │<─────────────┤                │
   │             │              │                │
   │             │ (5) Verify JWT signature     │
   │             │              │                │
   │             │ (6) Check TokenValidAfter    │
   │             │              │                │
   │             │ (7) Extract policies         │
   │             │              │                │
   │             │ (8) Evaluate policy:         │
   │             │     Can user do this action? │
   │             │              │                │
   │             │ (9) Forward request          │
   │             │              │                │
   │             ├───────────────────────────────>│
   │             │              │                │
   │             │ (10) Process & return data   │
   │             │<───────────────────────────────┤
   │             │              │                │
   │ (11) Response             │                │
   │<────────────┤              │                │
   │             │              │                │
```

### Token Refresh Flow

```
┌─────┐                  ┌──────────┐                ┌─────────┐
│User │                  │ Identity │                │Directus │
└──┬──┘                  └────┬─────┘                └────┬────┘
   │                          │                           │
   │ (1) API call fails       │                           │
   │     (401 Token Expired)  │                           │
   │                          │                           │
   │ (2) POST /token          │                           │
   │  + grant_type=           │                           │
   │    refresh_token         │                           │
   │  + refresh_token=xyz     │                           │
   ├─────────────────────────>│                           │
   │                          │                           │
   │                          │ (3) Verify refresh_token  │
   │                          ├──────────────────────────>│
   │                          │                           │
   │                          │ (4) Token valid           │
   │                          │<──────────────────────────┤
   │                          │                           │
   │                          │ (5) Get fresh user data   │
   │                          ├──────────────────────────>│
   │                          │                           │
   │                          │ (6) Issue new tokens:     │
   │                          │  - access_token (new)     │
   │                          │  - id_token (new)         │
   │                          │  - refresh_token (new)    │
   │                          │                           │
   │ (7) Return new tokens    │                           │
   │<─────────────────────────┤                           │
   │                          │                           │
   │ (8) Retry API call       │                           │
   │     with new access_token│                           │
   │                          │                           │
```

---

## Database Schema

### Table: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt
  name VARCHAR(255),
  avatar VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active', -- active, suspended
  token_valid_after TIMESTAMP, -- For token revocation
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

**Ví dụ:**

```json
{
  "id": "user-123",
  "email": "john@example.com",
  "password_hash": "$2b$10$abcdef...",
  "name": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "status": "active",
  "token_valid_after": "2025-12-05T10:00:00Z",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Table: `roles`

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL, -- admin, sales-manager, viewer
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Ví dụ:**

```json
{
  "id": "role-1",
  "name": "sales-manager",
  "description": "Sales Manager Role"
}
```

### Table: `user_roles` (Many-to-Many)

```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Indexes
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
```

### Table: `policies`

```sql
CREATE TABLE policies (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  effect VARCHAR(10) NOT NULL, -- allow, deny
  resources JSONB, -- ["api:orders", "api:customers"]
  actions JSONB,   -- ["read", "create", "update"]
  conditions JSONB, -- { "region": "vietnam" }
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Ví dụ:**

```json
{
  "id": "policy-1",
  "name": "Sales Manager Policy",
  "effect": "allow",
  "resources": ["api:orders", "api:customers"],
  "actions": ["read", "create", "update"],
  "conditions": {
    "time": "business_hours"
  }
}
```

### Table: `role_policies` (Many-to-Many)

```sql
CREATE TABLE role_policies (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, policy_id)
);
```

### Table: `oidc_data`

```sql
CREATE TABLE oidc_data (
  internal_id VARCHAR(255) PRIMARY KEY,
  kind VARCHAR(50) NOT NULL, -- AuthorizationCode, AccessToken, Session, etc.
  session_id VARCHAR(255),
  value JSONB NOT NULL, -- The OIDC payload
  exp BIGINT, -- Expiration timestamp
  iat BIGINT, -- Issued-at timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_oidc_kind ON oidc_data(kind);
CREATE INDEX idx_oidc_session ON oidc_data(session_id);
CREATE INDEX idx_oidc_exp ON oidc_data(exp);
```

**Ví dụ:**

```json
{
  "internal_id": "auth-code-abc123",
  "kind": "AuthorizationCode",
  "session_id": "session-xyz",
  "value": {
    "accountId": "user-123",
    "clientId": "sales2-client",
    "codeChallenge": "xyz...",
    "codeChallengeMethod": "S256",
    "redirectUri": "https://sales2.com/callback"
  },
  "exp": 1735603800,
  "iat": 1735603200
}
```

### Table: `remote_config` (Singleton)

```sql
CREATE TABLE remote_config (
  id INT PRIMARY KEY DEFAULT 1,
  config JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (id = 1) -- Only one row
);
```

**Ví dụ:**

```json
{
  "id": 1,
  "config": {
    "access_token_ttl": 3600,
    "refresh_token_ttl": 2592000,
    "enable_mfa": false
  }
}
```

---

## Security Architecture

### 1. Authentication Security

**Password Storage:**

```typescript
import bcrypt from "bcrypt";

// Hash password
const hash = await bcrypt.hash(password, 10); // 10 rounds

// Verify password
const isValid = await bcrypt.compare(password, hash);
```

**PKCE (Authorization Code Flow):**

```typescript
// Client generates code_verifier
const codeVerifier = generateRandomString(128);

// Client generates code_challenge
const codeChallenge = base64url(sha256(codeVerifier));

// Authorization request
GET /authorize?code_challenge=xyz&code_challenge_method=S256

// Token request
POST /token
  code_verifier=abc123
```

### 2. Token Security

**JWT Signing (RS256):**

```typescript
import { SignJWT } from "jose";

const privateKey = await importJWK(jwkService.getSigningKey());

const jwt = await new SignJWT({
  sub: userId,
  email: user.email,
})
  .setProtectedHeader({ alg: "RS256", kid: "key-1" })
  .setIssuer("https://fidt-identity.com")
  .setAudience("sales2-api")
  .setExpirationTime("1h")
  .sign(privateKey);
```

**Token Storage:**

```typescript
// httpOnly cookies (best for web apps)
res.cookie("access_token", token, {
  httpOnly: true, // Cannot be accessed by JavaScript
  secure: true, // HTTPS only
  sameSite: "strict", // CSRF protection
  maxAge: 3600000, // 1 hour
});
```

### 3. Token Revocation

**TokenValidAfter Strategy:**

```typescript
// When user changes password or logs out all sessions
await updateUser(userId, {
  tokenValidAfter: new Date(),
});

// When verifying token
const user = await getUser(token.sub);
if (token.iat < user.tokenValidAfter.getTime() / 1000) {
  throw new Error("Token revoked");
}
```

### 4. CORS Configuration

```typescript
export default defineEventHandler((event) => {
  const origin = getHeader(event, "origin");

  const allowedOrigins = [
    "https://sales2.fidt.com",
    "https://customer.fidt.com",
  ];

  if (allowedOrigins.includes(origin)) {
    setHeader(event, "Access-Control-Allow-Origin", origin);
    setHeader(event, "Access-Control-Allow-Credentials", "true");
  }
});
```

### 5. Rate Limiting

```typescript
// Limit login attempts
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const attempts = await redis.incr(`login:${email}`);
await redis.expire(`login:${email}`, LOCKOUT_DURATION / 1000);

if (attempts > MAX_ATTEMPTS) {
  throw new Error("Too many login attempts. Try again later.");
}
```

---

## Scalability

### 1. Stateless Architecture

**JWT-based auth** = Không cần shared session store

```
┌────────┐    ┌────────┐    ┌────────┐
│ Server │    │ Server │    │ Server │
│   1    │    │   2    │    │   3    │
└────────┘    └────────┘    └────────┘
     │             │             │
     └─────────────┴─────────────┘
              │
         No shared state needed
         (JWT is self-contained)
```

### 2. JWKS Caching

```typescript
// Cache public keys
const jwksCache = {
  keys: null as any,
  lastFetch: 0,
  TTL: 3600000, // 1 hour
};

async function getPublicKeys() {
  const now = Date.now();

  if (!jwksCache.keys || now - jwksCache.lastFetch > jwksCache.TTL) {
    const response = await fetch("https://identity.com/jwks.json");
    jwksCache.keys = await response.json();
    jwksCache.lastFetch = now;
  }

  return jwksCache.keys;
}
```

### 3. Database Optimization

**Indexes:**

```sql
-- User lookup by email (login)
CREATE INDEX idx_users_email ON users(email);

-- Token verification (TokenValidAfter check)
CREATE INDEX idx_users_id ON users(id);

-- Role lookup
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- OIDC data cleanup
CREATE INDEX idx_oidc_exp ON oidc_data(exp);
```

**Connection Pooling:**

```typescript
const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 4. Horizontal Scaling

**Load Balancer:**

```
          ┌──────────────┐
          │Load Balancer │
          └──────┬───────┘
                 │
        ┌────────┼────────┐
        │        │        │
   ┌────▼───┐ ┌─▼─────┐ ┌▼──────┐
   │Identity│ │Identity│ │Identity│
   │Server 1│ │Server 2│ │Server 3│
   └────────┘ └────────┘ └────────┘
        │        │        │
        └────────┴────────┘
                 │
          ┌──────▼───────┐
          │   Directus   │
          │  (Database)  │
          └──────────────┘
```

### 5. Caching Strategy

**Redis for:**

- ✅ Rate limiting counters
- ✅ Session blacklist
- ✅ JWKS cache
- ✅ User role cache

```typescript
// Cache user roles
const cacheKey = `user:${userId}:roles`;
let roles = await redis.get(cacheKey);

if (!roles) {
  roles = await db.getUserRoles(userId);
  await redis.set(cacheKey, JSON.stringify(roles), "EX", 300); // 5 min
}
```

---

## Monitoring & Logging

### 1. Audit Logs

```typescript
interface AuditLog {
  timestamp: string;
  userId: string;
  action: string; // LOGIN, LOGOUT, TOKEN_REFRESH, etc.
  resource: string;
  ip: string;
  userAgent: string;
  result: "success" | "failure";
  metadata: any;
}

// Log every authentication event
await logAudit({
  timestamp: new Date().toISOString(),
  userId: user.id,
  action: "LOGIN",
  resource: "auth",
  ip: request.ip,
  userAgent: request.headers["user-agent"],
  result: "success",
  metadata: { method: "password" },
});
```

### 2. Metrics

**Track:**

- Login success/failure rate
- Token verification latency
- API response times
- Active sessions count

### 3. Alerts

**Alert on:**

- ❌ High login failure rate (brute force attack)
- ❌ Token verification failures spike
- ❌ Database connection errors
- ❌ Unusual access patterns

---

**Next**: [05 - Implementation Guide](./05-implementation-guide.md)
