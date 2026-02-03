import express from 'express';

const router = express.Router();

// Parse Strava link and extract activity information
router.post('/parse', async (req, res) => {
  try {
    const { link } = req.body;

    if (!link || typeof link !== 'string') {
      return res.status(400).json({ error: 'Valid Strava link is required' });
    }

    // Follow redirects to get the final URL
    let finalUrl = link;
    let activityId = null;
    let activityType = null;

    try {
      // Follow redirects using GET (HEAD might not work with all redirects)
      let response;
      try {
        response = await fetch(link, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response && response.ok) {
          finalUrl = response.url || link;
        } else {
          console.warn(`Failed to fetch link: ${response?.status || 'unknown'} ${response?.statusText || ''}`);
          finalUrl = link;
        }
      } catch (fetchErr) {
        console.warn('Error fetching redirect:', fetchErr.message);
        finalUrl = link;
      }
      
      // Handle app:// or other non-HTTP schemes by extracting ID from URL
      if (finalUrl && (finalUrl.startsWith('app://') || finalUrl.startsWith('strava://'))) {
        // Try to extract ID from app URL
        const appMatch = finalUrl.match(/activities\/(\d+)/i);
        if (appMatch) {
          activityId = appMatch[1];
          finalUrl = `https://www.strava.com/activities/${activityId}`;
        } else {
          finalUrl = link;
        }
      }

      // Try to extract activity ID from various URL formats
      // Format 1: https://www.strava.com/activities/{id}
      const match1 = finalUrl.match(/strava\.com\/activities\/(\d+)/i);
      if (match1) {
        activityId = match1[1];
        activityType = 'activity';
      }

      // Format 2: https://www.strava.com/activities/{id}/...
      // Also check for activity type in URL
      const typeMatch = finalUrl.match(/strava\.com\/([^\/]+)\/(\d+)/i);
      if (typeMatch && !activityId) {
        activityType = typeMatch[1];
        activityId = typeMatch[2];
      }

      // If we found an activity ID, try to get more details
      // Note: This requires authentication for full details, but we can try public info
      let activityName = null;
      let distance = null;
      let time = null;
      let movingTime = null;

      if (activityId) {
        // Try to fetch activity details (might fail without auth, but worth trying)
        try {
          const activityUrl = `https://www.strava.com/activities/${activityId}`;
          const htmlResponse = await fetch(activityUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (htmlResponse.ok) {
            const html = await htmlResponse.text();

            // Try to extract activity name from multiple sources
            // Look for og:title or structured data first (most reliable)
            let nameMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*name=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<h1[^>]*class="[^"]*[Tt]itle[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                           html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            
            if (nameMatch) {
              activityName = nameMatch[1].trim();
              // Clean up title (remove "| Strava" or "on Strava" or similar)
              activityName = activityName.replace(/\s*\|\s*Strava.*$/i, '').trim();
              activityName = activityName.replace(/\s+on\s+Strava.*$/i, '').trim();
              // Sometimes title is "Activity Name - Strava", so split on dash
              if (activityName.includes(' - ')) {
                const parts = activityName.split(' - ');
                activityName = parts[0].trim();
              }
            } else {
              // Fallback to title tag
              const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
              if (titleMatch) {
                activityName = titleMatch[1].trim();
                // Clean up title more aggressively
                activityName = activityName.replace(/\s*\|\s*Strava.*$/i, '').trim();
                activityName = activityName.replace(/\s+on\s+Strava.*$/i, '').trim();
                // Sometimes title is "Activity Name - Strava", so split on dash
                if (activityName.includes(' - ')) {
                  const parts = activityName.split(' - ');
                  activityName = parts[0].trim();
                }
              }
            }

            // Try to extract distance from structured data or page content
            // Strava typically stores distance in meters in JSON-LD or structured data
            let distanceMatch = html.match(/"distance"[:\s]+(\d+(?:\.\d+)?)/i) ||
                               html.match(/distance["']?\s*:\s*(\d+(?:\.\d+)?)/i);
            
            let distanceValue = null;
            
            if (distanceMatch) {
              distanceValue = parseFloat(distanceMatch[1]);
              
              // If distance is large (likely in meters), convert to miles
              // 6.4 miles = ~10,300 meters, so if value > 100, likely in meters
              if (distanceValue > 100) {
                // Convert meters to miles (1 meter = 0.000621371 miles)
                const miles = (distanceValue * 0.000621371).toFixed(1);
                distance = `${miles} miles`;
              } else {
                // Could be in kilometers or already miles
                // If > 10, likely km, convert to miles
                if (distanceValue > 10) {
                  const miles = (distanceValue * 0.621371).toFixed(1);
                  distance = `${miles} miles`;
                } else {
                  // Likely already in miles
                  distance = `${distanceValue.toFixed(1)} miles`;
                }
              }
            }
            
            // Try to find distance in text format on the page (e.g., "6.4 mi" or "10.3 km")
            if (!distance) {
              const textDistanceMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?)/i) ||
                                       html.match(/(\d+(?:\.\d+)?)\s*km/i);
              if (textDistanceMatch) {
                const distValue = parseFloat(textDistanceMatch[1]);
                if (textDistanceMatch[2] && textDistanceMatch[2].toLowerCase().includes('km')) {
                  // Convert km to miles
                  const miles = (distValue * 0.621371).toFixed(1);
                  distance = `${miles} miles`;
                } else {
                  distance = `${distValue} miles`;
                }
              }
            }

            // Try to extract time/moving time
            const timeMatch = html.match(/"moving_time"[:\s]+(\d+)/i) ||
                             html.match(/"elapsed_time"[:\s]+(\d+)/i) ||
                             html.match(/moving[_\s]?time["']?\s*:\s*["']?(\d+)/i);
            if (timeMatch) {
              movingTime = parseInt(timeMatch[1]);
              time = movingTime;
            }

            // Try to find activity type from page content
            const typeMatch = html.match(/<span[^>]*class="[^"]*activity-type[^"]*"[^>]*>([^<]+)</i) ||
                             html.match(/activity[_\s]?type["']?\s*:\s*["']?([^"']+)/i);
            if (typeMatch && !activityType) {
              activityType = typeMatch[1].trim().toLowerCase();
            }
          }
        } catch (parseError) {
          // If parsing fails, we'll still return what we have
          console.log('Could not parse activity details:', parseError.message);
        }
      }

      // Format time as HH:MM:SS if we have it
      let formattedTime = null;
      if (time) {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;
        if (hours > 0) {
          formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }

      res.json({
        success: true,
        activity: {
          id: activityId,
          link: finalUrl,
          name: activityName || `Activity ${activityId || 'Unknown'}`,
          distance: distance,
          time: formattedTime,
          moving_time: movingTime,
          type: activityType || 'activity',
        }
      });
    } catch (fetchError) {
      console.error('Error fetching Strava link:', fetchError);
      
      // Return partial data if we can at least extract an ID
      if (activityId) {
        res.json({
          success: true,
          activity: {
            id: activityId,
            link: link,
            name: `Activity ${activityId}`,
            distance: null,
            time: null,
            moving_time: null,
            type: activityType || 'activity',
          }
        });
      } else {
        res.status(400).json({ 
          error: 'Could not parse Strava link',
          details: fetchError.message 
        });
      }
    }
  } catch (error) {
    console.error('Error parsing Strava link:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to parse Strava link',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
