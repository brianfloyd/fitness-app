/**
 * Requires X-Profile-Id header (current user's profile id).
 * For GET requests, also accepts profileId query param (so <img src="...?profileId=1"> works).
 */
export function requireProfileId(req, res, next) {
  let raw = req.headers['x-profile-id'];
  if (raw == null && req.method === 'GET' && req.query?.profileId != null) {
    raw = req.query.profileId;
  }
  const id = raw != null ? parseInt(String(raw).trim(), 10) : NaN;
  if (!Number.isInteger(id) || id < 1) {
    return res.status(401).json({
      error: 'Profile required',
      details: 'Missing or invalid X-Profile-Id header or profileId query. Log in and retry.',
    });
  }
  req.profileId = id;
  next();
}
