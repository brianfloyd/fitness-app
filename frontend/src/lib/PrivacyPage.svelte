<script>
  const backHref = '/';
</script>

<article class="legal-page">
  <header class="legal-page-header">
    <a href={backHref} class="back-link">← Back to app</a>
    <h1>Privacy Policy</h1>
    <p class="legal-meta">Effective Date: February 28, 2026</p>
    <p class="legal-meta">App Name: Fit MyAIWay</p>
  </header>

  <div class="legal-content">
    <section>
      <h2>1. Overview</h2>
      <p>
        This application connects to Fitbit through secure OAuth authorization in order to retrieve
        fitness and health data for personal analysis and display within the app.
      </p>
    </section>

    <section>
      <h2>2. Information Collected</h2>
      <p>With your permission, this application may access:</p>
      <ul>
        <li>Activity data (steps, workouts)</li>
        <li>Heart rate data</li>
        <li>Sleep data</li>
        <li>Basic profile information</li>
      </ul>
      <p>The app only accesses data explicitly authorized by you through Fitbit.</p>
    </section>

    <section>
      <h2>3. How Information Is Used</h2>
      <p>Data is used solely to:</p>
      <ul>
        <li>Display your fitness metrics</li>
        <li>Generate insights within the app</li>
        <li>Support personal tracking and analysis</li>
      </ul>
      <p>This application does not sell, rent, or share your data with third parties.</p>
    </section>

    <section>
      <h2>4. Data Storage</h2>
      <p>
        Data may be stored securely for functionality of the app. Reasonable safeguards are used to
        protect your information.
      </p>
    </section>

    <section>
      <h2>5. Revoking Access</h2>
      <p>You may revoke access at any time through your Fitbit account settings.</p>
    </section>

    <section>
      <h2>6. Contact</h2>
      <p>If you have questions about this Privacy Policy, contact:</p>
      <p>[Your Name]</p>
      <p>[Your Email]</p>
    </section>
  </div>
</article>

<style>
  .legal-page {
    max-width: 720px;
    margin: 0 auto;
    padding: var(--spacing-lg) 0;
  }

  .legal-page-header {
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--border);
  }

  .back-link {
    display: inline-block;
    margin-bottom: var(--spacing-md);
    font-size: 0.9375rem;
    color: var(--primary-color);
    text-decoration: none;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: var(--primary-hover);
    text-decoration: underline;
  }

  .back-link:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .legal-page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 var(--spacing-sm);
    color: var(--text-primary);
  }

  .legal-meta {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
  }

  .legal-content {
    line-height: 1.7;
  }

  .legal-content section {
    margin-bottom: var(--spacing-xl);
  }

  .legal-content h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 var(--spacing-sm);
    color: var(--text-primary);
  }

  .legal-content p {
    margin: 0 0 var(--spacing-md);
    color: var(--text-secondary);
  }

  .legal-content ul {
    margin: 0 0 var(--spacing-md);
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);
  }

  .legal-content li {
    margin-bottom: var(--spacing-xs);
  }

  @media (min-width: 768px) {
    .legal-page-header h1 {
      font-size: 2rem;
    }

    .legal-content h2 {
      font-size: 1.25rem;
    }
  }
</style>
