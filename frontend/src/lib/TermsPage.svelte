<script>
  const backHref = '/';
</script>

<article class="legal-page">
  <header class="legal-page-header">
    <a href={backHref} class="back-link">← Back to app</a>
    <h1>Terms of Service</h1>
    <p class="legal-meta">Effective Date: February 28, 2026</p>
    <p class="legal-meta">App Name: Fit MyAIWay</p>
  </header>

  <div class="legal-content">
    <section>
      <h2>1. Acceptance of Terms</h2>
      <p>By using this application, you agree to these Terms of Service.</p>
    </section>

    <section>
      <h2>2. Description of Service</h2>
      <p>
        This application connects to Fitbit via OAuth and retrieves authorized fitness data for
        informational purposes.
      </p>
    </section>

    <section>
      <h2>3. No Medical Advice</h2>
      <p>
        This application does not provide medical advice. All information provided is for
        informational and personal use only.
      </p>
    </section>

    <section>
      <h2>4. Limitation of Liability</h2>
      <p>
        The application is provided "as is" without warranties of any kind. The owner is not liable
        for any damages resulting from use of the application.
      </p>
    </section>

    <section>
      <h2>5. Changes to Terms</h2>
      <p>These terms may be updated at any time.</p>
    </section>

    <section>
      <h2>6. Contact</h2>
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

  @media (min-width: 768px) {
    .legal-page-header h1 {
      font-size: 2rem;
    }

    .legal-content h2 {
      font-size: 1.25rem;
    }
  }
</style>
