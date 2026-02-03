# Mobile Access Setup

## Accessing the App from Mobile Device

To access the fitness app from your mobile device on the same network:

### 1. Frontend (Vite Dev Server)
The Vite config has been updated to listen on `0.0.0.0` with HTTPS enabled, which allows connections from any device on your network and supports camera access.

**Restart the frontend server:**
```bash
cd frontend
npm run dev
```

On first run, `vite-plugin-mkcert` will automatically generate and install a trusted certificate. You may be prompted to allow certificate installation.

You should see output like:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   https://localhost:5173/
➜  Network: https://192.168.1.112:5173/
```

### 2. Backend (Express Server)
The backend is configured to accept connections from any origin (CORS is enabled). Make sure the backend is running:

```bash
cd backend
npm run dev
```

### 3. Access from Mobile
1. Make sure your mobile device is on the same WiFi network
2. Find your computer's local IP address (e.g., 192.168.1.112)
3. **Access the app at: `https://192.168.1.112:5173`** (note: use `https://`, not `http://`)

**Important**: 
- Always use `https://` for camera features to work
- On first visit, you may see a security warning about the self-signed certificate
- **If you see "This site can't provide a secure connection"**: 
  - The certificate needs to be regenerated with your IP address included
  - Restart the dev server - it will regenerate the certificate with your IP
  - You may need to clear your browser cache or use an incognito window
- Tap "Advanced" → "Proceed to [IP address]" (or similar) to accept the certificate
- After accepting, the certificate will be trusted for future visits

**Note**: If your IP address changes, you'll need to update the `hosts` array in `vite.config.js` and restart the server to regenerate the certificate.

### 4. Troubleshooting

**If you see a blank screen:**

1. **Check browser console** on your mobile device:
   - Open Chrome/Safari on mobile
   - Enable remote debugging or check for JavaScript errors

2. **Verify servers are running:**
   - Frontend should show "Network: http://192.168.1.112:5173/"
   - Backend should be running on port 3001

3. **Check firewall:**
   - Windows Firewall may be blocking connections
   - Allow Node.js through the firewall if prompted

4. **Verify network:**
   - Both devices must be on the same WiFi network
   - Try pinging 192.168.1.112 from your mobile device

5. **Check API requests:**
   - Open browser DevTools on mobile (if possible)
   - Check Network tab for failed API requests
   - API calls should go to `http://192.168.1.112:5173/api/*` (proxied to backend)

### Alternative: Use the IP Address Directly

If the proxy isn't working from mobile, you may need to update the API base URL to use your computer's IP:

In `frontend/src/lib/api.js`, temporarily change:
```javascript
const API_BASE = '/api';  // This works when proxying
```

To:
```javascript
const API_BASE = 'http://192.168.1.112:3001/api';  // Direct backend access
```

But the proxy should work fine - the Vite dev server will proxy `/api` requests to `http://localhost:3001` automatically.
