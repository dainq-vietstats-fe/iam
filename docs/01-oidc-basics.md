# 01 - OIDC Basics (OpenID Connect Cơ Bản)

## Mục Lục

1. [OAuth 2.0 là gì?](#oauth-20-là-gì)
2. [OpenID Connect là gì?](#openid-connect-là-gì)
3. [Các thuật ngữ quan trọng](#các-thuật-ngữ-quan-trọng)
4. [OIDC Flows](#oidc-flows)
5. [Tokens trong OIDC](#tokens-trong-oidc)
6. [OIDC Endpoints](#oidc-endpoints)

---

## OAuth 2.0 là gì?

**OAuth 2.0** (RFC 6749) là một **authorization framework** cho phép ứng dụng bên thứ ba truy cập tài nguyên của user mà **không cần biết password**.

### Ví dụ thực tế:

Bạn muốn cho ứng dụng "Photo Print" in ảnh từ Google Photos của bạn:

- **Cách cũ** (không an toàn): Đưa username/password Google cho Photo Print
- **Cách OAuth 2.0**: Photo Print xin quyền truy cập, Google cho phép và cấp một "access token"

### OAuth 2.0 giải quyết vấn đề gì?

1. **Không chia sẻ password**: User không bao giờ đưa password cho app thứ 3
2. **Giới hạn quyền truy cập**: Chỉ cho phép truy cập những gì cần thiết (ví dụ: chỉ đọc ảnh, không được xóa)
3. **Thu hồi quyền dễ dàng**: User có thể thu hồi quyền truy cập bất cứ lúc nào

### OAuth 2.0 KHÔNG PHẢI là gì?

- ❌ Không phải là authentication protocol (không biết user là ai)
- ❌ Không cung cấp thông tin về user
- ✅ Chỉ xử lý authorization (cấp quyền truy cập)

---

## OpenID Connect là gì?

**OpenID Connect (OIDC)** là một **authentication layer** được xây dựng **trên nền OAuth 2.0**.

### Sự khác biệt chính:

| OAuth 2.0                      | OpenID Connect                       |
| ------------------------------ | ------------------------------------ |
| Authorization (cấp quyền)      | Authentication (xác thực danh tính)  |
| "Cho phép truy cập tài nguyên" | "Đăng nhập và biết user là ai"       |
| Trả về Access Token            | Trả về Access Token + **ID Token**   |
| Không có thông tin user        | Có thông tin user (name, email, ...) |

### Ví dụ:

- **OAuth 2.0**: "Photo Print có thể truy cập ảnh của bạn"
- **OpenID Connect**: "Bạn là John Doe (john@example.com) và đã đăng nhập thành công vào Photo Print"

### OIDC = OAuth 2.0 + Identity Layer

```
┌─────────────────────────────────────┐
│      OpenID Connect (OIDC)          │
│  ┌───────────────────────────────┐  │
│  │   ID Token (JWT)              │  │ ← Thông tin user
│  │   - sub (user ID)             │  │
│  │   - name, email, picture      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      OAuth 2.0                │  │
│  │   Access Token                │  │ ← Quyền truy cập
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Các Thuật Ngữ Quan Trọng

### 1. Resource Owner (User)

Người sở hữu tài nguyên, thường là end-user.

**Ví dụ**: Bạn (owner của Google Photos)

### 2. Client (Application)

Ứng dụng muốn truy cập tài nguyên thay mặt user.

**Ví dụ**: Photo Print app

**Các loại Client:**

- **Public Client**: Không giữ được secret (mobile app, SPA)
- **Confidential Client**: Giữ được secret (server-side app)

### 3. Authorization Server (AS)

Server xác thực user và cấp tokens.

**Ví dụ**: FIDT Identity Service

**Chức năng:**

- Xác thực user (login)
- Hiển thị consent screen (cho phép/từ chối)
- Cấp authorization code
- Cấp access token, ID token, refresh token

### 4. Resource Server (RS)

Server chứa tài nguyên được bảo vệ.

**Ví dụ**: Google Photos API, FIDT Backend Services

**Chức năng:**

- Nhận access token từ client
- Verify token
- Trả về tài nguyên nếu token hợp lệ

### 5. OpenID Provider (OP)

Là Authorization Server có thêm OIDC authentication.

**FIDT Identity = OpenID Provider**

---

## OIDC Flows

### 1. Authorization Code Flow (Recommend)

Flow **an toàn nhất**, dùng cho server-side apps.

**Các bước:**

```
User                Client              Authorization Server        Resource Server
 |                    |                        |                         |
 |  (1) Click Login   |                        |                         |
 |------------------->|                        |                         |
 |                    |  (2) Redirect to /authorize                      |
 |                    |  + client_id                                     |
 |                    |  + redirect_uri                                  |
 |                    |  + scope=openid profile email                    |
 |                    |  + response_type=code                            |
 |                    |  + state=xyz123                                  |
 |                    |  + code_challenge (PKCE)                         |
 |                    |----------------------->|                         |
 |                    |                        |                         |
 |  (3) Login page    |                        |                         |
 |<------------------------------------------------|                         |
 |                    |                        |                         |
 |  (4) Enter credentials                      |                         |
 |------------------------------------------------>|                         |
 |                    |                        |                         |
 |  (5) Redirect to callback                   |                         |
 |     + code=abc123                           |                         |
 |     + state=xyz123                          |                         |
 |<------------------------------------------------|                         |
 |                    |                        |                         |
 |  (6) Forward code  |                        |                         |
 |------------------->|                        |                         |
 |                    |  (7) POST /token       |                         |
 |                    |  + code=abc123         |                         |
 |                    |  + client_id           |                         |
 |                    |  + client_secret       |                         |
 |                    |  + code_verifier (PKCE)|                         |
 |                    |----------------------->|                         |
 |                    |                        |                         |
 |                    |  (8) Return tokens     |                         |
 |                    |  {                     |                         |
 |                    |    access_token,       |                         |
 |                    |    id_token (JWT),     |                         |
 |                    |    refresh_token       |                         |
 |                    |  }                     |                         |
 |                    |<-----------------------|                         |
 |                    |                        |                         |
 |  (9) Logged in!    |                        |                         |
 |<-------------------|                        |                         |
 |                    |                        |                         |
 |                    |  (10) API call         |                         |
 |                    |  + Authorization: Bearer <access_token>          |
 |                    |------------------------------------------------->|
 |                    |                        |                         |
 |                    |  (11) Protected resource                         |
 |                    |<-------------------------------------------------|
```

**Tại sao an toàn?**

- Authorization code chỉ dùng 1 lần, có thời gian sống ngắn (10 phút)
- Access token không bao giờ đi qua browser
- Hỗ trợ PKCE (Proof Key for Code Exchange) chống CSRF

### 2. Implicit Flow (Deprecated)

❌ **Không khuyến khích** - Không an toàn cho SPA.

Tokens được trả về trực tiếp trong URL fragment:

```
https://client.com/callback#access_token=xyz&id_token=abc
```

**Vấn đề:**

- Tokens lộ trong browser history
- Không có refresh token
- Dễ bị XSS attack

### 3. Client Credentials Flow

Dùng cho **machine-to-machine** communication.

**Ví dụ**: Backend service A gọi Backend service B

```
Service A          Authorization Server
    |                      |
    |  POST /token         |
    |  + client_id         |
    |  + client_secret     |
    |  + grant_type=       |
    |    client_credentials|
    |--------------------->|
    |                      |
    |  { access_token }    |
    |<---------------------|
```

**Đặc điểm:**

- Không có user context
- Không có ID token
- Chỉ có access token

### 4. Refresh Token Flow

Dùng để lấy access token mới khi hết hạn.

```
Client             Authorization Server
  |                       |
  |  POST /token          |
  |  + grant_type=        |
  |    refresh_token      |
  |  + refresh_token=xyz  |
  |  + client_id          |
  |--------------------->|
  |                       |
  |  {                    |
  |    access_token (new),|
  |    id_token (new),    |
  |    refresh_token (new)|
  |  }                    |
  |<---------------------|
```

---

## Tokens trong OIDC

### 1. Access Token

**Mục đích**: Truy cập protected resources (APIs)

**Format**:

- Thường là JWT (JSON Web Token)
- Hoặc opaque token (random string)

**Cấu trúc JWT:**

```json
{
  "iss": "https://fidt-identity.com",
  "sub": "user123",
  "aud": "sales2-api",
  "exp": 1735689600,
  "iat": 1735603200,
  "scope": "read write"
}
```

**Đặc điểm:**

- Thời gian sống ngắn (1-24 giờ)
- Chứa thông tin về quyền truy cập (scopes)
- Gửi kèm mọi API request: `Authorization: Bearer <access_token>`

### 2. ID Token

**Mục đích**: Chứa thông tin về user đã authenticated

**Format**: **Luôn là JWT** (theo spec OIDC)

**Cấu trúc:**

```json
{
  "iss": "https://fidt-identity.com",
  "sub": "user123",
  "aud": "sales2-client",
  "exp": 1735689600,
  "iat": 1735603200,
  "auth_time": 1735603000,
  "nonce": "abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://example.com/photo.jpg"
}
```

**Claims quan trọng:**

- `sub`: Subject - User ID (unique identifier)
- `name`, `email`, `picture`: Thông tin user
- `auth_time`: Thời điểm đăng nhập
- `nonce`: Chống replay attack

**Đặc điểm:**

- Chỉ dùng để lấy thông tin user
- KHÔNG dùng để gọi API (dùng access token)
- Client phải verify signature của ID token

### 3. Refresh Token

**Mục đích**: Lấy access token mới khi hết hạn

**Format**: Opaque string (random)

**Đặc điểm:**

- Thời gian sống dài (days, months)
- Lưu an toàn, không bao giờ gửi qua URL
- Chỉ dùng với `/token` endpoint
- Có thể bị revoke bất cứ lúc nào

---

## OIDC Endpoints

### 1. Authorization Endpoint

`GET /authorize`

**Mục đích**: Khởi tạo authentication flow

**Parameters:**

```
GET /authorize?
  response_type=code               # Authorization Code Flow
  &client_id=sales2-client
  &redirect_uri=https://sales2.com/callback
  &scope=openid profile email      # openid = bắt buộc cho OIDC
  &state=random123                 # CSRF protection
  &nonce=random456                 # Replay protection
  &code_challenge=xyz              # PKCE
  &code_challenge_method=S256
```

**Response:**

- Redirect đến login page
- Sau khi login thành công, redirect về `redirect_uri`:
  ```
  https://sales2.com/callback?code=abc123&state=random123
  ```

### 2. Token Endpoint

`POST /token`

**Mục đích**: Exchange authorization code để lấy tokens

**Request:**

```http
POST /token HTTP/1.1
Host: fidt-identity.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=abc123
&redirect_uri=https://sales2.com/callback
&client_id=sales2-client
&client_secret=secret123
&code_verifier=xyz                # PKCE
```

**Response:**

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "eyJhbGc...",
  "refresh_token": "def456",
  "scope": "openid profile email"
}
```

### 3. UserInfo Endpoint

`GET /userinfo`

**Mục đích**: Lấy thông tin user (thay vì decode ID token)

**Request:**

```http
GET /userinfo HTTP/1.1
Host: fidt-identity.com
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://example.com/photo.jpg"
}
```

### 4. Discovery Endpoint

`GET /.well-known/openid-configuration`

**Mục đích**: Tự động discovery các endpoints và capabilities

**Response:**

```json
{
  "issuer": "https://fidt-identity.com",
  "authorization_endpoint": "https://fidt-identity.com/authorize",
  "token_endpoint": "https://fidt-identity.com/token",
  "userinfo_endpoint": "https://fidt-identity.com/userinfo",
  "jwks_uri": "https://fidt-identity.com/jwks.json",
  "response_types_supported": ["code", "token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email"]
}
```

### 5. JWKS Endpoint

`GET /jwks.json`

**Mục đích**: Lấy public keys để verify JWT signatures

**Response:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-1",
      "use": "sig",
      "alg": "RS256",
      "n": "0vx7agoebG...",
      "e": "AQAB"
    }
  ]
}
```

### 6. End Session Endpoint (Logout)

`GET /logout`

**Mục đích**: Đăng xuất và xóa session

**Request:**

```
GET /logout?
  id_token_hint=eyJhbGc...          # ID token để identify session
  &post_logout_redirect_uri=https://sales2.com/goodbye
```

---

## So Sánh Tổng Quan

### OAuth 2.0 vs OpenID Connect

| Tiêu chí      | OAuth 2.0                 | OpenID Connect                 |
| ------------- | ------------------------- | ------------------------------ |
| **Mục đích**  | Authorization             | Authentication + Authorization |
| **Use case**  | Cấp quyền truy cập        | Đăng nhập                      |
| **Token**     | Access Token              | Access Token + ID Token        |
| **User Info** | Không                     | Có (trong ID Token)            |
| **Scope**     | Custom (read, write, ...) | openid, profile, email         |
| **Endpoint**  | /authorize, /token        | + /userinfo, /.well-known/...  |

### Khi nào dùng gì?

**Dùng OAuth 2.0 thuần:**

- ✅ Chỉ cần cấp quyền truy cập
- ✅ Không quan tâm user là ai
- ✅ Machine-to-machine communication

**Dùng OpenID Connect:**

- ✅ Cần đăng nhập user
- ✅ Cần biết user là ai (name, email, ...)
- ✅ Single Sign-On (SSO)
- ✅ User authentication cho web/mobile apps

---

## Best Practices

### 1. Luôn dùng HTTPS

- Tất cả OIDC endpoints **bắt buộc** phải dùng HTTPS
- Không bao giờ gửi tokens qua HTTP

### 2. Dùng Authorization Code Flow + PKCE

- An toàn nhất cho mọi loại client (web, mobile, SPA)
- PKCE bảo vệ khỏi authorization code interception

### 3. Validate ID Token

- Verify signature (dùng public key từ JWKS)
- Check `iss` (issuer)
- Check `aud` (audience)
- Check `exp` (expiration)
- Check `nonce` (nếu có)

### 4. Không lưu tokens trong localStorage

- Dễ bị XSS attack
- Nên dùng httpOnly cookies (server-side)

### 5. Implement token refresh

- Access token hết hạn nhanh → dùng refresh token
- Tự động refresh trước khi expire

### 6. Implement logout properly

- Xóa tokens ở client
- Gọi `/logout` endpoint để xóa session ở server

---

## Tài Liệu Tham Khảo

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

---

**Next**: [02 - IAM Concepts](./02-iam-concepts.md)
