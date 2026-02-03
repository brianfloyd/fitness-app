<script>
  import { currentUser } from './lib/userStore.js';
  import LandingPage from './lib/LandingPage.svelte';
  import DailyLogForm from './lib/DailyLogForm.svelte';
  import SettingsPanel from './lib/SettingsPanel.svelte';

  let currentView = 'log';

  function showLog() {
    currentView = 'log';
  }

  function showSettings() {
    currentView = 'settings';
  }

  function logout() {
    currentUser.logout();
  }
</script>

{#if $currentUser}
  <main>
    <header>
      <h1>Fitness Daily Log</h1>
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

    {#if currentView === 'log'}
      <DailyLogForm />
    {:else if currentView === 'settings'}
      <SettingsPanel />
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
  }
  
  header {
    margin-bottom: var(--spacing-xl);
    text-align: center;
  }
  
  header h1 {
    font-size: 2rem;
    font-weight: 800;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: var(--spacing-lg);
    letter-spacing: -0.02em;
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
  
  @media (min-width: 768px) {
    header h1 {
      font-size: 2.5rem;
    }
  }
</style>
