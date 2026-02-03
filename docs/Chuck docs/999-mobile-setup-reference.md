# Mobile Setup Guide

## iOS Home Screen Icon Setup

To enable the custom icon when saving to iOS home screen:

1. **Generate PNG Icons**:
   - Open `https://[your-ip]:5173/generate-icons.html` in your browser
   - Click each "Download" button to save the PNG icons
   - Save the downloaded files to `frontend/public/` with these exact names:
     - `icon-180x180.png`
     - `icon-192x192.png`
     - `icon-512x512.png`

2. **Restart the dev server** after adding the icons

3. **Test on iOS**:
   - Open the app in Safari on your iPhone
   - Tap the Share button
   - Select "Add to Home Screen"
   - The custom icon should now appear!

## Mobile Privacy Warning Fix

The privacy warning on mobile is caused by the self-signed SSL certificate. Here are solutions:

### Option 1: Install mkcert Root Certificate on iOS (Recommended for Development)

1. **On your computer**, find the mkcert root certificate:
   - Windows: `%LOCALAPPDATA%\mkcert\rootCA.pem` or check `%USERPROFILE%\.local\share\mkcert\`
   - macOS/Linux: `~/.local/share/mkcert/rootCA.pem` or `$(mkcert -CAROOT)/rootCA.pem`

2. **Convert to .crt format** (if needed):
   ```bash
   # If you have openssl
   openssl x509 -in rootCA.pem -out rootCA.crt -outform DER
   ```

3. **Transfer to iPhone**:
   - Email the `.crt` or `.pem` file to yourself
   - Open the email on your iPhone
   - Tap the certificate file to install it

4. **Trust the certificate on iOS**:
   - Go to Settings > General > VPN & Device Management (or Profiles & Device Management)
   - Find the mkcert certificate
   - Tap it and select "Install"
   - Go to Settings > General > About > Certificate Trust Settings
   - Enable trust for the mkcert root certificate

5. **Restart Safari** and try accessing the app again - the warning should be gone!

### Option 2: Use HTTP for Development (Not Recommended)

If you don't need camera access, you can temporarily disable HTTPS:
- Edit `frontend/vite.config.js`
- Change `https: true` to `https: false`
- **Note**: This will disable camera access as it requires HTTPS

### Option 3: Use a Proper Domain with Let's Encrypt (For Production)

For production deployment, use a real domain with Let's Encrypt SSL certificate. **This completely eliminates the privacy warning** because Let's Encrypt certificates are trusted by all browsers and mobile devices.

See `PRODUCTION_DEPLOYMENT.md` for detailed production setup instructions.

## Troubleshooting

**Icons still not showing on iOS:**
- Clear Safari cache: Settings > Safari > Clear History and Website Data
- Make sure the PNG files are in `frontend/public/` (not `frontend/src/`)
- Check that the file names match exactly: `icon-180x180.png`, etc.
- Restart the dev server after adding icons

**Privacy warning persists:**
- Make sure you've installed and trusted the mkcert certificate
- Try clearing Safari cache
- Restart your iPhone after installing the certificate
- Check that you're accessing via the correct IP address
