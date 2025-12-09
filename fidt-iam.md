# FIDT Identity - Technical Documentation

> **Version**: 1.0.0
> **Last Updated**: 2025-12-04
> **Status**: Production Ready

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture](#2-architecture)
3. [Core Concepts](#3-core-concepts)
4. [Authentication & Authorization Flows](#4-authentication--authorization-flows)
5. [Configuration](#5-configuration)
6. [Installation & Deployment](#6-installation--deployment)
7. [User Guide](#7-user-guide)
8. [API Reference](#8-api-reference)
9. [Security Considerations](#9-security-considerations)
10. [Troubleshooting](#10-troubleshooting)
11. [References](#11-references)

---

## 1. Introduction

### 1.1 Overview

**FIDT Identity** là một Identity and Access Management (IAM) platform tuân thủ chuẩn **OAuth 2.0** (RFC 6749) và **OpenID Connect 1.0**, được thiết kế để cung cấp giải pháp xác thực và ủy quyền tập trung cho hệ sinh thái ứng dụng FIDT.

### 1.2 Key Features

- **Standards-Compliant**: Tuân thủ OAuth 2.0 và OpenID Connect Core 1.0
- **Secure by Design**: JWT-based authentication với JWK rotation support
- **Flexible Integration**: Tích hợp với Directus CMS làm Identity Provider
- **API Gateway Pattern**: Saul RPC framework cho service orchestration
- **Scalable Architecture**: Stateless token-based authentication
- **Enterprise-Ready**: Support cho SSO, token revocation, session management

### 1.3 Technology Stack

| Component          | Technology         | Version |
| ------------------ | ------------------ | ------- |
| **Runtime**        | Node.js            | >= 18.x |
| **Framework**      | Nuxt 3             | 3.17.5  |
| **OIDC Provider**  | node-oidc-provider | 9.1.3   |
| **OAuth Client**   | openid-client      | 6.6.1   |
| **JWT Handling**   | jose               | 6.0.11  |
| **Identity Store** | Directus           | 19.x    |
| **RPC Framework**  | Saul               | 0.1.5   |
| **Language**       | TypeScript         | 5.9.2   |

### 1.4 Use Cases

1. **Single Sign-On (SSO)**: Đăng nhập một lần, truy cập nhiều ứng dụng
2. **Third-Party Integration**: Xác thực qua Azure AD, Google, Facebook
3. **API Security**: Bảo vệ REST/RPC APIs với JWT tokens
4. **User Management**: Quản lý users, roles, permissions tập trung
5. **Audit Trail**: Tracking authentication và authorization events

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Sales2 FE   │  │  Mobile App  │  │  3rd Party   │          │
│  │  (Browser)   │  │              │  │  Client      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ (1) HTTP + Cookies (access_token, id_token)
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────────┐
│         ▼                  ▼                  ▼                  │
│  ┌────────────────────────────────────────────────────┐         │
│  │         Saul API Gateway (RPC Framework)           │         │
│  │  ┌──────────────────────────────────────────────┐ │         │
│  │  │  - Token Verification (JWT + JWKS)           │ │         │
│  │  │  - TokenValidAfter Checking                  │ │         │
│  │  │  - Permission/Policy Validation              │ │         │
│  │  │  - Function Discovery & Routing              │ │         │
│  │  └──────────────────────────────────────────────┘ │         │
│  └────────────┬───────────────────────┬───────────────┘         │
│               │                       │                         │
│  (2) Verify Token          (3) Call Backend Service            │
│               │                       │                         │
└───────────────┼───────────────────────┼─────────────────────────┘
                │                       │
                ▼                       ▼
┌──────────────────────────────┐  ┌─────────────────────┐
│   FIDT Identity Service      │  │  Backend Services   │
│ ┌──────────────────────────┐ │  │  - Sales2 BE       │
│ │  OIDC Provider           │ │  │  - Customer BE     │
│ │  (node-oidc-provider)    │ │  │  - Order BE        │
│ │  ┌────────────────────┐  │ │  └─────────────────────┘
│ │  │ /authorize         │  │ │
│ │  │ /token             │  │ │
│ │  │ /userinfo          │  │ │
│ │  │ /jwks.json         │  │ │
│ │  └────────────────────┘  │ │
│ │                          │ │
│ │  Interaction UI          │ │
│ │  (Login/Consent Pages)   │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │  JWK Service             │ │
│ │  - Key Management        │ │
│ │  - JWT Signing/Verify    │ │
│ │  - Key Rotation          │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │  Directus Adapter        │ │
│ │  - OIDC Data Storage     │ │
│ │  - Session Management    │ │
│ └──────────┬───────────────┘ │
└────────────┼──────────────────┘
             │
             ▼
┌───────────────────────────────┐
│      Directus CMS             │
│                               │
│  Collections:                 │
│  - oidc_data (sessions,       │
│    tokens, grants)            │
│  - f_user (users)             │
│  - role_f_user (roles)        │
│  - policies                   │
│                               │
│  External Auth:               │
│  - Azure AD (SSO)             │
│  - Google OAuth               │
└───────────────────────────────┘
```

### 2.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FIDT Identity Service                     │
│                                                              │
│  ┌────────────────┐         ┌─────────────────┐            │
│  │  Auth API      │◄────────│  OIDC Provider  │            │
│  │  /api/auth/*   │         │  /api/oidc/*    │            │
│  └────────┬───────┘         └────────┬────────┘            │
│           │                          │                      │
│           │  ┌───────────────────────┼──────────┐          │
│           │  │                       │          │          │
│           ▼  ▼                       ▼          ▼          │
│  ┌────────────────┐         ┌─────────────────────────┐   │
│  │  State Storage │         │  Directus Adapter       │   │
│  │  Service       │         │  (OIDC Data Persistence)│   │
│  └────────────────┘         └──────────┬──────────────┘   │
│                                         │                  │
│  ┌────────────────┐         ┌──────────▼──────────────┐   │
│  │  JWK Service   │◄────────│  User Service           │   │
│  │                │         │  - getUserInfo          │   │
│  └────────────────┘         │  - getRoles             │   │
│                             │  - checkPermissions     │   │
│  ┌────────────────┐         └─────────────────────────┘   │
│  │  Saul Server   │                                        │
│  │  (RPC)         │                                        │
│  └────────────────┘                                        │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Directus SDK        │
        │  (REST Client)       │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Directus CMS        │
        │  (PostgreSQL/MySQL)  │
        └──────────────────────┘
```

### 2.3 Data Flow Architecture

#### 2.3.1 Token Lifecycle

```
┌─────────────┐
│ User Login  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│ 1. Authorization Request     │
│    /api/oidc/authorize       │
│    + response_type=code      │
│    + code_challenge (PKCE)   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 2. User Authentication       │
│    - Azure AD SSO            │
│    - Directus Auth           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 3. Authorization Code Issue  │
│    - Store in oidc_data      │
│    - Redirect to callback    │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 4. Token Exchange            │
│    POST /api/oidc/token      │
│    + code                    │
│    + code_verifier           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 5. JWT Token Issue           │
│    - Sign with JWK           │
│    - Include claims          │
│    - Set cookies             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 6. Token Usage               │
│    - API calls via Saul      │
│    - Token verification      │
│    - Permission check        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ 7. Token Expiration/Revoke   │
│    - Natural expiry (72h)    │
│    - Explicit logout         │
│    - TokenValidAfter check   │
└──────────────────────────────┘
```

---

## 3. Core Concepts

### 3.1 OAuth 2.0 & OpenID Connect

#### 3.1.1 OAuth 2.0 Authorization Code Flow

FIDT Identity sử dụng **Authorization Code Flow** với **PKCE (Proof Key for Code Exchange)** extension để bảo vệ chống authorization code interception attacks.

**Flow Steps:**

1. **Authorization Request**: Client redirect user đến authorization endpoint
2. **User Authentication**: User đăng nhập qua Identity Provider
3. **Authorization Grant**: Server issue authorization code
4. **Token Request**: Client exchange code + code_verifier để lấy tokens
5. **Token Response**: Server trả về access_token, id_token, refresh_token

**PKCE Mechanism:**

```
code_verifier = random_string(43-128 chars)
code_challenge = base64url(sha256(code_verifier))

Authorization Request: code_challenge + code_challenge_method=S256
Token Request: code_verifier
```

#### 3.1.2 OpenID Connect Tokens

**ID Token (JWT)**:

```json
{
  "iss": "https://identity.fidt.vn/api/oidc",
  "sub": "user123",
  "aud": "app",
  "exp": 1735891200,
  "iat": 1735804800,
  "email": "user@fidt.vn",
  "name": "John Doe",
  "roles": ["sales_manager", "admin"]
}
```

**Access Token (JWT)**:

```json
{
  "iss": "https://identity.fidt.vn/api/oidc",
  "sub": "user123",
  "aud": "app",
  "exp": 1735891200,
  "iat": 1735804800,
  "scope": "openid profile email",
  "client_id": "app",
  "jti": "token_unique_id"
}
```

### 3.2 JSON Web Keys (JWK)

#### 3.2.1 Key Management

FIDT Identity sử dụng **RSA-2048** asymmetric keys để sign và verify JWT tokens:

- **Private Key**: Lưu trong environment variables, dùng để sign tokens
- **Public Key**: Expose qua JWKS endpoint, dùng để verify tokens

**JWKS Endpoint**: `GET /api/oidc/jwks.json`

Response:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "primary_key_id",
      "use": "sig",
      "alg": "RS256",
      "n": "modulus...",
      "e": "AQAB"
    }
  ]
}
```

#### 3.2.2 Key Rotation

Support **Blue-Green Deployment** cho key rotation:

1. Generate secondary keys
2. Deploy với cả primary và secondary keys trong JWKS
3. Sau khi clients update cache, promote secondary → primary
4. Remove old primary keys

### 3.3 Directus Integration

#### 3.3.1 OIDC Data Storage

Directus collection `oidc_data` lưu trữ tất cả OIDC-related data:

| Field          | Type     | Description                            |
| -------------- | -------- | -------------------------------------- |
| `id`           | Integer  | Auto-increment primary key             |
| `internal_id`  | String   | OIDC identifier (unique index)         |
| `kind`         | String   | Data type (AccessToken, Session, etc.) |
| `value`        | JSON     | Payload data                           |
| `session_id`   | String   | Session UID (for Session kind)         |
| `date_created` | Datetime | Auto timestamp                         |

**Supported Kinds:**

- `AccessToken`: OAuth access tokens
- `AuthorizationCode`: Authorization codes (PKCE)
- `RefreshToken`: Refresh tokens
- `Session`: User sessions
- `Grant`: Authorization grants
- `Interaction`: User interactions (login, consent)
- `Client`: OAuth clients

#### 3.3.2 User Schema

Collection `f_user`:

- `id`: User ID (UUID)
- `email`: Email address (unique)
- `name`: Full name
- `given_name`: First name
- `family_name`: Last name
- `direct_manager`: Foreign key to manager
- `token_valid_after`: Timestamp for token revocation

**Role & Policy:**

- `role_f_user`: Junction table (users ↔ roles)
- Roles có field `policies`: JSON array of policy objects

### 3.4 Saul RPC Framework

#### 3.4.1 Architecture Pattern

Saul implements **API Gateway pattern** với **RPC-style** communication:

```
Client → Saul Gateway → Backend Service
         │
         ├─ Token Verification
         ├─ Permission Check
         └─ Function Routing
```

#### 3.4.2 Function Discovery

Saul tự động discover functions từ backend services:

```typescript
// Backend service exposes
export class CustomerService {
  async getList(params: { page: number; limit: number }) {
    // Implementation
  }
}

// Client gọi qua Saul
await saul.call("customer.getList", { page: 1, limit: 10 });
```

#### 3.4.3 Token Verification

**Multi-layer verification:**

1. **JWT Signature Verification**: Verify bằng JWKS public key
2. **Expiration Check**: Kiểm tra `exp` claim
3. **TokenValidAfter Check**: So sánh `iat` với user's `token_valid_after`
4. **Permission Check**: Validate user roles/policies

**TokenValidAfter Mechanism:**

```typescript
// Khi user logout hoặc revoke token
await updateUser(userId, {
  token_valid_after: Date.now() / 1000,
});

// Khi verify token
const token_iat = jwt_payload.iat;
const user_token_valid_after = await getUserTokenValidAfter(userId);

if (token_iat < user_token_valid_after) {
  throw new Error("Token revoked");
}
```

---

## 4. Authentication & Authorization Flows

### 4.1 Initial Authentication Flow

**Sequence Diagram:**

```
User          Sales2 FE      Identity BE    OIDC Provider   Directus
 │                │               │               │            │
 │  Access App    │               │               │            │
 ├───────────────>│               │               │            │
 │                │               │               │            │
 │                │ GET /api/auth/check           │            │
 │                ├──────────────>│               │            │
 │                │               │               │            │
 │                │◄--------------┤               │            │
 │                │  {success: false}             │            │
 │                │               │               │            │
 │                │ GET /api/auth/login           │            │
 │                ├──────────────>│               │            │
 │                │               │               │            │
 │                │               │ Generate state & code_verifier
 │                │               │               │            │
 │                │               │ Store state   │            │
 │                │               ├───────────────────────────>│
 │                │               │               │            │
 │                │               │ Redirect to /authorize     │
 │                │               ├──────────────>│            │
 │                │               │               │            │
 │                │               │ Render login UI            │
 │                │◄--------------┼---------------┤            │
 │                │               │               │            │
 │  Login with    │               │               │            │
 │  Azure AD      │               │               │            │
 ├───────────────>│               │               │            │
 │                │               │               │            │
 │                │               │               │ Azure Auth │
 │                │               │               ├───────────>│
 │                │               │               │            │
 │                │               │               │ User Info  │
 │                │               │               │<───────────┤
 │                │               │               │            │
 │                │               │ Authorization Code         │
 │                │               │<──────────────┤            │
 │                │               │               │            │
 │                │               │ Retrieve state & code_verifier
 │                │               ├───────────────────────────>│
 │                │               │               │            │
 │                │               │ POST /token   │            │
 │                │               │ + code        │            │
 │                │               │ + code_verifier            │
 │                │               ├──────────────>│            │
 │                │               │               │            │
 │                │               │ Validate & Sign JWT        │
 │                │               │               │            │
 │                │               │ access_token  │            │
 │                │               │ id_token      │            │
 │                │               │<──────────────┤            │
 │                │               │               │            │
 │                │ Redirect +    │               │            │
 │                │ Set Cookies   │               │            │
 │                │<──────────────┤               │            │
 │                │ - access_token                │            │
 │                │ - id_token                    │            │
 │                │ (domain: .fidt.vn)            │            │
```

**Implementation Details:**

1. **Check Authentication** (`GET /api/auth/check`):

```typescript
const accessToken = getCookie(event, "access_token");
if (!accessToken) {
  return { success: false };
}

const { payload } = await jwtVerify(accessToken, publicKey);
return { success: true, user: payload };
```

2. **Initialize Login** (`GET /api/auth/login`):

```typescript
const { redirectTo, state, code_verifier } = await oidcService.initFlow();

await StateStorageService.set(state, {
  redirectUri,
  code_verifier,
});

return sendRedirect(event, redirectTo.href);
```

3. **Token Exchange**:

```typescript
const { code, state } = getQuery(event);
const { code_verifier } = await StateStorageService.get(state);

const tokens = await authorizationCodeGrant(oidcConfig, callbackUrl, {
  pkceCodeVerifier: code_verifier,
  expectedState: state,
});

setCookie(event, "access_token", tokens.access_token, {
  expires: new Date(Date.now() + 72 * 60 * 60 * 1000),
  domain: ".fidt.vn",
  secure: true,
  sameSite: "none",
});
```

### 4.2 Saul API Call Flow

**Sequence Diagram:**

```
User      Sales2 FE         Saul          Identity BE      Backend Service
 │            │              │                 │                  │
 │  Action    │              │                 │                  │
 ├───────────>│              │                 │                  │
 │            │              │                 │                  │
 │            │ POST /api/saul                 │                  │
 │            │ + function   │                 │                  │
 │            │ + params     │                 │                  │
 │            │ + cookies    │                 │                  │
 │            ├─────────────>│                 │                  │
 │            │              │                 │                  │
 │            │              │ Verify JWT     │                  │
 │            │              │ (signature +   │                  │
 │            │              │  expiration)   │                  │
 │            │              │                 │                  │
 │            │              │ GET TokenValidAfter                │
 │            │              ├────────────────>│                  │
 │            │              │                 │                  │
 │            │              │<────────────────┤                  │
 │            │              │ user.token_valid_after             │
 │            │              │                 │                  │
 │            │              │ Check iat >= TokenValidAfter       │
 │            │              │                 │                  │
 │            │              │ Check permissions                  │
 │            │              │                 │                  │
 │            │              │ Route to backend                   │
 │            │              ├────────────────────────────────────>│
 │            │              │                 │                  │
 │            │              │                 │   Execute        │
 │            │              │                 │                  │
 │            │              │<────────────────────────────────────┤
 │            │              │                 │     Result       │
 │            │              │                 │                  │
 │            │<─────────────┤                 │                  │
 │            │   Result     │                 │                  │
 │<───────────┤              │                 │                  │
```

**Implementation:**

```typescript
// Saul token verification
const accessToken = getCookie(request, "access_token");

// 1. Verify JWT signature
const { payload } = await jwtVerify(accessToken, jwks, {
  issuer: "https://identity.fidt.vn/api/oidc",
  audience: "app",
});

// 2. Check expiration
if (payload.exp < Date.now() / 1000) {
  return { status: 401, error: "token_expired" };
}

// 3. Check TokenValidAfter
const userInfo = await saul.call("identity.getUserInfo", {
  userId: payload.sub,
});

if (payload.iat < userInfo.token_valid_after) {
  return { status: 401, error: "token_revoked" };
}

// 4. Check permissions
const hasPermission = checkUserPermission(userInfo.roles, requiredPermission);

if (!hasPermission) {
  return { status: 403, error: "forbidden" };
}

// 5. Route to backend
const result = await backendService[functionName](params);
return result;
```

### 4.3 Logout Flow

**Sequence:**

```typescript
// 1. Update TokenValidAfter
await updateUser(userId, {
  token_valid_after: Math.floor(Date.now() / 1000),
});

// 2. Clear cookies
deleteCookie(event, "access_token");
deleteCookie(event, "id_token");

// 3. Destroy OIDC session (optional)
await oidcProvider.Session.find(sessionId).then((session) => {
  session.destroy();
});

// 4. Redirect to login
return sendRedirect(event, "/");
```

### 4.4 Error Handling Flow

#### 4.4.1 Token Expired (401)

```
Saul → Frontend: 401 Unauthorized

Frontend Actions:
1. Display popup: "Phiên làm việc đã hết hạn"
2. User clicks "Đăng nhập lại"
3. Open new tab → /api/auth/login
4. After successful login:
   - Auto-close login tab
   - Auto-close popup
   - Retry failed request
```

#### 4.4.2 Forbidden (403)

```
Saul → Frontend: 403 Forbidden

Frontend Actions:
1. Display message: "Bạn không có quyền truy cập"
2. Log error for audit
```

---

## 5. Configuration

### 5.1 Environment Variables

#### 5.1.1 Core Configuration

```bash
# Application
ENV=production                    # local | uat | production
PORT=3000                         # Server port
PUBLIC_URL=https://identity.fidt.vn

# Directus Integration
DIRECTUS_URL=https://cms.fidt.vn
DIRECTUS_TOKEN=your_admin_token_here
```

#### 5.1.2 OIDC Configuration

```bash
# OAuth 2.0 Client
OIDC_CLIENT_ID=app
OIDC_CLIENT_SECRET=app-secret-change-in-production

# Token Configuration
TOKEN_PREFIX=prod                 # Optional: prefix for cookie names
```

#### 5.1.3 JWK Configuration

```bash
# Primary Keys (Required)
JWT_PRIMARY_PUBLIC_KEY='{"kty":"RSA","kid":"...","use":"sig","alg":"RS256","n":"...","e":"AQAB"}'
JWT_PRIMARY_PRIVATE_KEY='{"kty":"RSA","kid":"...","use":"sig","alg":"RS256","n":"...","e":"AQAB","d":"...","p":"...","q":"...","dp":"...","dq":"...","qi":"..."}'

# Secondary Keys (Optional - for key rotation)
JWT_SECONDARY_PUBLIC_KEY=''
JWT_SECONDARY_PRIVATE_KEY=''
```

**Generating Keys:**

```bash
pnpm generate-keys

# Advanced options
pnpm generate-keys -t RSA -s 4096    # RSA 4096-bit
pnpm generate-keys -t EC -c P-256    # Elliptic Curve P-256
pnpm generate-keys -f .env.keys      # Save to file
```

#### 5.1.4 Token TTL Configuration

```bash
# All values in seconds

# Access Token (72 hours default)
ACCESS_TOKEN_TTL=259200

# ID Token (72 hours default)
ID_TOKEN_TTL=259200

# Refresh Token (24 hours default)
REFRESH_TOKEN_TTL=86400

# Session (24 hours default)
SESSION_TTL=86400

# Authorization Code (10 minutes)
AUTHORIZATION_CODE_TTL=600

# Grant (24 hours)
GRANT_TTL=86400

# Interaction (1 hour)
INTERACTION_TTL=3600
```

#### 5.1.5 Feature Flags

```bash
# Bypass extra token claims validation (for debugging only)
BYPASS_EXTRA_TOKEN_CLAIMS=false
```

### 5.2 OIDC Provider Configuration

File: `server/api/oidc/configuration/index.ts`

```typescript
export function getConfiguration(): Configuration {
  return {
    // Adapter for data persistence
    adapter: OidcDirectusAdapter,

    // OAuth clients
    clients: [
      {
        client_id: "app",
        client_secret: "app-secret",
        grant_types: ["authorization_code", "refresh_token"],
        redirect_uris: ["https://app.fidt.vn/callback"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_post",
      },
    ],

    // OIDC features
    features: {
      devInteractions: { enabled: false },
      deviceFlow: { enabled: false },
      revocation: { enabled: true },
      introspection: { enabled: true },
    },

    // JWT signing
    jwks: () => jwkService.getPrivateJWKS(),

    // Token TTLs
    ttl: {
      AccessToken: Number(process.env.ACCESS_TOKEN_TTL) || 259200,
      AuthorizationCode: Number(process.env.AUTHORIZATION_CODE_TTL) || 600,
      IdToken: Number(process.env.ID_TOKEN_TTL) || 259200,
      RefreshToken: Number(process.env.REFRESH_TOKEN_TTL) || 86400,
      Session: Number(process.env.SESSION_TTL) || 86400,
      Grant: Number(process.env.GRANT_TTL) || 86400,
      Interaction: Number(process.env.INTERACTION_TTL) || 3600,
    },

    // Account lookup
    findAccount: async (ctx, sub) => {
      const userService = new UserService();
      const user = await userService.getUserDetailsById(sub);
      return {
        accountId: sub,
        async claims() {
          return {
            sub,
            email: user.email,
            name: user.name,
            given_name: user.given_name,
            family_name: user.family_name,
          };
        },
      };
    },

    // Extra JWT claims
    extraTokenClaims: async (ctx, token) => {
      if (process.env.BYPASS_EXTRA_TOKEN_CLAIMS === "true") {
        return {};
      }

      const userService = new UserService();
      const userDetails = await userService.getUserDetailsById(token.accountId);

      return {
        roles: userDetails.roles.map((r) => r.id),
        policies: userDetails.roles.flatMap((r) => r.policies),
      };
    },
  };
}
```

### 5.3 Directus Schema Setup

#### 5.3.1 OIDC Data Collection

Run setup script:

```bash
pnpm setup-oidc
```

This creates:

```sql
CREATE TABLE oidc_data (
  id SERIAL PRIMARY KEY,
  internal_id VARCHAR(255) UNIQUE NOT NULL,
  kind VARCHAR(50) NOT NULL,
  value JSONB NOT NULL,
  session_id VARCHAR(255),
  date_created TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_oidc_internal_id ON oidc_data(internal_id);
CREATE INDEX idx_oidc_kind ON oidc_data(kind);
CREATE INDEX idx_oidc_session_id ON oidc_data(session_id);
```

#### 5.3.2 User Schema

Required collections in Directus:

**f_user:**

```typescript
{
  id: string,
  email: string,
  name: string,
  given_name: string,
  family_name: string,
  direct_manager: string,  // FK to f_user
  token_valid_after: number  // Unix timestamp
}
```

**role_f_user (junction):**

```typescript
{
  id: number,
  f_user_id: string,  // FK to f_user
  role_id: string     // FK to roles
}
```

**roles:**

```typescript
{
  id: string,
  name: string,
  policies: object[]  // Array of policy objects
}
```

### 5.4 Cookie Configuration

```typescript
// Production cookie settings
setCookie(event, "access_token", token, {
  expires: new Date(Date.now() + 72 * 60 * 60 * 1000),
  domain: ".fidt.vn", // Shared domain for all FIDT apps
  path: "/",
  secure: true, // HTTPS only
  httpOnly: false, // Allow JavaScript access
  sameSite: "none", // Cross-site requests allowed
});
```

**Cookie Attributes:**

| Attribute  | Value      | Reason                          |
| ---------- | ---------- | ------------------------------- |
| `domain`   | `.fidt.vn` | Share cookies across subdomains |
| `secure`   | `true`     | Only send over HTTPS            |
| `httpOnly` | `false`    | Frontend needs to read token    |
| `sameSite` | `none`     | Enable cross-site requests      |
| `expires`  | 72 hours   | Match access token TTL          |

### 5.5 Saul Configuration

**Server Configuration** (`packages/saul/services/server/.env`):

```bash
# JWKS URL for token verification
JWKS_URL=https://identity.fidt.vn/api/oidc/jwks.json

# Token validation
TOKEN_ISSUER=https://identity.fidt.vn/api/oidc
TOKEN_AUDIENCE=app

# Server
PORT=3001
```

**Client Configuration**:

```typescript
import { SaulClient } from "@fidt/saul-client";

const saul = new SaulClient({
  baseURL: "https://saul.fidt.vn",
  credentials: "include", // Send cookies
});

// Call function
const result = await saul.call("customer.getList", {
  page: 1,
  limit: 10,
});
```

---

## 6. Installation & Deployment

### 6.1 Prerequisites

**System Requirements:**

- **Operating System**: Linux, macOS, or Windows WSL2
- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0 (or npm >= 9.0.0)
- **PostgreSQL/MySQL**: For Directus (if self-hosted)

**External Services:**

- **Directus Instance**: Running and accessible
- **Domain**: With SSL certificate (production)

### 6.2 Local Development Setup

#### Step 1: Clone Repository

```bash
git clone https://github.com/fidt/fidt-identity.git
cd fidt-identity/modules/identity
```

#### Step 2: Install Dependencies

```bash
pnpm install
```

#### Step 3: Configure Environment

```bash
# Copy template
cp env.template .env

# Edit .env
nano .env
```

Required variables:

```bash
DIRECTUS_URL=http://localhost:8055
DIRECTUS_TOKEN=your_admin_token
PUBLIC_URL=http://localhost:3000
```

#### Step 4: Generate JWK Keys

```bash
pnpm generate-keys
```

Copy output to `.env`:

```bash
JWT_PRIMARY_PUBLIC_KEY="..."
JWT_PRIMARY_PRIVATE_KEY="..."
```

#### Step 5: Setup Directus

```bash
# Create OIDC table
pnpm setup-oidc

# Test connection
pnpm test-directus
```

#### Step 6: Run Development Server

```bash
pnpm dev
```

Application will run at `http://localhost:3000`

#### Step 7: Verify Installation

```bash
# Check JWKS endpoint
curl http://localhost:3000/api/oidc/jwks.json

# Check OIDC discovery
curl http://localhost:3000/api/oidc/.well-known/openid-configuration
```

### 6.3 Production Deployment

#### 6.3.1 Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build application
RUN pnpm build

# Production image
FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy built application
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

**Docker Compose:**

```yaml
version: "3.8"

services:
  identity:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ENV=production
      - DIRECTUS_URL=${DIRECTUS_URL}
      - DIRECTUS_TOKEN=${DIRECTUS_TOKEN}
      - JWT_PRIMARY_PUBLIC_KEY=${JWT_PRIMARY_PUBLIC_KEY}
      - JWT_PRIMARY_PRIVATE_KEY=${JWT_PRIMARY_PRIVATE_KEY}
      - PUBLIC_URL=https://identity.fidt.vn
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--spider",
          "-q",
          "http://localhost:3000/api/oidc/jwks.json",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Build & Run:**

```bash
# Build image
docker build -t fidt-identity:1.0.0 .

# Run container
docker-compose up -d

# Check logs
docker-compose logs -f identity
```

#### 6.3.2 Kubernetes Deployment

**Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: identity-secrets
  namespace: fidt
type: Opaque
stringData:
  DIRECTUS_TOKEN: "admin_token_here"
  JWT_PRIMARY_PUBLIC_KEY: '{"kty":"RSA",...}'
  JWT_PRIMARY_PRIVATE_KEY: '{"kty":"RSA",...}'
```

**ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: identity-config
  namespace: fidt
data:
  ENV: "production"
  DIRECTUS_URL: "https://cms.fidt.vn"
  PUBLIC_URL: "https://identity.fidt.vn"
  ACCESS_TOKEN_TTL: "259200"
  OIDC_CLIENT_ID: "app"
```

**Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: identity
  namespace: fidt
spec:
  replicas: 3
  selector:
    matchLabels:
      app: identity
  template:
    metadata:
      labels:
        app: identity
    spec:
      containers:
        - name: identity
          image: fidt-identity:1.0.0
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: identity-config
            - secretRef:
                name: identity-secrets
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/oidc/jwks.json
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/oidc/jwks.json
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

**Service:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: identity-service
  namespace: fidt
spec:
  selector:
    app: identity
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

**Ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: identity-ingress
  namespace: fidt
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - identity.fidt.vn
      secretName: identity-tls
  rules:
    - host: identity.fidt.vn
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: identity-service
                port:
                  number: 80
```

**Deploy:**

```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n fidt
kubectl logs -f deployment/identity -n fidt

# Scale replicas
kubectl scale deployment/identity --replicas=5 -n fidt
```

#### 6.3.3 Environment-Specific Configurations

**Production (`. env.production`):**

```bash
ENV=production
PUBLIC_URL=https://identity.fidt.vn
DIRECTUS_URL=https://cms.fidt.vn

# Use strong secrets
OIDC_CLIENT_SECRET=<strong-random-secret>

# Production key rotation
JWT_PRIMARY_PUBLIC_KEY=<production-key>
JWT_PRIMARY_PRIVATE_KEY=<production-key>
JWT_SECONDARY_PUBLIC_KEY=<backup-key>
JWT_SECONDARY_PRIVATE_KEY=<backup-key>

# Extended TTLs for production
ACCESS_TOKEN_TTL=259200  # 72 hours
SESSION_TTL=86400        # 24 hours
```

**UAT (`.env.uat`):**

```bash
ENV=uat
PUBLIC_URL=https://identity-uat.fidt.vn
DIRECTUS_URL=https://cms-uat.fidt.vn

# Shorter TTLs for testing
ACCESS_TOKEN_TTL=3600    # 1 hour
SESSION_TTL=7200         # 2 hours
```

### 6.4 SSL/TLS Configuration

#### Development (Self-Signed Certificate):

```bash
# Generate private key
openssl genrsa -out server.key 2048

# Generate self-signed certificate
openssl req -new -x509 -key server.key -out server.crt -days 365 \
  -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=FIDT/CN=localhost"

# Use in Nuxt config
export default defineNuxtConfig({
  devServer: {
    https: {
      key: 'server.key',
      cert: 'server.crt'
    }
  }
});
```

#### Production (Let's Encrypt):

**Using Certbot:**

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d identity.fidt.vn

# Certificates will be in:
# /etc/letsencrypt/live/identity.fidt.vn/fullchain.pem
# /etc/letsencrypt/live/identity.fidt.vn/privkey.pem

# Auto-renewal (add to crontab)
0 0 * * * certbot renew --quiet
```

**Using cert-manager (Kubernetes):**

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@fidt.vn
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### 6.5 Monitoring & Logging

#### Application Logging:

```typescript
// Configure structured logging
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

// Log important events
logger.info({ event: "authorization_code_issued", userId, code });
logger.warn({ event: "token_expired", userId, exp });
logger.error({ event: "token_verification_failed", error });
```

#### Health Checks:

```typescript
// server/api/health.ts
export default defineEventHandler(async (event) => {
  const checks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      directus: await checkDirectusConnection(),
      jwks: await checkJWKSAvailability(),
      oidc: await checkOIDCProvider(),
    },
  };

  const isHealthy = Object.values(checks.checks).every(
    (c) => c.status === "ok"
  );

  return {
    ...checks,
    status: isHealthy ? "healthy" : "degraded",
  };
});
```

#### Metrics (Prometheus):

```typescript
import { register, Counter, Histogram } from "prom-client";

// Define metrics
const authAttempts = new Counter({
  name: "auth_attempts_total",
  help: "Total authentication attempts",
  labelNames: ["status"],
});

const tokenVerificationDuration = new Histogram({
  name: "token_verification_duration_seconds",
  help: "Token verification duration",
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Expose metrics endpoint
export default defineEventHandler(async (event) => {
  return register.metrics();
});
```

---

## 7. User Guide

### 7.1 Frontend Integration

#### 7.1.1 Check Authentication Status

```typescript
// utils/auth.ts
export async function checkAuthStatus() {
  try {
    const response = await fetch("https://identity.fidt.vn/api/auth/check", {
      credentials: "include", // Important: send cookies
    });

    if (!response.ok) {
      return { authenticated: false };
    }

    const data = await response.json();

    if (data.success) {
      return {
        authenticated: true,
        user: data.user,
        roles: data.authorizeInfo.roles,
        policies: data.authorizeInfo.roles.flatMap((r) => r.policies),
      };
    }

    return { authenticated: false };
  } catch (error) {
    console.error("Auth check failed:", error);
    return { authenticated: false };
  }
}
```

**Usage:**

```typescript
// pages/index.vue
<script setup>
import { onMounted, ref } from 'vue';
import { checkAuthStatus } from '~/utils/auth';

const authState = ref({ authenticated: false, user: null });

onMounted(async () => {
  authState.value = await checkAuthStatus();

  if (!authState.value.authenticated) {
    // Redirect to login
    window.location.href = 'https://identity.fidt.vn/api/auth/login?redirect=' +
      encodeURIComponent(window.location.href);
  }
});
</script>

<template>
  <div v-if="authState.authenticated">
    <h1>Welcome, {{ authState.user.name }}</h1>
    <p>Roles: {{ authState.roles.map(r => r.name).join(', ') }}</p>
  </div>
  <div v-else>
    <p>Redirecting to login...</p>
  </div>
</template>
```

#### 7.1.2 Manual Login Redirect

```typescript
// utils/auth.ts
export function redirectToLogin(returnUrl?: string) {
  const redirect = returnUrl || window.location.href;
  const loginUrl = `https://identity.fidt.vn/api/auth/login?redirect=${encodeURIComponent(
    redirect
  )}`;
  window.location.href = loginUrl;
}
```

**Usage:**

```vue
<template>
  <button @click="handleLogin">Đăng nhập</button>
</template>

<script setup>
import { redirectToLogin } from "~/utils/auth";

function handleLogin() {
  redirectToLogin();
}
</script>
```

#### 7.1.3 Logout

```typescript
// utils/auth.ts
export async function logout() {
  try {
    await fetch("https://identity.fidt.vn/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Redirect to home or login
    window.location.href = "https://identity.fidt.vn";
  } catch (error) {
    console.error("Logout failed:", error);
  }
}
```

#### 7.1.4 Reading Tokens from Cookies

```typescript
// utils/cookies.ts
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }

  return null;
}

// utils/jwt.ts
import { jwtDecode } from "jwt-decode";

export function decodeAccessToken() {
  const token = getCookie("access_token");

  if (!token) {
    return null;
  }

  try {
    return jwtDecode(token);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}
```

**Usage:**

```typescript
const tokenPayload = decodeAccessToken();

if (tokenPayload) {
  console.log("User ID:", tokenPayload.sub);
  console.log("Expires:", new Date(tokenPayload.exp * 1000));
  console.log("Roles:", tokenPayload.roles);
}
```

### 7.2 Calling APIs via Saul

#### 7.2.1 Basic API Call

```typescript
// composables/useSaul.ts
export function useSaul() {
  async function call(module: string, functionName: string, params: any) {
    try {
      const response = await fetch("https://saul.fidt.vn/api/saul", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Send cookies
        body: JSON.stringify({
          module,
          function: functionName,
          params: [params],
        }),
      });

      if (response.status === 401) {
        // Token expired
        handleTokenExpired();
        throw new Error("Authentication required");
      }

      if (response.status === 403) {
        throw new Error("Permission denied");
      }

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Saul call failed:", error);
      throw error;
    }
  }

  return { call };
}

function handleTokenExpired() {
  // Show re-login popup
  const confirmed = confirm("Phiên làm việc đã hết hạn. Đăng nhập lại?");

  if (confirmed) {
    const loginWindow = window.open(
      "https://identity.fidt.vn/api/auth/login?redirect=" +
        encodeURIComponent(window.location.href),
      "login",
      "width=600,height=700"
    );

    // Listen for login completion
    window.addEventListener("message", (event) => {
      if (event.data.type === "login_success") {
        loginWindow?.close();
        // Retry failed request
        window.location.reload();
      }
    });
  }
}
```

**Usage Example:**

```vue
<template>
  <div>
    <button @click="loadCustomers" :disabled="loading">Load Customers</button>

    <ul v-if="customers.length">
      <li v-for="customer in customers" :key="customer.id">
        {{ customer.name }} - {{ customer.email }}
      </li>
    </ul>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useSaul } from "~/composables/useSaul";

const saul = useSaul();
const customers = ref([]);
const loading = ref(false);
const error = ref("");

async function loadCustomers() {
  loading.value = true;
  error.value = "";

  try {
    const result = await saul.call("customer", "getList", {
      page: 1,
      limit: 20,
      filters: {},
    });

    customers.value = result.data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>
```

#### 7.2.2 Type-Safe Saul Client

```typescript
// types/saul.ts
export interface SaulFunction {
  module: string;
  function: string;
  params: any[];
}

export interface CustomerListParams {
  page: number;
  limit: number;
  filters?: Record<string, any>;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// utils/saul-client.ts
import type {
  CustomerListParams,
  Customer,
  PaginatedResponse,
} from "~/types/saul";

export class SaulClient {
  private baseURL = "https://saul.fidt.vn";

  async call<T = any>(
    module: string,
    functionName: string,
    params: any
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}/api/saul`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        module,
        function: functionName,
        params: [params],
      }),
    });

    if (!response.ok) {
      throw new Error(`Saul call failed: ${response.status}`);
    }

    return response.json();
  }

  // Type-safe methods
  async getCustomerList(
    params: CustomerListParams
  ): Promise<PaginatedResponse<Customer>> {
    return this.call("customer", "getList", params);
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.call("customer", "getById", { id });
  }
}

// Usage
const saul = new SaulClient();
const customers = await saul.getCustomerList({ page: 1, limit: 10 });
// customers is typed as PaginatedResponse<Customer>
```

#### 7.2.3 Error Handling Best Practices

```typescript
// composables/useSaulErrorHandler.ts
export function useSaulErrorHandler() {
  function handleError(error: any, context?: string) {
    console.error(`Saul error${context ? ` in ${context}` : ""}:`, error);

    if (error.response?.status === 401) {
      // Token expired
      showTokenExpiredDialog();
    } else if (error.response?.status === 403) {
      // Permission denied
      showPermissionDeniedNotification();
    } else if (error.response?.status === 500) {
      // Server error
      showServerErrorNotification();
    } else {
      // Generic error
      showGenericErrorNotification(error.message);
    }
  }

  function showTokenExpiredDialog() {
    // Implementation using your UI library
    const dialog = useDialog();
    dialog.open({
      title: "Phiên làm việc đã hết hạn",
      message: "Vui lòng đăng nhập lại để tiếp tục",
      actions: [
        {
          label: "Đăng nhập lại",
          onClick: () => redirectToLogin(),
        },
      ],
    });
  }

  function showPermissionDeniedNotification() {
    const toast = useToast();
    toast.error("Bạn không có quyền thực hiện thao tác này");
  }

  function showServerErrorNotification() {
    const toast = useToast();
    toast.error("Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau");
  }

  function showGenericErrorNotification(message: string) {
    const toast = useToast();
    toast.error(message || "Đã xảy ra lỗi");
  }

  return { handleError };
}
```

### 7.3 Backend Service Development

#### 7.3.1 Creating a Saul Function

**Step 1: Define Service Class**

```typescript
// server/saul/controllers/customer/customerService.ts
import type { PaginatedParams, PaginatedResponse } from "~/types";
import type { Customer } from "~/types/customer";

export class CustomerService {
  /**
   * Get paginated customer list
   */
  async getList(
    params: PaginatedParams & { filters?: Record<string, any> }
  ): Promise<PaginatedResponse<Customer>> {
    const { page = 1, limit = 20, filters = {} } = params;

    // Your implementation
    const directus = useDirectus();
    const result = await directus.items("customers").readByQuery({
      page,
      limit,
      filter: filters,
    });

    return {
      data: result.data,
      total: result.meta.total_count,
      page,
      limit,
    };
  }

  /**
   * Get customer by ID
   */
  async getById(params: { id: string }): Promise<Customer> {
    const directus = useDirectus();
    return directus.items("customers").readOne(params.id);
  }

  /**
   * Create new customer
   */
  async create(params: Omit<Customer, "id">): Promise<Customer> {
    const directus = useDirectus();
    return directus.items("customers").createOne(params);
  }

  /**
   * Update customer
   */
  async update(params: {
    id: string;
    data: Partial<Customer>;
  }): Promise<Customer> {
    const directus = useDirectus();
    return directus.items("customers").updateOne(params.id, params.data);
  }

  /**
   * Delete customer
   */
  async delete(params: { id: string }): Promise<void> {
    const directus = useDirectus();
    await directus.items("customers").deleteOne(params.id);
  }
}
```

**Step 2: Register with Saul**

```typescript
// server/saul/index.ts
import { CustomerService } from "./controllers/customer/customerService";

export function registerSaulFunctions(saul: SaulServer) {
  const customerService = new CustomerService();

  saul.register(
    "customer.getList",
    customerService.getList.bind(customerService)
  );
  saul.register(
    "customer.getById",
    customerService.getById.bind(customerService)
  );
  saul.register(
    "customer.create",
    customerService.create.bind(customerService)
  );
  saul.register(
    "customer.update",
    customerService.update.bind(customerService)
  );
  saul.register(
    "customer.delete",
    customerService.delete.bind(customerService)
  );
}
```

**Step 3: Add Permission Checks**

```typescript
// server/saul/middleware/permissions.ts
export function requirePermission(permission: string) {
  return async (context: SaulContext, next: () => Promise<any>) => {
    const { user } = context;

    if (!user) {
      throw new Error("Unauthorized");
    }

    const hasPermission = checkUserPermission(user.roles, permission);

    if (!hasPermission) {
      throw new Error("Forbidden: Missing permission " + permission);
    }

    return next();
  };
}

// Usage
saul.register(
  "customer.delete",
  requirePermission("customer:delete"),
  customerService.delete.bind(customerService)
);
```

#### 7.3.2 Testing Saul Functions

```typescript
// test/saul/customer.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { SaulClient } from "@fidt/saul-client";

describe("Customer Service", () => {
  let saul: SaulClient;
  let testCustomerId: string;

  beforeAll(() => {
    saul = new SaulClient({
      baseURL: "http://localhost:3001",
      // Use test credentials
      headers: {
        Authorization: "Bearer test_token",
      },
    });
  });

  it("should create a customer", async () => {
    const result = await saul.call("customer.create", {
      name: "Test Customer",
      email: "test@example.com",
      phone: "0123456789",
    });

    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Test Customer");

    testCustomerId = result.id;
  });

  it("should get customer by ID", async () => {
    const result = await saul.call("customer.getById", {
      id: testCustomerId,
    });

    expect(result.id).toBe(testCustomerId);
    expect(result.email).toBe("test@example.com");
  });

  it("should update customer", async () => {
    const result = await saul.call("customer.update", {
      id: testCustomerId,
      data: {
        name: "Updated Name",
      },
    });

    expect(result.name).toBe("Updated Name");
  });

  it("should delete customer", async () => {
    await saul.call("customer.delete", {
      id: testCustomerId,
    });

    // Verify deleted
    await expect(
      saul.call("customer.getById", { id: testCustomerId })
    ).rejects.toThrow();
  });
});
```

### 7.4 User & Role Management

#### 7.4.1 Get Current User Info

```typescript
// Frontend
const { call } = useSaul();

const userInfo = await call("identity", "getUserInfo", {
  userId: "current", // or specific user ID
});

console.log(userInfo);
// {
//   id: 'user123',
//   email: 'user@fidt.vn',
//   name: 'John Doe',
//   roles: [
//     {
//       id: 'sales_manager',
//       name: 'Sales Manager',
//       policies: ['customer:read', 'customer:write', 'order:read']
//     }
//   ],
//   manager: {
//     id: 'manager123',
//     name: 'Jane Manager'
//   },
//   subordinates: [
//     { id: 'sub1', name: 'Sub 1' }
//   ]
// }
```

#### 7.4.2 Check Permissions

```typescript
// utils/permissions.ts
export function hasPermission(
  userRoles: Role[],
  requiredPermission: string
): boolean {
  const allPolicies = userRoles.flatMap((role) => role.policies);
  return allPolicies.includes(requiredPermission);
}

// Usage
const userInfo = await call("identity", "getUserInfo", { userId: "current" });
const canDeleteCustomer = hasPermission(userInfo.roles, "customer:delete");

if (canDeleteCustomer) {
  // Show delete button
}
```

#### 7.4.3 Create User

```typescript
// Backend (via Directus)
import { DirectusDbService } from "~/services/directusDb.service";
import { createItem } from "@directus/sdk";

const directus = new DirectusDbService().getClient();

const newUser = await directus.request(
  createItem("f_user", {
    email: "newuser@fidt.vn",
    name: "New User",
    given_name: "New",
    family_name: "User",
    direct_manager: "manager_id",
  })
);

// Assign role
await directus.request(
  createItem("role_f_user", {
    f_user_id: newUser.id,
    role_id: "sales_staff",
  })
);
```

#### 7.4.4 Revoke User Tokens

```typescript
// When user logs out or password changes
import { updateItem } from "@directus/sdk";

await directus.request(
  updateItem("f_user", userId, {
    token_valid_after: Math.floor(Date.now() / 1000),
  })
);

// All tokens issued before this timestamp will be invalid
```

---

## 8. API Reference

### 8.1 Authentication Endpoints

#### `GET /api/auth/check`

Check current authentication status.

**Request:**

```http
GET /api/auth/check HTTP/1.1
Host: identity.fidt.vn
Cookie: access_token=eyJhbGc...
```

**Response (Authenticated):**

```json
{
  "success": true,
  "user": {
    "sub": "user123",
    "email": "user@fidt.vn",
    "name": "John Doe",
    "exp": 1735891200,
    "iat": 1735804800
  },
  "authorizeInfo": {
    "roles": [
      {
        "id": "sales_manager",
        "name": "Sales Manager",
        "policies": ["customer:read", "customer:write"]
      }
    ]
  }
}
```

**Response (Not Authenticated):**

```json
{
  "success": false
}
```

#### `GET /api/auth/login`

Initialize login flow.

**Request:**

```http
GET /api/auth/login?redirect=https://app.fidt.vn HTTP/1.1
Host: identity.fidt.vn
```

**Parameters:**

| Name       | Type    | Required | Description                 |
| ---------- | ------- | -------- | --------------------------- |
| `redirect` | string  | No       | URL to redirect after login |
| `force`    | boolean | No       | Force re-authentication     |

**Response:**

```http
HTTP/1.1 302 Found
Location: /api/oidc/authorize?client_id=app&response_type=code&...
```

#### `GET /api/auth/callback`

OAuth callback endpoint.

**Request:**

```http
GET /api/auth/callback?code=auth_code&state=state_value HTTP/1.1
Host: identity.fidt.vn
```

**Response:**

```http
HTTP/1.1 302 Found
Location: https://app.fidt.vn
Set-Cookie: access_token=eyJhbGc...; Domain=.fidt.vn; Secure; SameSite=None
Set-Cookie: id_token=eyJhbGc...; Domain=.fidt.vn; Secure; SameSite=None
```

#### `POST /api/auth/logout`

Logout and revoke tokens.

**Request:**

```http
POST /api/auth/logout HTTP/1.1
Host: identity.fidt.vn
Cookie: access_token=eyJhbGc...
```

**Response:**

```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: access_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT
Set-Cookie: id_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

### 8.2 OIDC Endpoints

#### `GET /.well-known/openid-configuration`

OIDC Discovery endpoint.

**Request:**

```http
GET /.well-known/openid-configuration HTTP/1.1
Host: identity.fidt.vn
```

**Response:**

```json
{
  "issuer": "https://identity.fidt.vn/api/oidc",
  "authorization_endpoint": "https://identity.fidt.vn/api/oidc/authorize",
  "token_endpoint": "https://identity.fidt.vn/api/oidc/token",
  "userinfo_endpoint": "https://identity.fidt.vn/api/oidc/userinfo",
  "jwks_uri": "https://identity.fidt.vn/api/oidc/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "token_endpoint_auth_methods_supported": ["client_secret_post"],
  "code_challenge_methods_supported": ["S256"]
}
```

#### `GET /api/oidc/authorize`

Authorization endpoint (OAuth 2.0).

**Request:**

```http
GET /api/oidc/authorize?
  client_id=app&
  response_type=code&
  redirect_uri=https://app.fidt.vn/callback&
  scope=openid%20profile%20email&
  state=random_state&
  code_challenge=challenge&
  code_challenge_method=S256 HTTP/1.1
Host: identity.fidt.vn
```

**Parameters:**

| Name                    | Type   | Required | Description            |
| ----------------------- | ------ | -------- | ---------------------- |
| `client_id`             | string | Yes      | OAuth client ID        |
| `response_type`         | string | Yes      | Must be "code"         |
| `redirect_uri`          | string | Yes      | Callback URL           |
| `scope`                 | string | Yes      | Space-separated scopes |
| `state`                 | string | Yes      | CSRF protection token  |
| `code_challenge`        | string | Yes      | PKCE challenge         |
| `code_challenge_method` | string | Yes      | PKCE method (S256)     |

**Response:**

```http
HTTP/1.1 302 Found
Location: https://app.fidt.vn/callback?code=auth_code&state=random_state
```

#### `POST /api/oidc/token`

Token endpoint (OAuth 2.0).

**Request:**

```http
POST /api/oidc/token HTTP/1.1
Host: identity.fidt.vn
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=auth_code&
redirect_uri=https://app.fidt.vn/callback&
client_id=app&
client_secret=app-secret&
code_verifier=verifier_string
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 259200,
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "refresh_token_value",
  "scope": "openid profile email"
}
```

#### `GET /api/oidc/userinfo`

UserInfo endpoint (OIDC).

**Request:**

```http
GET /api/oidc/userinfo HTTP/1.1
Host: identity.fidt.vn
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response:**

```json
{
  "sub": "user123",
  "email": "user@fidt.vn",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe"
}
```

#### `GET /api/oidc/jwks.json`

JSON Web Key Set endpoint.

**Request:**

```http
GET /api/oidc/jwks.json HTTP/1.1
Host: identity.fidt.vn
```

**Response:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "primary_key_2024",
      "use": "sig",
      "alg": "RS256",
      "n": "modulus_base64url",
      "e": "AQAB"
    }
  ]
}
```

### 8.3 Saul RPC Endpoints

#### `POST /api/saul`

Execute RPC function call.

**Request:**

```http
POST /api/saul HTTP/1.1
Host: saul.fidt.vn
Content-Type: application/json
Cookie: access_token=eyJhbGc...

{
  "module": "customer",
  "function": "getList",
  "params": [
    {
      "page": 1,
      "limit": 20,
      "filters": {
        "status": "active"
      }
    }
  ]
}
```

**Response (Success):**

```json
{
  "data": [
    {
      "id": "cust_001",
      "name": "Customer 1",
      "email": "customer1@example.com",
      "phone": "0123456789"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**Response (Error - 401 Unauthorized):**

```json
{
  "error": "token_expired",
  "message": "Access token has expired"
}
```

**Response (Error - 403 Forbidden):**

```json
{
  "error": "forbidden",
  "message": "Missing required permission: customer:read"
}
```

### 8.4 User Management Endpoints

#### Saul Function: `identity.getUserInfo`

Get user information with roles and permissions.

**Request:**

```typescript
await saul.call("identity.getUserInfo", {
  userId: "user123", // or 'current' for authenticated user
});
```

**Response:**

```json
{
  "id": "user123",
  "email": "user@fidt.vn",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "roles": [
    {
      "id": "sales_manager",
      "name": "Sales Manager",
      "policies": ["customer:read", "customer:write", "order:read"]
    }
  ],
  "manager": {
    "id": "manager123",
    "name": "Jane Manager",
    "email": "manager@fidt.vn"
  },
  "subordinates": [
    {
      "id": "sub1",
      "name": "Sub 1"
    }
  ],
  "token_valid_after": 1735804800
}
```

---

## 9. Security Considerations

### 9.1 OAuth 2.0 Security

#### 9.1.1 PKCE (Proof Key for Code Exchange)

**Implementation:**

```typescript
// Generate code verifier (43-128 characters)
function generateCodeVerifier(): string {
  return base64urlEncode(crypto.randomBytes(32));
}

// Generate code challenge
async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64urlEncode(hash);
}

// Authorization request
const verifier = generateCodeVerifier();
const challenge = await generateCodeChallenge(verifier);

// Store verifier for later use
await stateStorage.set(state, { code_verifier: verifier });

// Redirect to authorize endpoint
const authorizeUrl = new URL("/api/oidc/authorize", issuer);
authorizeUrl.searchParams.set("code_challenge", challenge);
authorizeUrl.searchParams.set("code_challenge_method", "S256");
```

**Why PKCE:**

- Prevents authorization code interception attacks
- Required for public clients (SPAs, mobile apps)
- Recommended even for confidential clients
- No secret needed on client side

#### 9.1.2 State Parameter

**Purpose:** CSRF protection

**Implementation:**

```typescript
// Generate random state
const state = crypto.randomBytes(16).toString("hex");

// Store in server-side session
await stateStorage.set(state, {
  created: Date.now(),
  redirectUri: callbackUrl,
});

// Verify on callback
const { state: receivedState } = getQuery(event);
const storedData = await stateStorage.get(receivedState);

if (!storedData) {
  throw new Error("Invalid state parameter");
}

// Check expiration (5 minutes)
if (Date.now() - storedData.created > 5 * 60 * 1000) {
  throw new Error("State expired");
}
```

### 9.2 JWT Security

#### 9.2.1 Token Signing

**Algorithm:** RS256 (RSA with SHA-256)

**Key Size:** 2048 bits (minimum), 4096 bits (recommended for high security)

**Why RS256:**

- Asymmetric: Public key can be shared safely
- Industry standard for OIDC
- Supported by all major libraries
- Allows key rotation without downtime

**Implementation:**

```typescript
import { SignJWT } from "jose";

async function signToken(payload: any, privateKey: JWK): Promise<string> {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: privateKey.kid })
    .setIssuedAt()
    .setIssuer("https://identity.fidt.vn/api/oidc")
    .setAudience("app")
    .setExpirationTime("72h")
    .sign(await importJWK(privateKey));

  return jwt;
}
```

#### 9.2.2 Token Verification

**Multi-Step Verification:**

```typescript
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://identity.fidt.vn/api/oidc/jwks.json")
);

async function verifyToken(token: string): Promise<any> {
  // Step 1: Verify signature and standard claims
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: "https://identity.fidt.vn/api/oidc",
    audience: "app",
  });

  // Step 2: Check expiration (done automatically by jwtVerify)

  // Step 3: Check TokenValidAfter
  const user = await getUserById(payload.sub);

  if (payload.iat < user.token_valid_after) {
    throw new Error("Token revoked");
  }

  // Step 4: Verify custom claims (if needed)
  if (!payload.roles || !Array.isArray(payload.roles)) {
    throw new Error("Invalid token claims");
  }

  return payload;
}
```

#### 9.2.3 Token Storage

**Browser Storage Comparison:**

| Storage                   | Pros                   | Cons                    | Recommendation                   |
| ------------------------- | ---------------------- | ----------------------- | -------------------------------- |
| **Cookie (HttpOnly)**     | XSS-safe, auto-sent    | CSRF risk               | Use with SameSite=Strict         |
| **Cookie (non-HttpOnly)** | XSS risk, cross-domain | CSRF risk               | Our choice for cross-domain SSO  |
| **LocalStorage**          | Easy access            | XSS risk, no auto-send  | Avoid for tokens                 |
| **SessionStorage**        | Tab-isolated           | XSS risk, lost on close | Avoid for tokens                 |
| **Memory**                | Most secure            | Lost on refresh         | Use for SPAs with refresh tokens |

**Our Implementation:**

```typescript
// We use non-HttpOnly cookies for cross-domain SSO
// Security measures:
// 1. Secure=true (HTTPS only)
// 2. SameSite=None (required for cross-domain)
// 3. Domain=.fidt.vn (shared across subdomains)
// 4. Short TTL (72 hours)
// 5. Token revocation via TokenValidAfter

setCookie(event, "access_token", token, {
  secure: true,
  httpOnly: false, // Allow JS access for frontend
  sameSite: "none",
  domain: ".fidt.vn",
  expires: new Date(Date.now() + 72 * 60 * 60 * 1000),
});
```

**XSS Protection:**

- Content Security Policy (CSP)
- Input sanitization
- Framework protections (Vue auto-escaping)
- Regular security audits

### 9.3 Token Revocation

#### 9.3.1 TokenValidAfter Mechanism

**Concept:**

```
User has token_valid_after = 1735804800

Token A: iat = 1735804700 → INVALID (issued before token_valid_after)
Token B: iat = 1735804900 → VALID (issued after token_valid_after)
```

**Use Cases:**

1. **Logout**: Set token_valid_after to current timestamp
2. **Password Change**: Invalidate all existing tokens
3. **Permission Revocation**: Force new token with updated claims
4. **Security Breach**: Emergency token revocation

**Implementation:**

```typescript
// On logout
export async function logout(userId: string) {
  const now = Math.floor(Date.now() / 1000);

  await directus.request(
    updateItem("f_user", userId, {
      token_valid_after: now,
    })
  );

  // Optional: Clean up sessions in OIDC data
  await deleteUserSessions(userId);
}

// On token verification
export async function verifyAndCheckRevocation(token: string) {
  const { payload } = await jwtVerify(token, publicKey);

  const user = await getUserById(payload.sub);

  if (payload.iat < user.token_valid_after) {
    throw new TokenRevokedError("Token was revoked");
  }

  return payload;
}
```

#### 9.3.2 Session Management

**Active Session Tracking:**

```typescript
// Store active sessions in OIDC data
export async function createSession(userId: string, deviceInfo: any) {
  const sessionId = crypto.randomUUID();

  await oidcAdapter.upsert(
    sessionId,
    {
      uid: sessionId,
      accountId: userId,
      device: deviceInfo,
      ip: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      loginAt: Date.now(),
    },
    SESSION_TTL
  );

  return sessionId;
}

// Revoke specific session
export async function revokeSession(sessionId: string) {
  await oidcAdapter.destroy(sessionId);
}

// Revoke all user sessions
export async function revokeAllUserSessions(userId: string) {
  const sessions = await directus.request(
    readItems("oidc_data", {
      filter: {
        kind: "Session",
        "value.accountId": userId,
      },
    })
  );

  for (const session of sessions) {
    await directus.request(deleteItem("oidc_data", session.id));
  }
}
```

### 9.4 Key Management

#### 9.4.1 Key Generation

**Best Practices:**

```bash
# Generate strong RSA keys
pnpm generate-keys -t RSA -s 4096

# For high-security environments, use HSM (Hardware Security Module)
# Store keys in:
# - AWS KMS
# - Azure Key Vault
# - Google Cloud KMS
# - Hardware Security Module
```

**Key Storage:**

| Environment     | Storage Method                        | Security Level |
| --------------- | ------------------------------------- | -------------- |
| **Development** | `.env` file                           | Low            |
| **Staging**     | K8s Secrets                           | Medium         |
| **Production**  | AWS Secrets Manager / Azure Key Vault | High           |
| **Enterprise**  | Hardware Security Module (HSM)        | Very High      |

#### 9.4.2 Key Rotation

**Rotation Strategy:**

```
Month 1-2: Primary key A, Secondary key B (newly generated)
Month 3-4: Primary key B, Secondary key A (old primary becomes backup)
Month 5-6: Primary key B, Secondary key C (generate new)
Month 7-8: Primary key C, Secondary key B
...
```

**Implementation:**

```bash
# Step 1: Generate new secondary keys
pnpm generate-keys -f .env.secondary

# Step 2: Deploy with both keys
# JWKS endpoint will return both keys
# Clients will cache both keys

# Step 3: Wait for cache propagation (24-48 hours)

# Step 4: Promote secondary to primary
mv .env.secondary .env.primary

# Step 5: Deploy updated config

# Step 6: Remove old primary (now old)
# Optional: keep as tertiary backup for 1 more cycle
```

**Automated Rotation (Advanced):**

```typescript
// server/cron/key-rotation.ts
import { CronJob } from "cron";

// Run every 6 months
const keyRotationJob = new CronJob("0 0 1 */6 *", async () => {
  console.log("Starting key rotation");

  // 1. Generate new secondary key
  const newSecondary = await generateJWK("RSA", 2048);

  // 2. Update secrets in secret manager
  await secretManager.updateSecret(
    "JWT_SECONDARY_PUBLIC_KEY",
    newSecondary.publicKey
  );
  await secretManager.updateSecret(
    "JWT_SECONDARY_PRIVATE_KEY",
    newSecondary.privateKey
  );

  // 3. Trigger rolling restart of pods
  await k8s.rollout.restart("deployment/identity");

  // 4. Schedule promotion job for 48 hours later
  setTimeout(promoteSecondaryToPrimary, 48 * 60 * 60 * 1000);

  console.log("Key rotation initiated");
});

keyRotationJob.start();
```

### 9.5 HTTPS & Transport Security

#### 9.5.1 TLS Configuration

**Minimum TLS Version:** TLS 1.2
**Recommended:** TLS 1.3

**Nginx Configuration:**

```nginx
server {
    listen 443 ssl http2;
    server_name identity.fidt.vn;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/identity.fidt.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/identity.fidt.vn/privkey.pem;

    # SSL protocols
    ssl_protocols TLSv1.2 TLSv1.3;

    # SSL ciphers (modern, secure)
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Other security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CSP (Content Security Policy)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cms.fidt.vn https://saul.fidt.vn" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Force HTTPS redirect
server {
    listen 80;
    server_name identity.fidt.vn;
    return 301 https://$server_name$request_uri;
}
```

#### 9.5.2 CORS Configuration

```typescript
// server/middleware/cors.global.ts
export default defineEventHandler((event) => {
  const allowedOrigins = [
    "https://app.fidt.vn",
    "https://sales.fidt.vn",
    "https://admin.fidt.vn",
  ];

  const origin = getRequestHeader(event, "origin");

  if (origin && allowedOrigins.includes(origin)) {
    setResponseHeaders(event, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    });
  }

  // Handle preflight
  if (getMethod(event) === "OPTIONS") {
    event.node.res.statusCode = 204;
    event.node.res.end();
    return;
  }
});
```

### 9.6 Rate Limiting & DDoS Protection

```typescript
// server/middleware/rate-limit.ts
import { RateLimiter } from "limiter";

const limiters = new Map<string, RateLimiter>();

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event);
  const path = event.node.req.url;

  // Different limits for different endpoints
  const limits = {
    "/api/auth/login": { tokens: 5, interval: "minute" },
    "/api/oidc/token": { tokens: 10, interval: "minute" },
    "/api/saul": { tokens: 100, interval: "minute" },
  };

  for (const [pattern, limit] of Object.entries(limits)) {
    if (path?.startsWith(pattern)) {
      const key = `${ip}:${pattern}`;

      if (!limiters.has(key)) {
        limiters.set(
          key,
          new RateLimiter({
            tokensPerInterval: limit.tokens,
            interval: limit.interval,
          })
        );
      }

      const limiter = limiters.get(key)!;
      const remaining = await limiter.removeTokens(1);

      if (remaining < 0) {
        throw createError({
          statusCode: 429,
          statusMessage: "Too Many Requests",
        });
      }
    }
  }
});
```

---

## 10. Troubleshooting

### 10.1 Common Issues

#### 10.1.1 "invalid_grant" Error

**Symptom:**

```json
{
  "error": "invalid_grant",
  "error_description": "grant request is invalid"
}
```

**Possible Causes:**

1. **Authorization code not found in database**

   ```typescript
   // Check logs for:
   console.log("🎫 [CRITICAL ERROR] AuthorizationCode NOT FOUND");
   ```

   **Solution:**

   - Check Directus connection
   - Verify `oidc_data` collection exists
   - Check database write permissions
   - Increase retry delay in DirectusAdapter

2. **Authorization code expired**

   - Default TTL: 10 minutes
   - Check system clock sync between servers

   **Solution:**

   ```bash
   # Increase authorization code TTL
   AUTHORIZATION_CODE_TTL=600  # 10 minutes (default)
   ```

3. **Code verifier mismatch**

   - PKCE code_verifier doesn't match code_challenge

   **Solution:**

   - Check state storage persistence
   - Verify code_verifier is correctly stored and retrieved

4. **Authorization code already consumed**

   - Code can only be used once

   **Solution:**

   - Check for duplicate token requests
   - Implement idempotency on client side

**Debugging Steps:**

```bash
# 1. Check OIDC data in Directus
curl -H "Authorization: Bearer ${DIRECTUS_TOKEN}" \
  "${DIRECTUS_URL}/items/oidc_data?filter[kind]=AuthorizationCode"

# 2. Enable debug logging
export DEBUG=oidc-provider:*

# 3. Check authorization code flow
pnpm dev | grep 🎫
```

#### 10.1.2 Token Verification Failed

**Symptom:**

```
JWTVerifyError: signature verification failed
```

**Possible Causes:**

1. **JWK key mismatch**

   **Solution:**

   ```bash
   # Verify keys match
   pnpm check-jwk

   # Check JWKS endpoint
   curl https://identity.fidt.vn/api/oidc/jwks.json

   # Regenerate keys if needed
   pnpm generate-keys
   ```

2. **JWKS cache issue**

   - Client cached old public key

   **Solution:**

   - Wait for cache TTL (typically 24 hours)
   - Force JWKS refetch in client
   - Use secondary key during rotation

3. **Token from different environment**

   - Token signed by dev key, verified against prod key

   **Solution:**

   - Ensure correct environment configuration
   - Clear cookies between environments

**Debugging:**

```typescript
// Manually verify token
import { jwtVerify, importJWK } from "jose";

const token = "eyJhbGc...";
const publicKeyJSON = JSON.parse(process.env.JWT_PRIMARY_PUBLIC_KEY);
const publicKey = await importJWK(publicKeyJSON);

try {
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: "https://identity.fidt.vn/api/oidc",
    audience: "app",
  });
  console.log("Token valid:", payload);
} catch (error) {
  console.error("Verification failed:", error);
}
```

#### 10.1.3 Cookies Not Set

**Symptom:**

- User redirected after login but not authenticated
- `access_token` cookie missing

**Possible Causes:**

1. **Domain mismatch**

   **Current Cookie:** `domain=.fidt.vn`
   **Page URL:** `http://localhost:3001` ❌

   **Solution:**

   ```typescript
   // For local development
   setCookie(event, "access_token", token, {
     domain: "localhost", // Not .localhost
     secure: false, // HTTP ok for local
     sameSite: "lax",
   });
   ```

2. **SameSite issues**

   **Error:** Cookie blocked due to SameSite policy

   **Solution:**

   - Ensure `SameSite=None` with `Secure=true` for cross-domain
   - Use `SameSite=Lax` for same-domain

3. **HTTPS requirement**

   - `Secure=true` requires HTTPS

   **Solution:**

   ```bash
   # Development: disable secure
   # Production: always use HTTPS
   ```

**Debugging:**

```javascript
// Check cookies in browser console
document.cookie.split(";").forEach((c) => console.log(c.trim()));

// Check cookie attributes
// Chrome DevTools → Application → Cookies
```

#### 10.1.4 CORS Errors

**Symptom:**

```
Access to fetch at 'https://identity.fidt.vn/api/auth/check'
from origin 'https://app.fidt.vn' has been blocked by CORS policy
```

**Solution:**

```typescript
// server/middleware/cors.global.ts
const allowedOrigins = [
  "https://app.fidt.vn",
  "http://localhost:3001", // Add for development
];

const origin = getRequestHeader(event, "origin");

if (origin && allowedOrigins.includes(origin)) {
  setResponseHeaders(event, {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
  });
}
```

**Frontend:**

```typescript
// Always include credentials
fetch("https://identity.fidt.vn/api/auth/check", {
  credentials: "include", // Required for cookies
});
```

#### 10.1.5 Directus Connection Failed

**Symptom:**

```
❌ Lỗi khi setup: [401] Unauthorized
```

**Possible Causes:**

1. **Invalid DIRECTUS_TOKEN**

   **Solution:**

   ```bash
   # Get new token from Directus
   # Admin Panel → Settings → Access Tokens

   # Test connection
   curl -H "Authorization: Bearer ${DIRECTUS_TOKEN}" \
     "${DIRECTUS_URL}/users/me"
   ```

2. **Directus URL incorrect**

   **Solution:**

   ```bash
   # Verify URL
   curl ${DIRECTUS_URL}/server/health

   # Should return:
   # {"status":"ok"}
   ```

3. **Network issues**

   **Solution:**

   - Check firewall rules
   - Verify DNS resolution
   - Test with ping/telnet

**Testing:**

```bash
pnpm test-directus

# Or manually
tsx scripts/test-directus-connection.ts
```

### 10.2 Debugging Tools

#### 10.2.1 JWT Decoder

```bash
# Decode JWT in terminal
jwt_decode() {
  echo $1 | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
}

# Usage
jwt_decode "eyJhbGc..."
```

**Online Tools:**

- [jwt.io](https://jwt.io) - Decode and verify JWTs
- [jwt.ms](https://jwt.ms) - Microsoft JWT decoder

#### 10.2.2 OIDC Debugger

**Online Tool:**

- [oidcdebugger.com](https://oidcdebugger.com)

**Configuration:**

```
Authorize URI: https://identity.fidt.vn/api/oidc/authorize
Client ID: app
Scope: openid profile email
Response type: code
Use PKCE: Yes
```

#### 10.2.3 Logging

**Enable Debug Logs:**

```bash
# Environment variable
DEBUG=oidc-provider:*,saul:*

# Or in code
import debug from 'debug';
const log = debug('identity:auth');

log('Authorization code issued:', { code, userId });
```

**Structured Logging:**

```typescript
// services/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// Usage
logger.info({ event: "user_login", userId, timestamp });
logger.error({ event: "token_verification_failed", error, token });
```

#### 10.2.4 Health Check Scripts

```bash
# scripts/health-check.sh
#!/bin/bash

echo "Checking FIDT Identity health..."

# 1. Check JWKS
echo "1. JWKS endpoint"
curl -s https://identity.fidt.vn/api/oidc/jwks.json | jq -r '.keys | length'

# 2. Check OIDC discovery
echo "2. OIDC discovery"
curl -s https://identity.fidt.vn/.well-known/openid-configuration | jq -r '.issuer'

# 3. Check Directus
echo "3. Directus connection"
curl -s -H "Authorization: Bearer ${DIRECTUS_TOKEN}" \
  ${DIRECTUS_URL}/server/health | jq -r '.status'

# 4. Check auth endpoint
echo "4. Auth check endpoint"
curl -s https://identity.fidt.vn/api/auth/check | jq -r '.success'

echo "Health check complete"
```

### 10.3 Performance Issues

#### 10.3.1 Slow Token Verification

**Symptom:** Saul API calls taking > 1 second

**Causes:**

1. **JWKS fetch on every request**

   **Solution:** Cache JWKS

   ```typescript
   import { createRemoteJWKSet } from "jose";

   // Cached JWKS with automatic refresh
   const JWKS = createRemoteJWKSet(
     new URL("https://identity.fidt.vn/api/oidc/jwks.json"),
     {
       cacheMaxAge: 86400000, // 24 hours
       cooldownDuration: 30000, // 30 seconds
     }
   );
   ```

2. **Directus query slow**

   **Solution:** Add database indexes

   ```sql
   CREATE INDEX idx_oidc_internal_id ON oidc_data(internal_id);
   CREATE INDEX idx_oidc_kind ON oidc_data(kind);
   CREATE INDEX idx_user_token_valid_after ON f_user(token_valid_after);
   ```

3. **No connection pooling**

   **Solution:**

   ```typescript
   // Reuse Directus client
   class DirectusService {
     private static instance: DirectusClient;

     static getClient() {
       if (!this.instance) {
         this.instance = createDirectus(process.env.DIRECTUS_URL)
           .with(rest())
           .with(staticToken(process.env.DIRECTUS_TOKEN));
       }
       return this.instance;
     }
   }
   ```

#### 10.3.2 High Memory Usage

**Monitoring:**

```bash
# Check Node.js memory
node --max-old-space-size=512 .output/server/index.mjs

# Monitor in production
pm2 start .output/server/index.mjs --max-memory-restart 500M
```

**Optimization:**

```typescript
// Clear expired OIDC data periodically
async function cleanupExpiredData() {
  const now = Math.floor(Date.now() / 1000);

  const expired = await directus.request(
    readItems("oidc_data", {
      filter: {
        "value.exp": {
          _lt: now,
        },
      },
    })
  );

  for (const item of expired) {
    await directus.request(deleteItem("oidc_data", item.id));
  }

  logger.info({ event: "cleanup_expired_data", count: expired.length });
}

// Run every hour
setInterval(cleanupExpiredData, 60 * 60 * 1000);
```

### 10.4 Production Incidents

#### 10.4.1 Key Compromise

**Emergency Response:**

```bash
# 1. Generate new keys immediately
pnpm generate-keys -f .env.emergency

# 2. Deploy new keys to all instances
kubectl set env deployment/identity \
  JWT_PRIMARY_PUBLIC_KEY="$(cat .env.emergency | grep PUBLIC_KEY)" \
  JWT_PRIMARY_PRIVATE_KEY="$(cat .env.emergency | grep PRIVATE_KEY)"

# 3. Rolling restart
kubectl rollout restart deployment/identity

# 4. Revoke all tokens
psql -c "UPDATE f_user SET token_valid_after = EXTRACT(EPOCH FROM NOW())"

# 5. Notify users
# Send email: "Please re-login due to security update"

# 6. Monitor for suspicious activity
tail -f /var/log/identity/access.log | grep -E '401|403'

# 7. Post-incident review
# - How was key compromised?
# - Update security procedures
# - Implement additional monitoring
```

#### 10.4.2 Service Outage

**Diagnosis:**

```bash
# 1. Check pod status
kubectl get pods -n fidt -l app=identity

# 2. Check logs
kubectl logs -f deployment/identity -n fidt --tail=100

# 3. Check dependencies
# - Directus health
curl ${DIRECTUS_URL}/server/health

# - Database connection
kubectl exec -it deployment/identity -n fidt -- \
  curl ${DIRECTUS_URL}/items/oidc_data?limit=1

# 4. Check resource limits
kubectl top pods -n fidt -l app=identity
```

**Recovery:**

```bash
# 1. Scale up replicas
kubectl scale deployment/identity --replicas=5 -n fidt

# 2. If OOM (Out of Memory)
kubectl set resources deployment/identity \
  --limits=memory=1Gi \
  --requests=memory=512Mi \
  -n fidt

# 3. If database issue
# - Check connection pool
# - Restart Directus if needed
# - Restore from backup if corrupted

# 4. Rollback if recent deploy caused issue
kubectl rollout undo deployment/identity -n fidt
```

#### 10.4.3 Token Leakage

**Detection:**

```bash
# Monitor for tokens in logs
grep -r "eyJhbGc" /var/log/ | grep -v "access_token_hash"

# Check for tokens in error messages
tail -f /var/log/identity/error.log | grep -E 'eyJ[a-zA-Z0-9_-]+\.'
```

**Response:**

```bash
# 1. Identify leaked tokens
# Extract from logs/monitoring

# 2. Revoke specific tokens (if possible to identify users)
# Update token_valid_after for affected users

# 3. If widespread: revoke all tokens
UPDATE f_user SET token_valid_after = EXTRACT(EPOCH FROM NOW());

# 4. Rotate keys as precaution
pnpm generate-keys

# 5. Fix root cause
# - Remove token logging
# - Add token sanitization in error handlers
# - Review all console.log statements
```

---

## 11. References

### 11.1 Standards & Specifications

#### OAuth 2.0

- **RFC 6749**: The OAuth 2.0 Authorization Framework
  https://tools.ietf.org/html/rfc6749

- **RFC 7636**: Proof Key for Code Exchange (PKCE)
  https://tools.ietf.org/html/rfc7636

- **RFC 6750**: Bearer Token Usage
  https://tools.ietf.org/html/rfc6750

- **RFC 7009**: Token Revocation
  https://tools.ietf.org/html/rfc7009

#### OpenID Connect

- **OpenID Connect Core 1.0**
  https://openid.net/specs/openid-connect-core-1_0.html

- **OpenID Connect Discovery 1.0**
  https://openid.net/specs/openid-connect-discovery-1_0.html

- **OpenID Connect Session Management**
  https://openid.net/specs/openid-connect-session-1_0.html

#### JWT & JWK

- **RFC 7519**: JSON Web Token (JWT)
  https://tools.ietf.org/html/rfc7519

- **RFC 7517**: JSON Web Key (JWK)
  https://tools.ietf.org/html/rfc7517

- **RFC 7518**: JSON Web Algorithms (JWA)
  https://tools.ietf.org/html/rfc7518

### 11.2 Libraries & Tools

#### Core Dependencies

- **node-oidc-provider**
  https://github.com/panva/node-oidc-provider
  OpenID Connect Provider implementation

- **openid-client**
  https://github.com/panva/node-openid-client
  OAuth 2.0 / OIDC client

- **jose**
  https://github.com/panva/jose
  JWT signing and verification

- **Directus SDK**
  https://docs.directus.io/reference/sdk/
  Directus API client

#### Development Tools

- **Nuxt 3**
  https://nuxt.com/docs
  Vue.js framework

- **TypeScript**
  https://www.typescriptlang.org/docs/
  Static typing

- **pnpm**
  https://pnpm.io/
  Fast package manager

### 11.3 Security Resources

- **OWASP Top 10**
  https://owasp.org/www-project-top-ten/

- **OAuth 2.0 Security Best Practices**
  https://tools.ietf.org/html/draft-ietf-oauth-security-topics

- **JWT Best Practices**
  https://tools.ietf.org/html/rfc8725

### 11.4 Project Documentation

- **JWK Environment Guide**: [JWK_ENV_GUIDE.md](modules/identity/JWK_ENV_GUIDE.md)
- **OIDC Setup Guide**: [OIDC_SETUP.md](modules/identity/OIDC_SETUP.md)
- **Flow Diagram**: [flow.md](flow.md)
- **Architecture Diagrams**: [image-architecture/](image-architecture/)

### 11.5 Related Services

- **Directus CMS**: https://directus.io/
- **Azure Active Directory**: https://azure.microsoft.com/en-us/products/active-directory

---

## Appendix A: Environment Variables Reference

### Complete Environment Variables Table

| Variable                    | Type    | Required | Default                 | Description                           |
| --------------------------- | ------- | -------- | ----------------------- | ------------------------------------- |
| `ENV`                       | string  | No       | `local`                 | Environment (local/uat/production)    |
| `PORT`                      | number  | No       | `3000`                  | Server port                           |
| `PUBLIC_URL`                | string  | No       | `http://localhost:3000` | Public URL of service                 |
| `DIRECTUS_URL`              | string  | Yes      | -                       | Directus instance URL                 |
| `DIRECTUS_TOKEN`            | string  | Yes      | -                       | Directus admin token                  |
| `JWT_PRIMARY_PUBLIC_KEY`    | JSON    | Yes      | -                       | Primary public JWK key                |
| `JWT_PRIMARY_PRIVATE_KEY`   | JSON    | Yes      | -                       | Primary private JWK key               |
| `JWT_SECONDARY_PUBLIC_KEY`  | JSON    | No       | -                       | Secondary public JWK key              |
| `JWT_SECONDARY_PRIVATE_KEY` | JSON    | No       | -                       | Secondary private JWK key             |
| `OIDC_CLIENT_ID`            | string  | No       | `app`                   | OAuth client ID                       |
| `OIDC_CLIENT_SECRET`        | string  | No       | `app-secret`            | OAuth client secret                   |
| `TOKEN_PREFIX`              | string  | No       | -                       | Prefix for cookie names               |
| `ACCESS_TOKEN_TTL`          | number  | No       | `259200`                | Access token TTL (seconds)            |
| `ID_TOKEN_TTL`              | number  | No       | `259200`                | ID token TTL (seconds)                |
| `REFRESH_TOKEN_TTL`         | number  | No       | `86400`                 | Refresh token TTL (seconds)           |
| `SESSION_TTL`               | number  | No       | `86400`                 | Session TTL (seconds)                 |
| `AUTHORIZATION_CODE_TTL`    | number  | No       | `600`                   | Authorization code TTL (seconds)      |
| `GRANT_TTL`                 | number  | No       | `86400`                 | Grant TTL (seconds)                   |
| `INTERACTION_TTL`           | number  | No       | `3600`                  | Interaction TTL (seconds)             |
| `BYPASS_EXTRA_TOKEN_CLAIMS` | boolean | No       | `false`                 | Bypass extra token claims             |
| `LOG_LEVEL`                 | string  | No       | `info`                  | Logging level (debug/info/warn/error) |

---

## Appendix B: Scripts Reference

### Available pnpm Scripts

| Script               | Command                                    | Description                  |
| -------------------- | ------------------------------------------ | ---------------------------- |
| `dev`                | `nuxt dev`                                 | Start development server     |
| `build`              | `nuxt build`                               | Build for production         |
| `start`              | `nuxt start`                               | Start production server      |
| `preview`            | `nuxt preview`                             | Preview production build     |
| `generate-keys`      | `tsx scripts/generate-jwk-keys.ts`         | Generate JWK keys            |
| `setup-oidc`         | `tsx scripts/setup-oidc-table.ts`          | Setup OIDC table in Directus |
| `check-jwk`          | `tsx scripts/check-jwk-env.ts`             | Check JWK configuration      |
| `test-jwk`           | `tsx scripts/test-jwk-signing.ts`          | Test JWK signing             |
| `test-oidc-jwk`      | `tsx scripts/test-oidc-jwk-integration.ts` | Test OIDC JWK integration    |
| `test-jwks-endpoint` | `tsx scripts/test-jwks-endpoint.ts`        | Test JWKS endpoint           |
| `test-directus`      | `tsx scripts/test-directus-connection.ts`  | Test Directus connection     |
| `check-schema`       | `tsx scripts/check-oidc-schema.ts`         | Check OIDC schema            |

---

## Appendix C: API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint             | Description                 |
| ------ | -------------------- | --------------------------- |
| GET    | `/api/auth/check`    | Check authentication status |
| GET    | `/api/auth/login`    | Initialize login flow       |
| GET    | `/api/auth/callback` | OAuth callback              |
| POST   | `/api/auth/logout`   | Logout and revoke tokens    |

### OIDC Endpoints

| Method | Endpoint                            | Description            |
| ------ | ----------------------------------- | ---------------------- |
| GET    | `/.well-known/openid-configuration` | OIDC Discovery         |
| GET    | `/api/oidc/authorize`               | Authorization endpoint |
| POST   | `/api/oidc/token`                   | Token endpoint         |
| GET    | `/api/oidc/userinfo`                | UserInfo endpoint      |
| GET    | `/api/oidc/jwks.json`               | JWKS endpoint          |
| GET    | `/api/oidc/logout`                  | OIDC logout            |

### Saul RPC Endpoints

| Method | Endpoint    | Description          |
| ------ | ----------- | -------------------- |
| POST   | `/api/saul` | Execute RPC function |

### User Management (Saul Functions)

| Function               | Description                          |
| ---------------------- | ------------------------------------ |
| `identity.getUserInfo` | Get user info with roles/permissions |

---

## Appendix D: Error Codes

### HTTP Status Codes

| Code | Name                  | Description                | Action                      |
| ---- | --------------------- | -------------------------- | --------------------------- |
| 400  | Bad Request           | Invalid request parameters | Check request format        |
| 401  | Unauthorized          | Invalid or expired token   | Re-authenticate             |
| 403  | Forbidden             | Insufficient permissions   | Check user roles            |
| 404  | Not Found             | Resource not found         | Verify resource ID          |
| 429  | Too Many Requests     | Rate limit exceeded        | Wait and retry              |
| 500  | Internal Server Error | Server error               | Check logs, contact support |

### OAuth Error Codes

| Code                     | Description                        | Solution                           |
| ------------------------ | ---------------------------------- | ---------------------------------- |
| `invalid_request`        | Missing or invalid parameter       | Check request format               |
| `invalid_client`         | Client authentication failed       | Verify client_id and client_secret |
| `invalid_grant`          | Authorization code invalid/expired | Retry authorization flow           |
| `unauthorized_client`    | Client not authorized              | Check client configuration         |
| `unsupported_grant_type` | Grant type not supported           | Use authorization_code             |
| `invalid_scope`          | Invalid scope requested            | Use openid profile email           |

### Custom Error Codes

| Code                | Description                 | Solution              |
| ------------------- | --------------------------- | --------------------- |
| `token_expired`     | Access token expired        | Refresh or re-login   |
| `token_revoked`     | Token was revoked           | Re-login              |
| `permission_denied` | Missing required permission | Contact administrator |
| `user_not_found`    | User does not exist         | Check user ID         |

---

**Document End**

For questions or support, please contact:
**Email**: support@fidt.vn
**Documentation**: https://docs.fidt.vn
**Repository**: https://github.com/fidt/fidt-identity
