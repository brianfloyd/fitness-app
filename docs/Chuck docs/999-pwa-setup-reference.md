# Progressive Web App (PWA) Setup

Your Fitness Daily Log app is now configured as a Progressive Web App (PWA) that can be installed on mobile devices and desktop browsers.

## Features Enabled

✅ **Standalone Mode** - App runs without browser UI when installed  
✅ **Offline Support** - Service worker caches assets and API responses  
✅ **Home Screen Installation** - Users can "Add to Home Screen" on mobile  
✅ **App Icons** - Custom icons for iOS and Android  
✅ **Safe Area Support** - Handles device notches and safe areas  
✅ **Theme Colors** - Matches your app's blue theme  

## Icon Generation

To generate the required PNG icons from your SVG favicon:

1. Open `http://localhost:5173/generate-icons.html` in your browser
2. Click each "Download" button to save:
   - `icon-180x180.png` (iOS)
   - `icon-192x192.png` (Android/PWA)
   - `icon-512x512.png` (PWA large)
3. Save all three files in the `frontend/public/` directory
4. Refresh your app - icons will now work!

## Testing PWA Features

### Mobile Testing (iOS):
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will launch in standalone mode (no address bar)

### Mobile Testing (Android):
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home Screen" or "Install App"
4. The app will install and launch in standalone mode

### Desktop Testing:
1. Open the app in Chrome/Edge
2. Look for the install icon in the address bar
3. Click to install the app
4. The app will open in its own window

## Service Worker

The service worker (`/sw.js`) provides:
- **Offline caching** of app assets
- **API response caching** for better performance
- **Automatic updates** when new versions are available

The service worker is automatically registered when the app loads.

## Manifest Configuration

The `manifest.json` includes:
- App name and description
- Theme colors matching your design
- Icon references
- Standalone display mode
- Portrait orientation lock
- App shortcuts (Today's Log)

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS 11.3+)
- ✅ Firefox (Android)
- ✅ Samsung Internet

## Production Deployment

When deploying to production:
1. Ensure HTTPS is enabled (required for service workers)
2. Generate and include all icon sizes
3. Test installation on real devices
4. Verify service worker is working in browser DevTools > Application

## Troubleshooting

**Icons not showing?**
- Make sure PNG files are in `public/` directory
- Clear browser cache
- Check browser console for errors

**Service worker not registering?**
- Ensure you're using HTTPS (or localhost)
- Check browser console for registration errors
- Verify `sw.js` is accessible at root path

**App not installing?**
- Check that manifest.json is valid
- Ensure all required icons are present
- Verify service worker is registered
- Check browser DevTools > Application > Manifest
