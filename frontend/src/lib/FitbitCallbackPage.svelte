<script>
  import { onMount } from 'svelte';

  let status = 'Connecting Fitbit…';
  let error = null;

  onMount(async () => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const code = params.get('code');
    const state = params.get('state');
    const err = params.get('error');

    if (err) {
      window.location.replace(`/?fitbit_error=${encodeURIComponent(err)}`);
      return;
    }

    if (!code || !state) {
      window.location.replace('/?fitbit_error=missing_params');
      return;
    }

    try {
      const res = await fetch('/api/fitbit/complete-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.ok && data.redirect) {
        window.location.replace(data.redirect);
        return;
      }
      const errMsg = data.error || 'Connection failed';
      window.location.replace(`/?fitbit_error=${encodeURIComponent(errMsg)}`);
    } catch (e) {
      window.location.replace(`/?fitbit_error=server_error`);
    }
  });
</script>

<div class="page">
  <p class="status">{status}</p>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
  }
  .status {
    color: var(--text-secondary);
    font-size: 1rem;
  }
</style>
