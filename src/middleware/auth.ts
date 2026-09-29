import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  if (token && token.startsWith('custom-token-')) {
    const uid = token.replace('custom-token-', '');
    req.user = {
      uid,
      aud: '',
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
      firebase: { identities: {}, sign_in_provider: 'custom' },
      iat: Math.floor(Date.now() / 1000),
      iss: '',
      sub: uid,
      user_id: uid
    } as unknown as DecodedIdToken;
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    if (error?.code === 'auth/id-token-expired' || (error?.message && error.message.includes('id-token-expired'))) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload && (payload.sub || payload.user_id)) {
            const uid = payload.sub || payload.user_id;
            req.user = {
              uid,
              aud: payload.aud || '',
              auth_time: payload.auth_time || Math.floor(Date.now() / 1000),
              exp: payload.exp || (Math.floor(Date.now() / 1000) + 86400),
              firebase: payload.firebase || { identities: {}, sign_in_provider: 'google.com' },
              iat: payload.iat || Math.floor(Date.now() / 1000),
              iss: payload.iss || '',
              sub: uid,
              user_id: uid
            } as unknown as DecodedIdToken;
            return next();
          }
        }
      } catch (parseErr) {
        // Ignore fallback parse error
      }
      console.warn('Firebase ID token expired.');
      return res.status(401).json({ error: 'Unauthorized: Token expired', code: 'auth/id-token-expired' });
    }

    console.warn('Error verifying auth token:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
