<script>
  import { onMount, tick } from 'svelte';
  import { currentUser } from './userStore.js';
  import { getProfiles, createProfile, verifyProfile, getAuthConfig, verifyGoogleAuth } from './api.js';

  let profiles = [];
  let loading = true;
  let error = '';
  let googleClientId = null;
  let googleButtonReady = false;
  let googleButtonRendered = false;

  // Add user state
  let showAddForm = false;
  let newUsername = '';
  let newPassword = '';

  // Password modal state (for selecting existing user)
  let selectedProfile = null;
  let passwordInput = '';

  onMount(async () => {
    await loadProfiles();
    try {
      const config = await getAuthConfig();
      if (config?.googleClientId) {
        googleClientId = config.googleClientId;
        initGoogleSignIn();
      }
    } catch (e) {
      console.warn('Auth config load failed:', e);
    }
  });

  async function initGoogleSignIn() {
    if (!googleClientId || typeof window === 'undefined') return;
    const waitForGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
          auto_select: false,
        });
        googleButtonReady = true;
      } else {
        setTimeout(waitForGsi, 100);
      }
    };
    waitForGsi();
  }

  $: if (googleButtonReady && !googleButtonRendered && typeof window !== 'undefined') {
    renderGoogleButton();
  }

  async function renderGoogleButton() {
    await tick();
    const el = document.getElementById('google-signin-btn');
    if (!el || googleButtonRendered) return;
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.renderButton(el, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          width: 280,
        });
        googleButtonRendered = true;
      } catch (e) {
        console.error('Google button render failed:', e);
      }
    }
  }

  async function handleGoogleCredential(response) {
    if (!response?.credential) return;
    error = '';
    try {
      const user = await verifyGoogleAuth(response.credential);
      currentUser.setUser(user);
    } catch (e) {
      error = e.message || 'Google sign-in failed';
    }
  }

  async function loadProfiles() {
    loading = true;
    error = '';
    try {
      profiles = await getProfiles();
    } catch (e) {
      error = e.message || 'Failed to load profiles';
    } finally {
      loading = false;
    }
  }

  function openAddForm() {
    showAddForm = true;
    newUsername = '';
    newPassword = '';
    error = '';
  }

  function closeAddForm() {
    showAddForm = false;
    newUsername = '';
    newPassword = '';
    error = '';
  }

  async function handleAddUser() {
    const u = (newUsername || '').trim();
    const p = newPassword || '';
    if (!u) {
      error = 'Enter a username';
      return;
    }
    if (!p) {
      error = 'Enter a password';
      return;
    }
    error = '';
    try {
      await createProfile({ username: u, password: p });
      await loadProfiles();
      closeAddForm();
    } catch (e) {
      error = e.message || 'Failed to add user';
    }
  }

  function selectCard(profile) {
    selectedProfile = profile;
    passwordInput = '';
    error = '';
  }

  function closePasswordModal() {
    selectedProfile = null;
    passwordInput = '';
    error = '';
  }

  async function handleLogin() {
    if (!selectedProfile) return;
    const p = passwordInput || '';
    if (!p) {
      error = 'Enter password';
      return;
    }
    error = '';
    try {
      const user = await verifyProfile({
        username: selectedProfile.username,
        password: p,
      });
      currentUser.setUser(user);
      closePasswordModal();
    } catch (e) {
      error = e.message || 'Invalid password';
    }
  }
</script>

<div class="landing">
  <header class="page-header landing-header">
    <img src="/fit-myaiway-logo.png" alt="Fit MyAIWay" class="brand-logo" />
    <p class="subtitle">Select your profile</p>
  </header>

  {#if loading}
    <p class="loading">Loading profiles…</p>
  {:else}
    {#if googleButtonReady}
      <div class="google-signin-wrapper">
        <div id="google-signin-btn" class="google-btn-container"></div>
        <p class="divider-text">or</p>
      </div>
    {/if}
    <div class="cards-grid">
      {#each profiles as profile}
        <button
          class="profile-card"
          on:click={() => selectCard(profile)}
          type="button"
        >
          <span class="card-icon">👤</span>
          <span class="card-username">{profile.username}</span>
          <span class="card-hint">Tap to sign in</span>
        </button>
      {/each}

      <button
        class="profile-card add-card"
        on:click={openAddForm}
        type="button"
      >
        <span class="card-icon">➕</span>
        <span class="card-username">Add User</span>
        <span class="card-hint">Create new profile</span>
      </button>
    </div>
  {/if}

  {#if error && !showAddForm && !selectedProfile}
    <p class="error-banner">{error}</p>
  {/if}
</div>

<!-- Add User Modal -->
{#if showAddForm}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-title">
    <div class="modal">
      <h2 id="add-title">Add User</h2>
      <form on:submit|preventDefault={handleAddUser}>
        <label for="add-username">Username</label>
        <input
          id="add-username"
          type="text"
          bind:value={newUsername}
          placeholder="e.g. me"
          autocomplete="username"
        />
        <label for="add-password">Password</label>
        <input
          id="add-password"
          type="password"
          bind:value={newPassword}
          placeholder="Choose a password"
          autocomplete="new-password"
        />
        {#if error}
          <p class="form-error">{error}</p>
        {/if}
        <div class="modal-actions">
          <button type="button" class="btn-secondary" on:click={closeAddForm}>
            Cancel
          </button>
          <button type="submit">Add User</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Password Modal (for selecting existing user) -->
{#if selectedProfile}
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="login-title">
    <div class="modal">
      <h2 id="login-title">Sign in as {selectedProfile.username}</h2>
      <form on:submit|preventDefault={handleLogin}>
        <label for="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          bind:value={passwordInput}
          placeholder="Enter password"
          autocomplete="current-password"
          autofocus
        />
        {#if error}
          <p class="form-error">{error}</p>
        {/if}
        <div class="modal-actions">
          <button type="button" class="btn-secondary" on:click={closePasswordModal}>
            Cancel
          </button>
          <button type="submit">Sign In</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .landing {
    text-align: center;
    padding: var(--spacing-lg) 0;
  }

  .landing-header {
    margin-bottom: var(--spacing-xl);
  }

  .brand-logo {
    max-width: 280px;
    width: 100%;
    height: auto;
    display: block;
    margin: 0 auto var(--spacing-md);
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 1rem;
  }

  .loading {
    color: var(--text-muted);
    padding: var(--spacing-xl);
  }

  .google-signin-wrapper {
    margin-bottom: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
  }

  .google-btn-container {
    display: flex;
    justify-content: center;
    min-height: 44px;
    width: 100%;
  }

  .divider-text {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin: 0;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--spacing-lg);
    max-width: 560px;
    margin: 0 auto;
  }

  .profile-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    min-height: 140px;
    padding: var(--spacing-lg);
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--border-radius);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .profile-card:hover {
    border-color: var(--primary-color);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .profile-card.add-card {
    border-style: dashed;
    border-color: var(--border-light);
  }

  .profile-card.add-card:hover {
    border-color: var(--accent-color);
  }

  .card-icon {
    font-size: 2rem;
  }

  .card-username {
    font-weight: 600;
    font-size: 1.1rem;
  }

  .card-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .error-banner {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-radius: var(--border-radius-sm);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--spacing-md);
  }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: var(--spacing-xl);
    width: 100%;
    max-width: 360px;
    box-shadow: var(--shadow-lg);
  }

  .modal h2 {
    margin-bottom: var(--spacing-lg);
    font-size: 1.25rem;
  }

  .modal label {
    display: block;
    margin-top: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
  }

  .modal input {
    width: 100%;
  }

  .form-error {
    margin-top: var(--spacing-sm);
    color: #fca5a5;
    font-size: 0.875rem;
  }

  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
  }

  .modal-actions button {
    flex: 1;
  }

  .btn-secondary {
    background: var(--surface-elevated) !important;
    color: var(--text-primary) !important;
  }

  .btn-secondary:hover {
    background: var(--border) !important;
  }

  @media (min-width: 768px) {
    .brand-logo {
      max-width: 340px;
    }
  }
</style>
