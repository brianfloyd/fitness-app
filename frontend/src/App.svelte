<script>
  import { onMount } from 'svelte';
  import { currentUser } from './lib/userStore.js';
  import LandingPage from './lib/LandingPage.svelte';
  import DailyLogForm from './lib/DailyLogForm.svelte';
  import SettingsPanel from './lib/SettingsPanel.svelte';
  import MobileBottomNav from './lib/MobileBottomNav.svelte';
  import PrivacyPage from './lib/PrivacyPage.svelte';
  import TermsPage from './lib/TermsPage.svelte';

  let currentView = 'log';
  let routePath = (typeof window !== 'undefined' && window.location.pathname) || '';

  function syncRoute() {
    routePath = (typeof window !== 'undefined' && window.location.pathname) || '';
  }

  onMount(() => {
    syncRoute();
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  });
  let currentMobileView = 'home';
  let showSettingsOverlay = false;

  function showLog() {
    currentView = 'log';
  }

  function showSettings() {
    currentView = 'settings';
  }

  function handleMobileView(e) {
    const view = e.detail;
    if (view === 'settings') {
      showSettingsOverlay = true;
    }
    currentMobileView = view;
  }

  function closeSettingsOverlay() {
    showSettingsOverlay = false;
    currentMobileView = 'home';
  }

  function logout() {
    currentUser.logout();
  }
</script>

{#if routePath === '/privacy'}
  <PrivacyPage />
{:else if routePath === '/terms'}
  <TermsPage />
{:else if $currentUser}
  <main>
    <!-- Desktop header -->
    <header class="desktop-header">
      <img src="/fit-myaiway-logo.png" alt="Fit MyAIWay" class="header-logo" />
      <div class="header-row">
        <nav>
          <button class="nav-btn" class:active={currentView === 'log'} on:click={showLog}>
            Daily Log
          </button>
          <button class="nav-btn" class:active={currentView === 'settings'} on:click={showSettings}>
            Settings
          </button>
        </nav>
        <button class="logout-btn" on:click={logout} title="Switch user">
          {$currentUser.username} · Log out
        </button>
      </div>
    </header>

    <!-- Content: desktop vs mobile -->
    <div class="content-area">
      <div class="desktop-content">
        {#if currentView === 'log'}
          <DailyLogForm />
        {:else if currentView === 'settings'}
          <SettingsPanel />
        {/if}
      </div>

      <div class="mobile-content" class:no-scroll={currentMobileView === 'home'}>
        <DailyLogForm mobileView={currentMobileView} />
        <MobileBottomNav activeView={currentMobileView} on:view={handleMobileView} />
      </div>
    </div>

    <!-- Settings overlay (mobile) -->
    {#if showSettingsOverlay}
      <div class="settings-overlay" on:click|self={closeSettingsOverlay} on:keydown={(e) => e.key === 'Escape' && closeSettingsOverlay()} role="button" tabindex="-1">
        <div class="settings-overlay-content">
          <div class="settings-overlay-header">
            <h2>Settings</h2>
            <button class="close-overlay-btn" on:click={closeSettingsOverlay} aria-label="Close">×</button>
          </div>
          <SettingsPanel />
        </div>
      </div>
    {/if}
  </main>
{:else}
  <LandingPage />
{/if}

<style>
  main {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    position: relative;
    padding-bottom: 0;
  }

  .content-area {
    position: relative;
  }

  .desktop-content {
    display: none;
  }

  .mobile-content {
    display: block;
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  }

  .mobile-content.no-scroll {
    overflow-y: hidden;
    overflow-x: hidden;
  }

  .desktop-header {
    display: none;
  }

  .settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: env(safe-area-inset-top) var(--spacing-md) var(--spacing-xl);
    overflow-y: auto;
  }

  .settings-overlay-content {
    background: var(--surface);
    border-radius: var(--border-radius);
    border: 1px solid var(--border);
    width: 100%;
    max-width: 500px;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    padding: var(--spacing-lg);
  }

  .settings-overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-lg);
    padding-bottom: var(--spacing-md);
    border-bottom: 1px solid var(--border);
  }

  .settings-overlay-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .close-overlay-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: var(--border-radius-sm);
    color: var(--text-muted);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
  }

  .close-overlay-btn:hover {
    color: var(--text-primary);
    background: var(--surface-elevated);
  }

  @media (min-width: 768px) {
    .desktop-header {
      display: block;
      margin-bottom: var(--spacing-xl);
      text-align: center;
    }

    .header-logo {
      max-width: 220px;
      height: auto;
      margin: 0 auto var(--spacing-lg);
      display: block;
    }

    .header-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-md);
    }

    nav {
      display: flex;
      gap: var(--spacing-sm);
      justify-content: center;
      background-color: var(--surface);
      padding: var(--spacing-xs);
      border-radius: var(--border-radius);
      border: 1px solid var(--border);
    }

    .logout-btn {
      background: transparent !important;
      color: var(--text-muted) !important;
      font-size: 0.875rem;
      padding: var(--spacing-xs) var(--spacing-sm);
    }

    .logout-btn:hover {
      color: var(--text-secondary) !important;
      background: var(--surface-elevated) !important;
    }

    .nav-btn {
      padding: var(--spacing-sm) var(--spacing-lg);
      background-color: transparent;
      color: var(--text-secondary);
      border: none;
      border-radius: var(--border-radius-sm);
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .nav-btn:hover {
      background-color: var(--surface-elevated);
      color: var(--text-primary);
    }

    .nav-btn.active {
      background-color: var(--primary-color);
      color: white;
      box-shadow: var(--shadow);
    }

    .desktop-content {
      display: block;
    }

    .mobile-content {
      display: none;
    }
  }
</style>
