<template>
  <div class="home-container">
    <div class="home-box">
      <h1>🔐 FIDT Identity Service</h1>
      <p class="subtitle">OpenID Connect Provider - Learning Project</p>

      <div v-if="user" class="user-info">
        <h2>✅ Authenticated</h2>
        <div class="user-card">
          <img v-if="user.avatar" :src="user.avatar" class="avatar" />
          <div class="avatar-placeholder" v-else>
            {{ user.name?.charAt(0) || user.email.charAt(0) }}
          </div>
          <div class="user-details">
            <p class="user-name">{{ user.name || 'User' }}</p>
            <p class="user-email">{{ user.email }}</p>
          </div>
        </div>

        <div class="roles-section" v-if="roles && roles.length > 0">
          <h3>Roles</h3>
          <div class="tags">
            <span v-for="role in roles" :key="role" class="tag">{{ role }}</span>
          </div>
        </div>

        <div class="policies-section" v-if="policies && policies.length > 0">
          <h3>Policies</h3>
          <div class="policy-list">
            <div v-for="policy in policies" :key="policy.id" class="policy-item">
              <strong>{{ policy.name }}</strong>
              <p>{{ policy.effect }}: {{ policy.actions.join(', ') }}</p>
            </div>
          </div>
        </div>

        <button @click="handleLogout" class="logout-button">
          Sign Out
        </button>
      </div>

      <div v-else class="login-prompt">
        <p>You are not signed in.</p>
        <a href="/api/auth/login" class="login-button">
          Sign In
        </a>
      </div>

      <div class="endpoints-section">
        <h2>📋 Available Endpoints</h2>
        <ul class="endpoints-list">
          <li>
            <a :href="`${publicUrl}/.well-known/openid-configuration`" target="_blank">
              OpenID Configuration (Discovery)
            </a>
          </li>
          <li>
            <a :href="`${publicUrl}/api/oidc/jwks.json`" target="_blank">
              JWKS (Public Keys)
            </a>
          </li>
          <li>
            <a href="/api/auth/login">Authorization (Login)</a>
          </li>
          <li>
            <a href="/api/auth/check">Check Authentication</a>
          </li>
        </ul>
      </div>

      <div class="docs-section">
        <h2>📚 Documentation</h2>
        <p>Read the docs to understand OIDC, IAM, and token verification:</p>
        <ul class="docs-list">
          <li><a href="https://github.com/fidt/new-iam/blob/main/docs/01-oidc-basics.md">01 - OIDC Basics</a></li>
          <li><a href="https://github.com/fidt/new-iam/blob/main/docs/02-iam-concepts.md">02 - IAM Concepts</a></li>
          <li><a href="https://github.com/fidt/new-iam/blob/main/docs/03-token-verification.md">03 - Token Verification</a></li>
          <li><a href="https://github.com/fidt/new-iam/blob/main/docs/04-architecture.md">04 - Architecture</a></li>
          <li><a href="https://github.com/fidt/new-iam/blob/main/docs/05-implementation-guide.md">05 - Implementation Guide</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const publicUrl = config.public.publicUrl;

// Check authentication status
const { data: authData, refresh } = await useFetch('/api/auth/check', {
  server: false,
  lazy: true,
  immediate: true,
});

const user = computed(() => authData.value?.user);
const roles = computed(() => authData.value?.roles);
const policies = computed(() => authData.value?.policies);

// Handle logout
function handleLogout() {
  window.location.href = '/api/auth/logout';
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.home-box {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h1 {
  margin: 0 0 10px 0;
  font-size: 32px;
  color: #333;
}

.subtitle {
  margin: 0 0 30px 0;
  color: #666;
  font-size: 16px;
}

.user-info {
  margin: 30px 0;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 20px 0;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
}

.user-details {
  flex: 1;
}

.user-name {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.user-email {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.roles-section,
.policies-section {
  margin: 20px 0;
}

h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #333;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-block;
  padding: 6px 12px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
}

.policy-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.policy-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.policy-item strong {
  display: block;
  margin-bottom: 5px;
  color: #333;
}

.policy-item p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.logout-button,
.login-button {
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  margin-top: 20px;
}

.logout-button:hover,
.login-button:hover {
  transform: translateY(-2px);
}

.login-prompt {
  text-align: center;
  padding: 40px 20px;
}

.endpoints-section,
.docs-section {
  margin: 40px 0;
  padding-top: 30px;
  border-top: 2px solid #f0f0f0;
}

h2 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #333;
}

.endpoints-list,
.docs-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.endpoints-list li,
.docs-list li {
  margin: 10px 0;
}

.endpoints-list a,
.docs-list a {
  color: #667eea;
  text-decoration: none;
  font-size: 16px;
}

.endpoints-list a:hover,
.docs-list a:hover {
  text-decoration: underline;
}
</style>
