<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let activeView = 'home';

  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'workout', label: 'Workout', icon: 'workout' },
    { id: 'food', label: 'Food', icon: 'food' },
    { id: 'stats', label: 'Stats', icon: 'stats' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  function select(id) {
    if (activeView !== id) {
      activeView = id;
      dispatch('view', id);
    }
  }
</script>

<nav class="bottom-nav" aria-label="Main navigation">
  {#each tabs as tab}
    <button
      class="nav-item"
      class:active={activeView === tab.id}
      on:click={() => select(tab.id)}
      aria-label={tab.label}
      aria-current={activeView === tab.id ? 'page' : undefined}
    >
      {#if tab.icon === 'home'}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      {:else if tab.icon === 'workout'}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6.5 6.5h11v11h-11z"></path>
          <path d="M6.5 6.5l5.5 5.5 5.5-5.5"></path>
          <path d="M12 12v6"></path>
          <path d="M8 17h8"></path>
        </svg>
      {:else if tab.icon === 'food'}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      {:else if tab.icon === 'stats'}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      {:else if tab.icon === 'settings'}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      {/if}
      <span class="nav-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--surface);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
    padding-top: var(--spacing-sm);
    z-index: 100;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.7rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.2s ease, background 0.2s ease;
  }

  .nav-item svg {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
  }

  .nav-item:hover {
    color: var(--text-secondary);
  }

  .nav-item.active {
    color: var(--primary-color);
  }

  .nav-item.active svg {
    stroke-width: 2.5;
  }

  .nav-label {
    white-space: nowrap;
  }
</style>
