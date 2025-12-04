<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>🔐 FIDT Identity</h1>
        <p>Sign in to continue</p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="your@email.com"
            autocomplete="email"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="Enter your password"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <button type="submit" class="login-button" :disabled="loading">
          <span v-if="!loading">Sign In</span>
          <span v-else>Signing in...</span>
        </button>
      </form>

      <div class="login-footer">
        <p>Don't have an account? Contact your administrator.</p>
      </div>
    </div>

    <div class="debug-info" v-if="interactionDetails">
      <h3>Debug Info</h3>
      <p><strong>Client:</strong> {{ interactionDetails.params?.client_id }}</p>
      <p><strong>Scope:</strong> {{ interactionDetails.params?.scope }}</p>
      <p><strong>Prompt:</strong> {{ interactionDetails.prompt }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const uid = route.params.uid as string;

// Form state
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

// Interaction details
const interactionDetails = ref<any>(null);

// Fetch interaction details
const { data, error: fetchError } = await useFetch(
  `/api/oidc/interaction/${uid}`
);

if (fetchError.value) {
  error.value = 'Invalid interaction session';
} else {
  interactionDetails.value = data.value;
}

// Handle login submission
async function handleLogin() {
  loading.value = true;
  error.value = '';

  try {
    const response = await $fetch(`/api/oidc/interaction/${uid}`, {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    });

    if (response.success && response.redirect) {
      // Redirect to continue OAuth flow
      window.location.href = response.redirect;
    }
  } catch (err: any) {
    console.error('Login failed:', err);
    error.value = err.data?.message || 'Invalid credentials. Please try again.';
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #333;
}

.login-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.login-button {
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 10px;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 30px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.debug-info {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  max-width: 400px;
  font-size: 13px;
  font-family: monospace;
}

.debug-info h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
}

.debug-info p {
  margin: 5px 0;
}
</style>
