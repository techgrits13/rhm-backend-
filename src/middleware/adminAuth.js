import { config } from '../config.js';

// Simple HTTP Basic Auth using password from env (ADMIN_PASSWORD)
export default function adminAuth(req, res, next) {
  // If no password configured, allow in development only
  const pwd = config.adminPassword;
  if (!pwd) {
    if (config.nodeEnv !== 'production') return next();
    // In production with no password, block access
    res.set('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(401).send('Admin UI is not configured');
  }

  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(401).send('Authentication required');
  }

  try {
    const b64 = header.slice(6);
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const [user, ...rest] = decoded.split(':');
    const pass = rest.join(':');
    const expectedUser = config.adminUsername; // if not set, allow any username
    if (pass === pwd && (!expectedUser || user === expectedUser)) return next();
  } catch (e) {
    // fallthrough to 401
  }

  res.set('WWW-Authenticate', 'Basic realm="Restricted"');
  return res.status(401).send('Invalid credentials');
}
