import App from './App.svelte';
import './app.css';

// Ensure DOM is ready before initializing
let app;
try {
  const appElement = document.getElementById('app');
  if (!appElement) {
    throw new Error('App element not found');
  }
  
  app = new App({
    target: appElement,
  });
  
  console.log('App initialized successfully');
} catch (error) {
  console.error('Failed to initialize app:', error);
  // Show error message to user
  document.body.innerHTML = `
    <div style="padding: 2rem; text-align: center; color: #ef4444;">
      <h1>Failed to Load App</h1>
      <p>Error: ${error.message}</p>
      <p>Please refresh the page or check the console for details.</p>
    </div>
  `;
}

// Register Service Worker for PWA
// Don't block app loading if service worker fails
if ('serviceWorker' in navigator) {
  // Check if user wants to disable service worker (for debugging)
  const disableSW = localStorage.getItem('disableServiceWorker') === 'true';
  
  if (!disableSW) {
    // Delay registration to ensure app loads first
    // Use setTimeout to ensure this doesn't block initial render
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.warn('Service Worker registration failed (app will still work):', error);
          // Don't throw - allow app to load without service worker
        });
    }, 1000); // Wait 1 second after app loads
  } else {
    console.log('Service Worker disabled by user preference');
    // Unregister any existing service workers
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });
  }
}

// Handle PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Optionally, show a custom install button
  console.log('PWA install prompt available');
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  deferredPrompt = null;
});

// Global error handler to catch any unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Don't prevent default - let browser handle it
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Don't prevent default - let browser handle it
});

// Helper function to disable service worker (for debugging)
// Call from console: window.disableServiceWorker()
window.disableServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Service Worker unregistered');
    }
    localStorage.setItem('disableServiceWorker', 'true');
    console.log('Service Worker disabled. Refresh the page.');
  }
};

// Helper function to enable service worker (for debugging)
// Call from console: window.enableServiceWorker()
window.enableServiceWorker = () => {
  localStorage.removeItem('disableServiceWorker');
  console.log('Service Worker enabled. Refresh the page.');
};

export default app;
