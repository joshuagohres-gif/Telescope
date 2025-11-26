/**
 * Authentication Routes
 * 
 * Handles user registration, login, logout, and Google OAuth
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { authStorage } from "./auth-storage";
import { registerSchema, loginSchema, type User, type PublicUser } from "@shared/schema";
import { getGoogleClientId, getGoogleClientSecret, isGoogleOAuthConfigured, getSessionSecret } from "./secrets";
import { z } from "zod";

const router = Router();

// Cookie name for auth token
const AUTH_COOKIE_NAME = "telescope_auth_token";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      authSession?: { token: string };
    }
  }
}

// Helper to set auth cookie
function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

// Helper to clear auth cookie
function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

// Helper to get public user data (without sensitive fields)
function getPublicUserData(user: User): PublicUser & { email: string; isEmailVerified: boolean } {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

// ==================== MIDDLEWARE ====================

/**
 * Authentication middleware - extracts user from session token
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return next();
    }

    const result = await authStorage.getSessionWithUser(token);
    if (result) {
      req.user = result.user;
      req.authSession = { token };
    }
    
    next();
  } catch (error) {
    console.error("[Auth] Middleware error:", error);
    next();
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// ==================== ROUTES ====================

/**
 * GET /api/auth/me - Get current user
 */
router.get("/me", async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  
  res.json({ user: getPublicUserData(req.user) });
});

/**
 * GET /api/auth/config - Get auth configuration (for client)
 */
router.get("/config", (req, res) => {
  res.json({
    googleOAuthEnabled: isGoogleOAuthConfigured(),
    googleClientId: getGoogleClientId(),
  });
});

/**
 * POST /api/auth/register - Create new account
 */
router.post("/register", async (req, res) => {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.flatten().fieldErrors 
      });
    }

    const { email, username, password, displayName } = validationResult.data;

    // Check if email already exists
    const existingEmail = await authStorage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Check if username already exists
    const existingUsername = await authStorage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: "This username is already taken" });
    }

    // Create user
    const user = await authStorage.createUser({
      email: email.toLowerCase(),
      username,
      password,
      displayName: displayName || username,
    });

    // Create session
    const session = await authStorage.createSession(
      user.id,
      req.headers["user-agent"],
      req.ip
    );

    // Update last login
    await authStorage.updateLastLogin(user.id);

    // Set cookie
    setAuthCookie(res, session.token);

    res.status(201).json({
      message: "Account created successfully",
      user: getPublicUserData(user),
    });
  } catch (error: any) {
    console.error("[Auth] Register error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

/**
 * POST /api/auth/login - Login with email and password
 */
router.post("/login", async (req, res) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: validationResult.error.flatten().fieldErrors 
      });
    }

    const { email, password } = validationResult.data;

    // Find user
    const user = await authStorage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: "Account is disabled" });
    }

    // Verify password
    const isValid = await authStorage.verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create session
    const session = await authStorage.createSession(
      user.id,
      req.headers["user-agent"],
      req.ip
    );

    // Update last login
    await authStorage.updateLastLogin(user.id);

    // Set cookie
    setAuthCookie(res, session.token);

    res.json({
      message: "Logged in successfully",
      user: getPublicUserData(user),
    });
  } catch (error: any) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

/**
 * POST /api/auth/logout - Logout current session
 */
router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace("Bearer ", "");
    
    if (token) {
      await authStorage.deleteSession(token);
    }

    clearAuthCookie(res);
    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("[Auth] Logout error:", error);
    // Clear cookie even if session deletion fails
    clearAuthCookie(res);
    res.json({ message: "Logged out" });
  }
});

/**
 * POST /api/auth/logout-all - Logout all sessions
 */
router.post("/logout-all", requireAuth, async (req, res) => {
  try {
    await authStorage.deleteUserSessions(req.user!.id);
    clearAuthCookie(res);
    res.json({ message: "Logged out from all devices" });
  } catch (error: any) {
    console.error("[Auth] Logout all error:", error);
    res.status(500).json({ error: "Failed to logout from all devices" });
  }
});

// ==================== GOOGLE OAUTH ====================

/**
 * GET /api/auth/google - Redirect to Google OAuth
 */
router.get("/google", (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(501).json({ error: "Google OAuth is not configured" });
  }

  const clientId = getGoogleClientId();
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * GET /api/auth/google/callback - Google OAuth callback
 */
router.get("/google/callback", async (req, res) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      return res.redirect("/?auth_error=google_not_configured");
    }

    const { code, error } = req.query;
    
    if (error) {
      console.error("[Auth] Google OAuth error:", error);
      return res.redirect(`/?auth_error=${error}`);
    }

    if (!code || typeof code !== "string") {
      return res.redirect("/?auth_error=no_code");
    }

    const clientId = getGoogleClientId()!;
    const clientSecret = getGoogleClientSecret()!;
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[Auth] Failed to exchange code for token:", await tokenResponse.text());
      return res.redirect("/?auth_error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error("[Auth] Failed to get user info:", await userInfoResponse.text());
      return res.redirect("/?auth_error=user_info_failed");
    }

    const googleUser = await userInfoResponse.json();
    
    // Check if user exists with this Google ID
    let user = await authStorage.getUserByGoogleId(googleUser.sub);
    
    if (!user) {
      // Check if user exists with this email
      user = await authStorage.getUserByEmail(googleUser.email);
      
      if (user) {
        // Link Google account to existing user
        await authStorage.updateUser(user.id, {
          googleId: googleUser.sub,
          avatarUrl: user.avatarUrl || googleUser.picture,
          isEmailVerified: true,
        });
        user = await authStorage.getUserById(user.id);
      } else {
        // Create new user
        const username = await generateUniqueUsername(googleUser.email.split("@")[0]);
        user = await authStorage.createUser({
          email: googleUser.email.toLowerCase(),
          username,
          displayName: googleUser.name || username,
          avatarUrl: googleUser.picture,
          googleId: googleUser.sub,
          isEmailVerified: true,
        });
      }
    }

    if (!user || !user.isActive) {
      return res.redirect("/?auth_error=account_disabled");
    }

    // Create session
    const session = await authStorage.createSession(
      user.id,
      req.headers["user-agent"],
      req.ip
    );

    // Update last login
    await authStorage.updateLastLogin(user.id);

    // Set cookie
    setAuthCookie(res, session.token);

    // Redirect to app
    res.redirect("/?auth_success=google");
  } catch (error: any) {
    console.error("[Auth] Google OAuth callback error:", error);
    res.redirect("/?auth_error=callback_failed");
  }
});

// Helper to generate a unique username
async function generateUniqueUsername(base: string): Promise<string> {
  // Clean the base username
  let username = base.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  
  if (username.length < 3) {
    username = "user";
  }

  // Check if username exists
  let existing = await authStorage.getUserByUsername(username);
  if (!existing) {
    return username;
  }

  // Add random suffix until unique
  let attempts = 0;
  while (existing && attempts < 100) {
    const suffix = Math.floor(Math.random() * 10000);
    const candidate = `${username}${suffix}`;
    existing = await authStorage.getUserByUsername(candidate);
    if (!existing) {
      return candidate;
    }
    attempts++;
  }

  // Fallback to timestamp-based username
  return `${username}_${Date.now()}`;
}

export default router;
