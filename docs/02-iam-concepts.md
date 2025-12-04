# 02 - IAM Concepts (Identity and Access Management)

## Mục Lục

1. [IAM là gì?](#iam-là-gì)
2. [Các thành phần chính của IAM](#các-thành-phần-chính-của-iam)
3. [Authentication vs Authorization](#authentication-vs-authorization)
4. [RBAC và PBAC](#rbac-và-pbac)
5. [Identity Provider (IdP)](#identity-provider-idp)
6. [Single Sign-On (SSO)](#single-sign-on-sso)

---

## IAM là gì?

**Identity and Access Management (IAM)** là hệ thống quản lý **danh tính** và **quyền truy cập** của users trong một tổ chức.

### Câu hỏi IAM trả lời:

1. **WHO**: User là ai? (Identity)
2. **WHAT**: User có quyền gì? (Authorization)
3. **WHEN**: Khi nào user được truy cập? (Temporal policies)
4. **WHERE**: Từ đâu user truy cập? (Location-based)
5. **HOW**: User xác thực như thế nào? (Authentication methods)

### Mục tiêu của IAM:

- ✅ Đảm bảo **đúng người** truy cập **đúng tài nguyên** vào **đúng thời điểm**
- ✅ Bảo mật hệ thống khỏi unauthorized access
- ✅ Quản lý users, roles, permissions tập trung
- ✅ Audit trail - tracking mọi hành động của users
- ✅ Compliance với các chuẩn bảo mật (GDPR, SOC2, ...)

---

## Các Thành Phần Chính của IAM

### 1. Identity (Danh Tính)

**Digital Identity** = Thông tin đại diện cho một user trong hệ thống

**Bao gồm:**

```
User Identity {
  - ID (unique identifier)
  - Username/Email
  - Password (hashed)
  - Profile (name, avatar, phone, ...)
  - Attributes (department, position, ...)
  - Credentials (passwords, certificates, biometrics)
}
```

**Các loại Identity:**

- **Human Identity**: End users (employees, customers)
- **Machine Identity**: Services, APIs, bots
- **Federated Identity**: Identity từ external IdP (Google, Azure AD)

### 2. Authentication (Xác Thực)

**Authentication** = Quá trình **xác minh danh tính** của user

**Câu hỏi**: "Bạn có thực sự là người bạn claim?"

**Các phương thức:**

#### a) **Password-based** (Something you know)

```
User → nhập username + password → Server verify → Success/Fail
```

**Vấn đề:**

- ❌ Dễ bị phishing
- ❌ Users dùng weak passwords
- ❌ Password reuse across sites

#### b) **Multi-Factor Authentication (MFA)** (Recommend)

Kết hợp 2 hoặc nhiều factors:

| Factor                 | Example                                 |
| ---------------------- | --------------------------------------- |
| **Something you know** | Password, PIN                           |
| **Something you have** | Phone (OTP), Hardware token, Smart card |
| **Something you are**  | Fingerprint, Face ID, Iris scan         |

**Ví dụ MFA:**

```
User → Password → Success → Send OTP to phone → User nhập OTP → Success
```

#### c) **Passwordless Authentication**

- Magic links (link qua email)
- WebAuthn / FIDO2 (hardware keys)
- Biometrics

#### d) **Social Login**

- Login bằng Google, Facebook, GitHub
- Sử dụng OAuth 2.0 / OpenID Connect

### 3. Authorization (Ủy Quyền)

**Authorization** = Xác định **quyền truy cập** của authenticated user

**Câu hỏi**: "User này được phép làm gì?"

**Flow:**

```
User (authenticated) → Request resource → Check permissions → Allow/Deny
```

**Ví dụ:**

- User A (admin): ✅ Có thể xóa users
- User B (viewer): ❌ Chỉ được xem, không được xóa

### 4. Access Control (Kiểm Soát Truy Cập)

**Access Control** = Cơ chế **enforce authorization policies**

**Các mô hình:**

#### a) **Discretionary Access Control (DAC)**

Owner của resource quyết định ai được truy cập

**Ví dụ**: Google Drive - bạn share file cho ai thì người đó được truy cập

#### b) **Mandatory Access Control (MAC)**

System administrator quyết định access rules

**Ví dụ**: Military systems - classification levels (Top Secret, Secret, ...)

#### c) **Role-Based Access Control (RBAC)** ⭐

Gán permissions cho roles, rồi gán roles cho users

**Ví dụ:**

```
User John → Role: Sales Manager → Permissions: [view_orders, create_orders, view_customers]
User Jane → Role: Accountant → Permissions: [view_invoices, create_invoices]
```

#### d) **Attribute-Based Access Control (ABAC)**

Dựa trên attributes của user, resource, environment

**Ví dụ:**

```
IF (user.department == "Sales"
    AND user.level >= "Manager"
    AND resource.type == "CustomerData"
    AND time.hour >= 9 AND time.hour <= 17)
THEN allow
```

### 5. Policy (Chính Sách)

**Policy** = Rules định nghĩa **who can do what**

**Cấu trúc policy:**

```json
{
  "id": "policy-1",
  "name": "Sales Manager Policy",
  "subjects": ["role:sales-manager"],
  "resources": ["api:orders", "api:customers"],
  "actions": ["read", "create", "update"],
  "effect": "allow",
  "conditions": {
    "time": "business_hours",
    "ip": "company_network"
  }
}
```

**Các loại policies:**

- **Resource-based**: Gắn vào resource (ví dụ: S3 bucket policy)
- **Identity-based**: Gắn vào user/role (ví dụ: IAM user policy)
- **Service-based**: Gắn vào service (ví dụ: Lambda execution role)

### 6. Audit Trail (Nhật Ký Kiểm Toán)

**Audit Trail** = Ghi lại **mọi hành động** trong hệ thống

**Thông tin cần ghi:**

```json
{
  "timestamp": "2025-12-05T10:30:00Z",
  "user_id": "user123",
  "action": "DELETE_USER",
  "resource": "user:456",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "result": "success"
}
```

**Mục đích:**

- ✅ Security investigation
- ✅ Compliance audit
- ✅ Forensics (phân tích sau sự cố)
- ✅ User behavior analytics

---

## Authentication vs Authorization

### So Sánh Chi Tiết

| Tiêu chí        | Authentication                 | Authorization                |
| --------------- | ------------------------------ | ---------------------------- |
| **Câu hỏi**     | "Bạn là ai?"                   | "Bạn có quyền gì?"           |
| **Mục đích**    | Verify identity                | Check permissions            |
| **Thời điểm**   | Đầu tiên (login)               | Sau authentication           |
| **Thông tin**   | Username, password, biometrics | Roles, permissions, policies |
| **Kết quả**     | Authenticated or not           | Allowed or denied            |
| **Ví dụ**       | Nhập password đúng             | Admin có thể xóa user        |
| **Công nghệ**   | OAuth, SAML, LDAP              | RBAC, ABAC, ACLs             |
| **HTTP Status** | 401 Unauthorized               | 403 Forbidden                |

### Ví Dụ Thực Tế

**Scenario**: User muốn xóa một customer record

```
Step 1: Authentication
User → "Tôi là John, password: abc123"
System → Verify password → ✅ "OK, bạn là John"

Step 2: Authorization
System → "John muốn xóa customer record. Kiểm tra permissions..."
         → Check John's roles → "Sales Manager"
         → Check "Sales Manager" permissions → ["view", "create", "update"]
         → ❌ "Không có quyền 'delete'"
Result → 403 Forbidden
```

---

## RBAC và PBAC

### 1. Role-Based Access Control (RBAC)

**Khái niệm**: Gán permissions cho **roles**, rồi gán roles cho users

**Cấu trúc:**

```
Users → Roles → Permissions → Resources
```

**Ví dụ:**

```
┌──────────┐       ┌──────────────┐       ┌─────────────┐
│  Users   │       │    Roles     │       │ Permissions │
├──────────┤       ├──────────────┤       ├─────────────┤
│ John     │──────>│ Admin        │──────>│ user:delete │
│ Jane     │──────>│ Sales Manager│──────>│ order:read  │
│ Bob      │──────>│ Viewer       │──────>│ order:create│
└──────────┘       └──────────────┘       │ customer:*  │
                                           └─────────────┘
```

**Ưu điểm:**

- ✅ Dễ quản lý (thay đổi role, không cần update từng user)
- ✅ Dễ hiểu (roles map với job titles)
- ✅ Separation of duties

**Nhược điểm:**

- ❌ Không linh hoạt (không handle complex scenarios)
- ❌ Role explosion (quá nhiều roles)

**Implementation trong FIDT:**

```typescript
// Database schema
Table: users {
  id: string
  email: string
  name: string
}

Table: roles {
  id: string
  name: string
  description: string
}

Table: user_roles {
  user_id: string
  role_id: string
}

Table: permissions {
  role_id: string
  resource: string
  action: string
}
```

### 2. Policy-Based Access Control (PBAC)

**Khái niệm**: Gán **policies** cho users/roles, policies là dynamic rules

**Cấu trúc Policy:**

```json
{
  "id": "policy-customer-access",
  "effect": "allow",
  "subjects": ["user:john", "role:sales"],
  "actions": ["read", "update"],
  "resources": ["customer:*"],
  "conditions": {
    "department": "sales",
    "region": "vietnam",
    "time": "business_hours"
  }
}
```

**Ví dụ Phức Tạp:**

**Rule**: "Sales Manager chỉ được xem customers trong region của mình"

```json
{
  "effect": "allow",
  "subjects": ["role:sales-manager"],
  "actions": ["read"],
  "resources": ["customer:*"],
  "conditions": {
    "user.region == resource.region": true
  }
}
```

**Ưu điểm:**

- ✅ Rất linh hoạt (dynamic conditions)
- ✅ Handle complex scenarios
- ✅ Fine-grained access control

**Nhược điểm:**

- ❌ Phức tạp hơn RBAC
- ❌ Performance overhead (evaluate policies)

---

## Identity Provider (IdP)

**Identity Provider** = Hệ thống **quản lý identities** và **cung cấp authentication**

### IdP làm gì?

1. **Store user identities** (username, password, profiles)
2. **Authenticate users** (verify credentials)
3. **Issue tokens** (access tokens, ID tokens)
4. **Federate identities** (integrate với external IdPs)

### Các loại IdP:

#### 1. **Internal IdP**

Tự quản lý user database

**Ví dụ**: FIDT Identity Service

**Pros:**

- ✅ Full control
- ✅ Customize được

**Cons:**

- ❌ Phải tự maintain (password reset, MFA, ...)
- ❌ Security responsibility

#### 2. **External IdP (Social Login)**

Sử dụng identity từ providers khác

**Ví dụ**: Google, Facebook, GitHub, Azure AD

**Pros:**

- ✅ Không phải quản lý passwords
- ✅ Trusted providers
- ✅ MFA built-in

**Cons:**

- ❌ Phụ thuộc external service
- ❌ Privacy concerns

#### 3. **Enterprise IdP**

Dành cho enterprises

**Ví dụ**: Okta, Auth0, Azure AD, Keycloak

**Features:**

- ✅ SSO across multiple apps
- ✅ User provisioning (SCIM)
- ✅ Directory integration (LDAP, Active Directory)
- ✅ Advanced MFA
- ✅ Audit logs

### Identity Federation

**Federation** = Tin tưởng identities từ external IdPs

**Ví dụ:**

```
User có Google account → Login to FIDT via Google → FIDT trust Google IdP
```

**Protocols:**

- **SAML 2.0**: XML-based (cũ, enterprise)
- **OpenID Connect**: JSON-based (modern, web-friendly)

**Flow:**

```
User → Click "Login with Google"
     → Redirect to Google (external IdP)
     → Google authenticates
     → Google redirects back với ID token
     → FIDT trust token từ Google
     → FIDT creates local session
```

---

## Single Sign-On (SSO)

**SSO** = Đăng nhập **một lần**, truy cập **nhiều ứng dụng**

### Cách hoạt động:

```
User → Login to IdP (FIDT Identity)
     → Get session cookie
     → Access App A → Redirects to IdP → Already logged in → Redirects back
     → Access App B → Redirects to IdP → Already logged in → Redirects back
     → Access App C → Redirects to IdP → Already logged in → Redirects back
```

**IdP = Central authentication point**

### SSO Flow với OIDC:

```
┌──────┐                  ┌──────────┐                ┌───────┐
│ User │                  │   IdP    │                │ App A │
└───┬──┘                  └────┬─────┘                └───┬───┘
    │                          │                          │
    │ (1) Access App A         │                          │
    ├─────────────────────────────────────────────────────>│
    │                          │                          │
    │ (2) Redirect to IdP      │                          │
    │<──────────────────────────────────────────────────────┤
    │                          │                          │
    │ (3) Login at IdP         │                          │
    ├─────────────────────────>│                          │
    │                          │                          │
    │ (4) Set IdP session      │                          │
    │<─────────────────────────┤                          │
    │                          │                          │
    │ (5) Redirect back to App │                          │
    ├─────────────────────────────────────────────────────>│
    │                          │                          │
    │ (6) Logged in to App A   │                          │
    │                          │                          │
    │ (7) Access App B         │                          │
    ├─────────────────────────────────────────────────────>│
    │                          │                          │
    │ (8) Redirect to IdP      │                          │
    │<──────────────────────────────────────────────────────┤
    │                          │                          │
    │ (9) Already has IdP session! No login needed         │
    │                          │                          │
    │ (10) Redirect back       │                          │
    ├─────────────────────────────────────────────────────>│
    │                          │                          │
    │ (11) Logged in to App B (no password)                │
```

### SSO Benefits:

**For Users:**

- ✅ Một lần login cho nhiều apps
- ✅ Không phải nhớ nhiều passwords
- ✅ Better UX

**For IT:**

- ✅ Centralized user management
- ✅ Centralized security policies
- ✅ Easier onboarding/offboarding
- ✅ Better audit trail

**For Security:**

- ✅ Enforce strong password policies ở một chỗ
- ✅ Centralized MFA
- ✅ Faster user deprovisioning (xóa một user, revoke tất cả apps)

---

## IAM trong FIDT Architecture

### High-Level Architecture:

```
┌─────────────────────────────────────────────────────┐
│                 FIDT Identity (IdP)                 │
│  ┌───────────────────────────────────────────────┐  │
│  │  OIDC Provider (node-oidc-provider)          │  │
│  │  - Authentication                             │  │
│  │  - Token issuance                             │  │
│  │  - Session management                         │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  User Store (Directus)                       │  │
│  │  - User profiles                              │  │
│  │  - Passwords (hashed)                         │  │
│  │  - Roles                                      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         │ Issues tokens
                         │ (access_token, id_token)
                         ▼
┌─────────────────────────────────────────────────────┐
│              SAUL API Gateway                       │
│  - Verify JWT signatures                            │
│  - Check TokenValidAfter                            │
│  - Evaluate policies                                │
│  - Route requests                                   │
└─────────────────────────────────────────────────────┘
                         │
                         │ Forward authorized requests
                         ▼
┌─────────────────────────────────────────────────────┐
│              Backend Services                       │
│  - Sales2 API                                       │
│  - Customer API                                     │
│  - Order API                                        │
└─────────────────────────────────────────────────────┘
```

### Components:

1. **FIDT Identity (IdP)**

   - OpenID Provider
   - User authentication
   - Token issuance

2. **Directus (User Store)**

   - Identity database
   - User profiles, roles, permissions

3. **SAUL (Policy Engine)**

   - Token verification
   - Policy evaluation
   - API Gateway

4. **Backend Services**
   - Protected resources
   - Business logic

---

## Best Practices

### 1. Principle of Least Privilege

Chỉ cấp **minimum permissions** cần thiết

**Bad:**

```
User John → Role: Admin (có mọi quyền)
```

**Good:**

```
User John → Role: Sales Manager (chỉ có quyền sales-related)
```

### 2. Separation of Duties

Tách biệt duties để tránh fraud

**Ví dụ:**

- User A: Tạo invoice
- User B: Approve invoice
- Không user nào vừa tạo vừa approve được

### 3. Regular Access Reviews

Định kỳ review và revoke unused permissions

### 4. Use MFA

Bắt buộc MFA cho sensitive operations

### 5. Monitor và Alert

Cảnh báo khi có:

- Failed login attempts
- Privilege escalation
- Access from unusual locations

### 6. Implement Token Expiration

- Access tokens: Short-lived (1-24 hours)
- Refresh tokens: Medium-lived (days)
- Sessions: Reasonable timeout

### 7. Centralized IAM

Không mỗi app tự manage users riêng

---

## Tài Liệu Tham Khảo

- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)

---

**Next**: [03 - Token Verification](./03-token-verification.md)
