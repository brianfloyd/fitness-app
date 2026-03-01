<script>
  import GeneralSettings from './GeneralSettings.svelte';
  import AddDeviceSettings from './AddDeviceSettings.svelte';

  let currentSection = null;

  const sections = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'devices', label: 'Add Device', icon: 'device' },
  ];

  function selectSection(id) {
    currentSection = id;
  }

  function goBack() {
    currentSection = null;
  }
</script>

<div class="settings-panel">
  <div class="card">
    {#if currentSection === null}
      <h2>Settings</h2>
      <nav class="settings-list" aria-label="Settings categories">
        {#each sections as section}
          <button
            type="button"
            class="settings-list-item"
            on:click={() => selectSection(section.id)}
          >
            <span class="settings-item-label">{section.label}</span>
            <span class="settings-item-arrow">›</span>
          </button>
        {/each}
      </nav>

      <section class="legal-section" aria-labelledby="legal-heading">
        <h3 id="legal-heading" class="legal-heading">Legal & Privacy</h3>
        <p class="legal-subtext">Review our Privacy Policy and Terms of Service.</p>
        <div class="legal-links">
          <div class="legal-link-item">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              class="legal-link"
            >
              Privacy Policy
            </a>
            <p class="legal-link-help">View how your Fitbit data is handled and protected.</p>
          </div>
          <div class="legal-link-item">
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              class="legal-link"
            >
              Terms of Service
            </a>
            <p class="legal-link-help">Review the terms governing use of this application.</p>
          </div>
        </div>
      </section>
    {:else if currentSection === 'general'}
      <div class="settings-subheader">
        <button type="button" class="back-btn" on:click={goBack} aria-label="Back to settings">
          ‹
        </button>
        <h2>General</h2>
      </div>
      <GeneralSettings />
    {:else if currentSection === 'devices'}
      <div class="settings-subheader">
        <button type="button" class="back-btn" on:click={goBack} aria-label="Back to settings">
          ‹
        </button>
        <h2>Add Device</h2>
      </div>
      <AddDeviceSettings />
    {/if}
  </div>
</div>

<style>
  .settings-panel {
    max-width: 600px;
    margin: 0 auto;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: var(--spacing-lg);
    color: var(--text-primary);
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .settings-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-md);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    text-align: left;
    font-family: inherit;
  }

  .settings-list-item:hover {
    border-color: var(--primary-color);
    background: var(--surface-elevated);
  }

  .settings-item-label {
    flex: 1;
  }

  .settings-item-arrow {
    color: var(--text-muted);
    font-size: 1.25rem;
  }

  .settings-subheader {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
  }

  .settings-subheader h2 {
    margin: 0;
  }

  .back-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    color: var(--text-primary);
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .back-btn:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .legal-section {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border);
  }

  .legal-heading {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-xs);
    color: var(--text-primary);
  }

  .legal-subtext {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-md);
  }

  .legal-links {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .legal-link-item {
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border);
  }

  .legal-link-item:last-child {
    border-bottom: none;
  }

  .legal-link {
    font-size: 1rem;
    font-weight: 500;
    color: var(--primary-color);
    text-decoration: none;
    transition: color 0.2s, text-decoration 0.2s;
  }

  .legal-link:hover {
    text-decoration: underline;
    color: var(--primary-hover);
  }

  .legal-link:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .legal-link-help {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: var(--spacing-xs) 0 0;
  }
</style>
