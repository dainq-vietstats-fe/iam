# FIDT Identity - IAM Learning Project

> **OpenID Connect Provider** được xây dựng từ đầu để học và hiểu rõ về **Identity and Access Management (IAM)** systems.

## 🎯 Mục Tiêu

Dự án này giúp bạn:

- ✅ Hiểu rõ **OpenID Connect (OIDC)** và **OAuth 2.0**
- ✅ Nắm vững **Token Verification** (JWT, JWK, JWKS)
- ✅ Hiểu cách một **IAM system** hoạt động từ A-Z
- ✅ Implement OIDC Provider từ scratch
- ✅ Quản lý **Authentication** và **Authorization**
- ✅ Implement **Role-Based Access Control (RBAC)**

## 📚 Tài Liệu

Tất cả tài liệu chi tiết nằm trong thư mục [`docs/`](./docs/):

| Tài Liệu                                                       | Nội Dung                                        |
| -------------------------------------------------------------- | ----------------------------------------------- |
| [01 - OIDC Basics](./docs/01-oidc-basics.md)                   | OAuth 2.0, OpenID Connect, Flows, Tokens        |
| [02 - IAM Concepts](./docs/02-iam-concepts.md)                 | Authentication, Authorization, RBAC, SSO        |
| [03 - Token Verification](./docs/03-token-verification.md)     | JWT, JWK, JWKS, Verification Process            |
| [04 - Architecture](./docs/04-architecture.md)                 | System Architecture, Data Flow, Database Schema |
| [05 - Implementation Guide](./docs/05-implementation-guide.md) | Step-by-Step Implementation                     |

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│ (Browser)   │
└──────┬──────┘
       │
       │ HTTP + Cookies (access_token, id_token)
       │
┌──────▼────────────────────────────┐
│   FIDT Identity (OIDC Provider)   │
│  ┌──────────────────────────────┐ │
│  │  - Authentication            │ │
│  │  - Token Issuance (JWT)      │ │
│  │  - Session Management        │ │
│  │  - RBAC & Policies           │ │
│  └──────────────────────────────┘ │
└───────────────┬───────────────────┘
                │
       ┌────────▼─────────┐
       │    Directus      │
       │   (Database)     │
       │  - Users         │
       │  - Roles         │
       │  - Policies      │
       │  - OIDC Data     │
       └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Directus** instance (hoặc Docker)

### 1. Install Dependencies

```bash
cd new-iam
npm install
```

### 2. Setup Directus (Database)

**Option A: Docker** (Recommended)

```bash
docker-compose up -d
```

Tạo file `docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: directus
      POSTGRES_USER: directus
      POSTGRES_PASSWORD: directus
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  directus:
    image: directus/directus:latest
    ports:
      - "8055:8055"
    environment:
      DB_CLIENT: postgres
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: directus
      DB_USER: directus
      DB_PASSWORD: directus
      ADMIN_EMAIL: admin@example.com
      ADMIN_PASSWORD: admin
      KEY: your-random-key-here
      SECRET: your-random-secret-here
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Option B: Sử dụng Directus hiện có**

Trỏ đến Directus instance trong `.env`.

### 3. Create Database Schema

Trong Directus, tạo các collections sau:

**Collection: `users`**

```
- id (UUID, Primary Key)
- email (String, Unique)
- password_hash (String)
- name (String)
- avatar (String)
- status (String, default: "active")
- token_valid_after (Timestamp)
- created_at (Timestamp)
- updated_at (Timestamp)
```

**Collection: `roles`**

```
- id (UUID, Primary Key)
- name (String, Unique)
- description (Text)
- created_at (Timestamp)
```

**Collection: `user_roles`** (Many-to-Many)

```
- user_id (UUID, FK to users)
- role_id (UUID, FK to roles)
```

**Collection: `policies`**

```
- id (UUID, Primary Key)
- name (String)
- effect (String: "allow" or "deny")
- resources (JSON)
- actions (JSON)
- conditions (JSON)
- created_at (Timestamp)
```

**Collection: `role_policies`** (Many-to-Many)

```
- role_id (UUID, FK to roles)
- policy_id (UUID, FK to policies)
```

**Collection: `oidc_data`**

```
- internal_id (String, Primary Key)
- kind (String)
- session_id (String)
- value (JSON)
- exp (Integer)
- iat (Integer)
- created_at (Timestamp)
```

### 4. Generate JWT Keys

```bash
npm run generate:keys
```

Copy output vào file `.env`.

### 5. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server
PORT=3000
PUBLIC_URL=http://localhost:3000

# Directus
DIRECTUS_URL=http://localhost:8055
DIRECTUS_TOKEN=your-directus-admin-token

# JWT Keys (from generate:keys)
JWT_PRIMARY_PRIVATE_KEY={"kty":"RSA",...}
JWT_PRIMARY_PUBLIC_KEY={"kty":"RSA",...}

# OIDC
OIDC_CLIENT_ID=app
OIDC_CLIENT_SECRET=app-secret

# Token TTL (seconds)
ACCESS_TOKEN_TTL=3600
REFRESH_TOKEN_TTL=2592000
ID_TOKEN_TTL=3600
```

### 6. Create Test User

Trong Directus, tạo test user:

```sql
INSERT INTO users (id, email, password_hash, name, status)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  '$2b$10$...',  -- Hash of "password123" using bcrypt
  'Test User',
  'active'
);
```

Hoặc dùng bcrypt CLI:

```bash
npx bcrypt-cli hash password123 10
```

### 7. Run Development Server

```bash
npm run dev
```

Server sẽ chạy tại: http://localhost:3000

### 8. Test Authentication

1. Mở browser: http://localhost:3000
2. Click "Sign In"
3. Login với:
   - Email: `test@example.com`
   - Password: `password123`
4. Check user info và roles

## 📡 API Endpoints

### OIDC Endpoints

| Endpoint                                | Description            |
| --------------------------------------- | ---------------------- |
| `GET /.well-known/openid-configuration` | OIDC Discovery         |
| `GET /api/oidc/jwks.json`               | Public JWKS            |
| `GET /api/oidc/auth`                    | Authorization Endpoint |
| `POST /api/oidc/token`                  | Token Endpoint         |
| `GET /api/oidc/me`                      | UserInfo Endpoint      |
| `GET /api/oidc/session/end`             | Logout Endpoint        |

### Authentication Endpoints

| Endpoint                 | Description             |
| ------------------------ | ----------------------- |
| `GET /api/auth/login`    | Initiate login flow     |
| `GET /api/auth/callback` | OAuth callback          |
| `GET /api/auth/check`    | Verify token & get user |
| `GET /api/auth/logout`   | Logout                  |

### Interaction Endpoints

| Endpoint                          | Description        |
| --------------------------------- | ------------------ |
| `GET /interaction/:uid`           | Login page         |
| `POST /api/oidc/interaction/:uid` | Submit credentials |

## 🧪 Testing

### Manual Testing

```bash
# 1. Get authorization code
open "http://localhost:3000/api/auth/login"

# 2. Check authentication
curl http://localhost:3000/api/auth/check \
  -H "Cookie: fidt_access_token=..."

# 3. Get JWKS
curl http://localhost:3000/api/oidc/jwks.json
```

### Integration Testing

```bash
npm test
```

## 🔒 Security Features

- ✅ **PKCE** (Proof Key for Code Exchange) - Chống authorization code interception
- ✅ **State parameter** - CSRF protection
- ✅ **httpOnly cookies** - XSS protection
- ✅ **JWT signing** với RS256 (RSA)
- ✅ **Key rotation** support
- ✅ **Token revocation** với tokenValidAfter
- ✅ **Password hashing** với bcrypt
- ✅ **HTTPS enforced** in production

## 📁 Project Structure

```
new-iam/
├── docs/                       # Tài liệu chi tiết
│   ├── 01-oidc-basics.md
│   ├── 02-iam-concepts.md
│   ├── 03-token-verification.md
│   ├── 04-architecture.md
│   └── 05-implementation-guide.md
├── server/
│   ├── api/
│   │   ├── oidc/              # OIDC endpoints
│   │   │   ├── configuration/ # OIDC config
│   │   │   ├── interaction/   # Login handler
│   │   │   ├── [...].ts       # Catch-all OIDC
│   │   │   ├── provider.ts    # Provider instance
│   │   │   └── jwks.json.ts   # Public keys
│   │   ├── auth/              # Auth endpoints
│   │   │   ├── login.ts
│   │   │   ├── callback.ts
│   │   │   ├── check.ts
│   │   │   └── logout.ts
│   │   └── user/              # User endpoints
│   ├── config/
│   │   └── env.config.ts      # Environment config
│   ├── services/
│   │   ├── jwk.service.ts     # JWT key management
│   │   ├── user.service.ts    # User operations
│   │   ├── directusDb.service.ts  # Database
│   │   └── oidcDirectusAdapter.ts # OIDC storage
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   └── plugins/
│       └── init.ts            # Initialization
├── pages/
│   ├── index.vue              # Home page
│   └── interaction/
│       └── [uid].vue          # Login page
├── scripts/
│   └── generateKeys.js        # Generate JWT keys
├── package.json
├── nuxt.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

## 🎓 Learning Path

1. **Đọc tài liệu theo thứ tự:**

   - [01 - OIDC Basics](./docs/01-oidc-basics.md) ← BẮT ĐẦU TẠI ĐÂY
   - [02 - IAM Concepts](./docs/02-iam-concepts.md)
   - [03 - Token Verification](./docs/03-token-verification.md)
   - [04 - Architecture](./docs/04-architecture.md)
   - [05 - Implementation Guide](./docs/05-implementation-guide.md)

2. **Khám phá code:**

   - Đọc `server/config/env.config.ts` - Hiểu config
   - Đọc `server/services/jwk.service.ts` - Hiểu JWT keys
   - Đọc `server/api/oidc/configuration/index.ts` - Hiểu OIDC config
   - Đọc `server/api/auth/` - Hiểu auth flow

3. **Thử nghiệm:**

   - Run project và test login
   - Inspect tokens tại jwt.io
   - Check JWKS endpoint
   - Test token verification

4. **Mở rộng:**
   - Thêm social login (Google, Facebook)
   - Implement MFA (Multi-Factor Authentication)
   - Thêm audit logging
   - Implement refresh token rotation

## 🐛 Troubleshooting

### Error: "Missing required environment variable"

**Solution:** Copy `.env.example` to `.env` và điền values.

### Error: "Failed to connect to Directus"

**Solution:**

- Check Directus đang chạy: `curl http://localhost:8055/server/ping`
- Check `DIRECTUS_URL` và `DIRECTUS_TOKEN` trong `.env`

### Error: "Invalid signature"

**Solution:**

- Ensure `JWT_PRIMARY_PRIVATE_KEY` và `JWT_PRIMARY_PUBLIC_KEY` match
- Re-generate keys: `npm run generate:keys`

### Login failed: "Invalid credentials"

**Solution:**

- Check user exists trong Directus
- Check password hash đúng (bcrypt)
- Check user status = "active"

## 📖 References

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [JWK RFC 7517](https://datatracker.ietf.org/doc/html/rfc7517)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [node-oidc-provider](https://github.com/panva/node-oidc-provider)

## 📄 License

MIT - Learning Project

## 🙏 Acknowledgments

Dự án này được xây dựng cho mục đích học tập và hiểu rõ IAM systems.

---

**Happy Learning!** 🎉

Nếu có câu hỏi, hãy đọc tài liệu trong `docs/` hoặc check implementation guide.
