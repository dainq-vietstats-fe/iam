# 03 - Token Verification (Xác Thực Token)

## Mục Lục

1. [JWT là gì?](#jwt-là-gì)
2. [Cấu trúc JWT](#cấu-trúc-jwt)
3. [JWT Signing Algorithms](#jwt-signing-algorithms)
4. [JWK và JWKS](#jwk-và-jwks)
5. [Token Verification Process](#token-verification-process)
6. [Token Security](#token-security)
7. [Implementation](#implementation)

---

## JWT là gì?

**JWT (JSON Web Token)** là một **compact, URL-safe** format để truyền thông tin giữa các parties dưới dạng JSON object.

### Đặc điểm:

- ✅ **Self-contained**: Chứa tất cả thông tin cần thiết
- ✅ **Stateless**: Không cần lưu trên server
- ✅ **Signed**: Đảm bảo integrity (không bị tamper)
- ✅ **Compact**: Dễ truyền qua URL, HTTP header, POST body

### Khi nào dùng JWT?

**1. Authentication**

```
User login → Server issues JWT → Client lưu JWT → Mọi request gửi kèm JWT
```

**2. Information Exchange**

```
Service A → Sign data as JWT → Service B → Verify JWT → Trust data
```

### JWT vs Session Cookies

| JWT                                       | Session Cookies                    |
| ----------------------------------------- | ---------------------------------- |
| Stateless (không cần lưu server)          | Stateful (lưu session trên server) |
| Self-contained (chứa user info)           | Chỉ chứa session ID                |
| Không thể revoke ngay lập tức             | Có thể revoke ngay                 |
| Scalable (không cần shared session store) | Cần shared session store (Redis)   |
| Larger size (KB)                          | Smaller size (bytes)               |

---

## Cấu Trúc JWT

JWT gồm **3 phần** được ngăn cách bởi dấu chấm (`.`):

```
HEADER.PAYLOAD.SIGNATURE
```

### Ví dụ thực tế:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0.
eyJpc3MiOiJodHRwczovL2ZpZHQtaWRlbnRpdHkuY29tIiwic3ViIjoidXNlcjEyMyIsImF1ZCI6InNhbGVzMi1hcGkiLCJleHAiOjE3MzU2ODk2MDAsImlhdCI6MTczNTYwMzIwMCwic2NvcGUiOiJyZWFkIHdyaXRlIn0.
dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

### 1. Header (Phần đầu)

**Chứa**: Algorithm và token type

**Format** (trước khi encode):

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-1"
}
```

**Fields:**

- `alg`: Algorithm dùng để sign (RS256, HS256, ES256, ...)
- `typ`: Token type (luôn là "JWT")
- `kid`: Key ID - xác định key nào được dùng để sign

**Encoding**: Base64URL(header)

### 2. Payload (Phần thân)

**Chứa**: Claims (thông tin về user và metadata)

**Format** (trước khi encode):

```json
{
  "iss": "https://fidt-identity.com",
  "sub": "user123",
  "aud": "sales2-api",
  "exp": 1735689600,
  "iat": 1735603200,
  "nbf": 1735603200,
  "jti": "token-id-123",
  "scope": "read write",
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["sales-manager"]
}
```

**Encoding**: Base64URL(payload)

### 3. Signature (Chữ ký)

**Chứa**: Cryptographic signature

**Cách tạo:**

```javascript
signature = sign(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  privateKey,
  algorithm
);
```

**Với RS256:**

```javascript
signature = RSA_SHA256("eyJhbGc...IkpXVCJ9.eyJpc3M...In0", privateKey);
```

**Encoding**: Base64URL(signature)

---

## JWT Claims

### Registered Claims (Chuẩn)

| Claim | Tên        | Ý nghĩa                        | Ví dụ                       |
| ----- | ---------- | ------------------------------ | --------------------------- |
| `iss` | Issuer     | Ai issue token này             | "https://fidt-identity.com" |
| `sub` | Subject    | Token này về ai                | "user123"                   |
| `aud` | Audience   | Token này dành cho ai          | "sales2-api"                |
| `exp` | Expiration | Hết hạn khi nào                | 1735689600 (Unix timestamp) |
| `iat` | Issued At  | Issue lúc nào                  | 1735603200                  |
| `nbf` | Not Before | Chưa valid trước thời điểm này | 1735603200                  |
| `jti` | JWT ID     | Unique ID của token            | "token-id-123"              |

### Public Claims (Tùy chỉnh)

**Nên dùng namespaced claims:**

```json
{
  "https://fidt-identity.com": {
    "roles": ["sales-manager"],
    "policies": ["policy-1", "policy-2"],
    "department": "sales"
  }
}
```

### Private Claims (Custom)

Dùng trong hệ thống riêng:

```json
{
  "scope": "read write",
  "permissions": ["orders:read", "customers:create"]
}
```

---

## JWT Signing Algorithms

### 1. HMAC (Symmetric)

**Algorithms**: HS256, HS384, HS512

**Cách hoạt động**: Dùng **shared secret** để sign và verify

```
Sign:   HMAC_SHA256(data, secret_key)
Verify: HMAC_SHA256(data, secret_key) == signature
```

**Ưu điểm:**

- ✅ Nhanh
- ✅ Đơn giản

**Nhược điểm:**

- ❌ Phải chia sẻ secret key cho mọi service verify token
- ❌ Không phù hợp cho distributed systems
- ❌ Bất kỳ ai có secret đều tạo được token

**Khi nào dùng:**

- ✅ Internal services (cùng organization)
- ✅ Monolithic apps
- ❌ Không dùng cho public APIs

### 2. RSA (Asymmetric) ⭐

**Algorithms**: RS256, RS384, RS512

**Cách hoạt động**: Dùng **private key** để sign, **public key** để verify

```
Sign:   RSA_SHA256(data, private_key)
Verify: RSA_SHA256_Verify(data, signature, public_key)
```

**Key Pair:**

```
Private Key (secret) → Sign tokens (chỉ Authorization Server có)
Public Key (share)   → Verify tokens (mọi service đều có thể verify)
```

**Ưu điểm:**

- ✅ An toàn hơn HMAC
- ✅ Public key có thể share công khai
- ✅ Chỉ Authorization Server tạo được token
- ✅ Phù hợp distributed systems

**Nhược điểm:**

- ❌ Chậm hơn HMAC
- ❌ Key management phức tạp hơn

**Khi nào dùng:** ⭐ **RECOMMEND cho production**

- ✅ Distributed systems
- ✅ Microservices
- ✅ Public APIs
- ✅ Third-party integrations

### 3. ECDSA (Asymmetric)

**Algorithms**: ES256, ES384, ES512

**Cách hoạt động**: Tương tự RSA nhưng dùng Elliptic Curve

**Ưu điểm:**

- ✅ Nhanh hơn RSA
- ✅ Key size nhỏ hơn RSA (256-bit EC ≈ 3072-bit RSA)

**Nhược điểm:**

- ❌ Ít được support hơn RSA

---

## JWK và JWKS

### JWK (JSON Web Key)

**JWK** = JSON format để represent cryptographic keys

**Ví dụ RSA Public Key:**

```json
{
  "kty": "RSA",
  "use": "sig",
  "kid": "key-2025-01",
  "alg": "RS256",
  "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx...",
  "e": "AQAB"
}
```

**Fields:**

- `kty`: Key Type (RSA, EC, oct)
- `use`: Usage (sig = signature, enc = encryption)
- `kid`: Key ID (unique identifier)
- `alg`: Algorithm (RS256, ES256, ...)
- `n`: Modulus (RSA public key component)
- `e`: Exponent (RSA public key component)

**Ví dụ RSA Private Key:**

```json
{
  "kty": "RSA",
  "use": "sig",
  "kid": "key-2025-01",
  "alg": "RS256",
  "n": "0vx7ago...",
  "e": "AQAB",
  "d": "X4cTteJY_gn4FYPsXB8rdXix5vwsg1FLN5E3EaG6RJoVH-HLLKD9...",
  "p": "83i-7IvMGXoMXCskv73TKr8637FiO7Z27zv8oj6pbWUQyLPBQxtS...",
  "q": "3dfOR9cuYq-0S-mkFLzgItgMEfFzB2q3hWehMuG0oCuqnb3vobLy...",
  "dp": "G4sPXkc6Ya9y8oJW9_ILj4xuppu0lzi_H7VTkS8xj5SdX3coE0oim...",
  "dq": "s9lAH9fggBsoFR8Oac2R_E2gw282rT2kGOAhvIllETE1efrA6huUU...",
  "qi": "GyM_p6JrXySiz1toFgKbWV-JdI3jQ4ypu9rbMWx3rQJBfmt0FoYzg..."
}
```

### JWKS (JSON Web Key Set)

**JWKS** = Collection of JWKs (public keys)

**Format:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-2025-01",
      "use": "sig",
      "alg": "RS256",
      "n": "0vx7ago...",
      "e": "AQAB"
    },
    {
      "kty": "RSA",
      "kid": "key-2024-12",
      "use": "sig",
      "alg": "RS256",
      "n": "xjlzCn9...",
      "e": "AQAB"
    }
  ]
}
```

### JWKS Endpoint

**Standard endpoint**: `/.well-known/jwks.json`

**Ví dụ:**

```
GET https://fidt-identity.com/.well-known/jwks.json
```

**Response**: JWKS with public keys

**Mục đích:**

- ✅ Services khác fetch public keys để verify tokens
- ✅ Automatic key rotation
- ✅ Không cần hardcode keys

---

## Token Verification Process

### Flow Tổng Quan

```
Client                Resource Server              Authorization Server
  |                          |                              |
  |  (1) API Request         |                              |
  |  + Authorization:        |                              |
  |    Bearer <JWT>          |                              |
  |------------------------->|                              |
  |                          |                              |
  |                          | (2) Extract JWT              |
  |                          |                              |
  |                          | (3) Fetch JWKS               |
  |                          |  (if not cached)             |
  |                          |----------------------------->|
  |                          |                              |
  |                          |  (4) Return public keys      |
  |                          |<-----------------------------|
  |                          |                              |
  |                          | (5) Verify JWT:              |
  |                          |  - Signature                 |
  |                          |  - Expiration                |
  |                          |  - Issuer                    |
  |                          |  - Audience                  |
  |                          |                              |
  |                          | (6) Extract claims           |
  |                          |                              |
  |  (7) Return response     |                              |
  |<-------------------------|                              |
```

### Các Bước Verify Chi Tiết

#### Step 1: Extract JWT từ Request

```typescript
const authHeader = request.headers["authorization"];
// "Bearer eyJhbGc..."

if (!authHeader?.startsWith("Bearer ")) {
  throw new Error("Missing or invalid Authorization header");
}

const jwt = authHeader.substring(7); // Remove "Bearer "
```

#### Step 2: Decode Header (không verify)

```typescript
const [headerB64, payloadB64, signatureB64] = jwt.split(".");

const header = JSON.parse(base64UrlDecode(headerB64));
// { alg: "RS256", typ: "JWT", kid: "key-2025-01" }
```

#### Step 3: Fetch Public Key từ JWKS

```typescript
// Fetch JWKS từ Authorization Server
const jwksResponse = await fetch(
  "https://fidt-identity.com/.well-known/jwks.json"
);
const jwks = await jwksResponse.json();

// Find key matching kid
const key = jwks.keys.find((k) => k.kid === header.kid);

if (!key) {
  throw new Error("Key not found in JWKS");
}
```

#### Step 4: Verify Signature

```typescript
import { verify } from "jose";

const publicKey = await importJWK(key);

const { payload } = await verify(jwt, publicKey, {
  algorithms: ["RS256"],
});
```

**Internally**, verify function làm:

```typescript
// Recreate signature
const data = headerB64 + "." + payloadB64;
const expectedSignature = RSA_SHA256(data, publicKey);

// Compare
if (expectedSignature !== signatureB64) {
  throw new Error("Invalid signature");
}
```

#### Step 5: Validate Claims

```typescript
const now = Math.floor(Date.now() / 1000);

// Check expiration
if (payload.exp && payload.exp < now) {
  throw new Error("Token expired");
}

// Check not before
if (payload.nbf && payload.nbf > now) {
  throw new Error("Token not yet valid");
}

// Check issuer
if (payload.iss !== "https://fidt-identity.com") {
  throw new Error("Invalid issuer");
}

// Check audience
if (!payload.aud || !payload.aud.includes("sales2-api")) {
  throw new Error("Invalid audience");
}
```

#### Step 6: Extract User Info

```typescript
const userId = payload.sub;
const userEmail = payload.email;
const userRoles = payload["https://fidt-identity.com"]?.roles || [];
```

---

## Token Security

### 1. Token Storage

**Bad Practices:**

❌ **localStorage**

```javascript
// ❌ Dễ bị XSS attack
localStorage.setItem("access_token", token);
```

❌ **sessionStorage**

```javascript
// ❌ Vẫn bị XSS
sessionStorage.setItem("access_token", token);
```

**Good Practices:**

✅ **httpOnly Cookies** (Best for web apps)

```javascript
res.cookie("access_token", token, {
  httpOnly: true, // Không thể access từ JavaScript
  secure: true, // Chỉ gửi qua HTTPS
  sameSite: "strict", // CSRF protection
  maxAge: 3600000, // 1 hour
});
```

✅ **Memory (for SPAs)**

```javascript
// Lưu trong memory, không persist
let accessToken = null;

function setToken(token) {
  accessToken = token; // Chỉ trong RAM
}
```

### 2. Token Expiration

**Access Token**: Short-lived (1-24 hours)

```json
{
  "exp": 1735607200, // 1 hour from now
  "iat": 1735603600
}
```

**Refresh Token**: Long-lived (days to months)

```json
{
  "exp": 1738195200, // 30 days
  "iat": 1735603200
}
```

**Strategy:**

```
Access token expires after 1 hour
→ Use refresh token to get new access token
→ Refresh token expires after 30 days
→ User must login again
```

### 3. Token Revocation

**Problem**: JWT is stateless → không thể revoke ngay lập tức

**Solutions:**

**a) Short expiration + Refresh tokens**

```
Access token: 15 minutes
Refresh token: Lưu trong DB, có thể revoke
```

**b) Token blacklist**

```typescript
// Lưu revoked tokens trong Redis
await redis.set(`revoked:${jti}`, "1", "EX", ttl);

// Khi verify
const isRevoked = await redis.get(`revoked:${jti}`);
if (isRevoked) {
  throw new Error("Token revoked");
}
```

**c) TokenValidAfter (FIDT approach)**

```typescript
// User model
{
  id: "user123",
  tokenValidAfter: "2025-12-05T10:00:00Z"
}

// Verify
if (token.iat < user.tokenValidAfter) {
  throw new Error('Token revoked');
}
```

### 4. Prevent Common Attacks

**a) Signature Stripping Attack**

**Attack**: Attacker changes `alg` to "none"

```json
{
  "alg": "none",
  "typ": "JWT"
}
```

**Defense**: Reject tokens with `alg: none`

```typescript
if (header.alg === "none") {
  throw new Error('Algorithm "none" not allowed');
}
```

**b) Algorithm Confusion Attack**

**Attack**: Change RS256 to HS256, use public key as secret

```json
{
  "alg": "HS256", // Changed from RS256
  "typ": "JWT"
}
```

**Defense**: Enforce expected algorithm

```typescript
const { payload } = await verify(jwt, publicKey, {
  algorithms: ["RS256"], // Only allow RS256
});
```

**c) Key Confusion Attack**

**Attack**: Omit `kid`, server uses wrong key

**Defense**: Always check `kid`

```typescript
if (!header.kid) {
  throw new Error("Missing kid in token header");
}

const key = jwks.keys.find((k) => k.kid === header.kid);
if (!key) {
  throw new Error("Invalid kid");
}
```

---

## Implementation

### JWK Service (TypeScript)

```typescript
import { generateKeyPair, exportJWK, importJWK } from "jose";
import type { JWK } from "jose";

export class JWKService {
  private primaryPrivateKey: JWK | null = null;
  private primaryPublicKey: JWK | null = null;
  private secondaryPrivateKey: JWK | null = null;
  private secondaryPublicKey: JWK | null = null;

  async initialize() {
    // Load keys from environment variables
    if (process.env.JWT_PRIMARY_PRIVATE_KEY) {
      this.primaryPrivateKey = JSON.parse(process.env.JWT_PRIMARY_PRIVATE_KEY);
      this.primaryPublicKey = JSON.parse(process.env.JWT_PRIMARY_PUBLIC_KEY);
    } else {
      // Generate new keys
      const { publicKey, privateKey } = await generateKeyPair("RS256");
      this.primaryPrivateKey = await exportJWK(privateKey);
      this.primaryPublicKey = await exportJWK(publicKey);

      // Add metadata
      this.primaryPrivateKey.kid = "key-" + Date.now();
      this.primaryPublicKey.kid = this.primaryPrivateKey.kid;
      this.primaryPrivateKey.alg = "RS256";
      this.primaryPublicKey.alg = "RS256";
    }

    // Load secondary keys (for rotation)
    if (process.env.JWT_SECONDARY_PRIVATE_KEY) {
      this.secondaryPrivateKey = JSON.parse(
        process.env.JWT_SECONDARY_PRIVATE_KEY
      );
      this.secondaryPublicKey = JSON.parse(
        process.env.JWT_SECONDARY_PUBLIC_KEY
      );
    }
  }

  // Get private keys for signing
  getSigningKey(): JWK {
    if (!this.primaryPrivateKey) {
      throw new Error("JWK Service not initialized");
    }
    return this.primaryPrivateKey;
  }

  // Get public keys for verification (JWKS format)
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

  // Find key by kid
  findPublicKey(kid: string): JWK | undefined {
    if (this.primaryPublicKey?.kid === kid) {
      return this.primaryPublicKey;
    }
    if (this.secondaryPublicKey?.kid === kid) {
      return this.secondaryPublicKey;
    }
    return undefined;
  }
}

export const jwkService = new JWKService();
```

### Token Verification Middleware

```typescript
import { jwtVerify, importJWK } from "jose";
import type { JWTPayload } from "jose";

export async function verifyToken(
  token: string,
  jwksUrl: string
): Promise<JWTPayload> {
  // 1. Decode header (without verification)
  const [headerB64] = token.split(".");
  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());

  // 2. Fetch JWKS
  const response = await fetch(jwksUrl);
  const jwks = await response.json();

  // 3. Find matching key
  const jwk = jwks.keys.find((k: any) => k.kid === header.kid);
  if (!jwk) {
    throw new Error("Key not found");
  }

  // 4. Import public key
  const publicKey = await importJWK(jwk, header.alg);

  // 5. Verify JWT
  const { payload } = await jwtVerify(token, publicKey, {
    issuer: "https://fidt-identity.com",
    audience: "sales2-api",
  });

  return payload;
}

// Usage in API
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, "authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      message: "Missing authorization header",
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyToken(
      token,
      "https://fidt-identity.com/.well-known/jwks.json"
    );

    // Attach user to event context
    event.context.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload["https://fidt-identity.com"]?.roles || [],
    };
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: "Invalid token",
    });
  }
});
```

---

## Testing Token Verification

### Manual Testing với jwt.io

1. Đi đến https://jwt.io
2. Paste JWT vào "Encoded"
3. Paste public key vào "Verify Signature"
4. Check "Signature Verified"

### Unit Test

```typescript
import { describe, it, expect } from "vitest";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import { verifyToken } from "./token";

describe("Token Verification", () => {
  it("should verify valid token", async () => {
    // Generate test keys
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const privateJWK = await exportJWK(privateKey);
    privateJWK.kid = "test-key";

    // Create JWT
    const jwt = await new SignJWT({ sub: "user123" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer("https://fidt-identity.com")
      .setAudience("sales2-api")
      .setExpirationTime("1h")
      .sign(privateKey);

    // Verify
    const payload = await verifyToken(jwt, jwksUrl);
    expect(payload.sub).toBe("user123");
  });

  it("should reject expired token", async () => {
    // Create expired JWT
    const jwt = await new SignJWT({ sub: "user123" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setExpirationTime("-1h") // 1 hour ago
      .sign(privateKey);

    await expect(verifyToken(jwt, jwksUrl)).rejects.toThrow("expired");
  });
});
```

---

## Best Practices

### 1. Implement Token Refresh

```typescript
// Access token expires in 15 minutes
// Refresh token expires in 30 days
// Auto-refresh before expiration
```

### 2. Use HTTPS Only

```typescript
// Never send tokens over HTTP
if (process.env.NODE_ENV === "production" && !req.secure) {
  throw new Error("HTTPS required");
}
```

### 3. Cache JWKS

```typescript
// Cache public keys, refresh every hour
const jwksCache = new Map();
const CACHE_TTL = 3600000; // 1 hour
```

### 4. Validate All Claims

```typescript
// Don't just verify signature
// Validate iss, aud, exp, nbf, etc.
```

### 5. Log Verification Failures

```typescript
logger.warn("Token verification failed", {
  reason: error.message,
  userId: payload?.sub,
  ip: request.ip,
});
```

---

**Next**: [04 - Architecture](./04-architecture.md)
