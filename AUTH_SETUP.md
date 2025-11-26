# Authentication Setup Guide

This guide explains how to set up user authentication for the Telescope Control System, including optional Google OAuth sign-in.

## Quick Start

The authentication system works out of the box with email/password registration. Google OAuth is optional and requires additional configuration.

## Configuration

Authentication can be configured via environment variables or a `.secrets.json` file.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SESSION_SECRET` | Secret key for signing session cookies | Dev default (change in production!) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `null` (Google sign-in disabled) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `null` (Google sign-in disabled) |

### Using .secrets.json

Create a `.secrets.json` file in the project root (this file is gitignored):

```json
{
  "auth": {
    "sessionSecret": "your-secure-secret-key-min-32-characters",
    "google": {
      "clientId": "your-google-client-id.apps.googleusercontent.com",
      "clientSecret": "your-google-client-secret"
    }
  }
}
```

## Setting Up Google OAuth

To enable Google sign-in:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials

2. **Create a New Project** (or select an existing one)
   - Click "Create Project"
   - Enter a project name (e.g., "Telescope Control System")

3. **Configure OAuth Consent Screen**
   - Go to "OAuth consent screen"
   - Select "External" user type
   - Fill in the required fields:
     - App name: "Telescope Control System"
     - User support email: Your email
     - Developer contact email: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue

4. **Create OAuth 2.0 Credentials**
   - Go to "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Telescope Control System"
   - Authorized JavaScript origins:
     - `http://localhost:5000` (development)
     - `https://your-production-domain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (development)
     - `https://your-production-domain.com/api/auth/google/callback` (production)
   - Click "Create"

5. **Copy Credentials**
   - Copy the Client ID and Client Secret
   - Add them to your environment variables or `.secrets.json`

## Database Setup

The authentication system requires the following database tables:

- `users` - User accounts
- `sessions` - Active login sessions

Run the database migration to create these tables:

```bash
npm run db:push
```

## API Endpoints

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/config` | Get auth configuration (Google OAuth status) |
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Sign in with email/password |
| POST | `/api/auth/logout` | Sign out current session |
| GET | `/api/auth/google` | Initiate Google OAuth flow |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Protected Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout-all` | Sign out all sessions |

## Security Considerations

1. **Session Secret**: Always use a strong, unique session secret in production (at least 32 characters).

2. **HTTPS**: Always use HTTPS in production to protect authentication cookies.

3. **Cookie Security**: Auth cookies are:
   - `httpOnly`: Cannot be accessed via JavaScript
   - `secure`: Only sent over HTTPS (in production)
   - `sameSite: lax`: Protection against CSRF attacks

4. **Password Storage**: Passwords are hashed using SHA-256 with a unique salt per user.

5. **Session Duration**: Sessions expire after 30 days of inactivity.

## Troubleshooting

### Google sign-in not showing

- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Check the server logs for `[Secrets]` configuration output

### "Account with this email already exists"

- The email is already registered. Try signing in instead.
- If using Google OAuth, the account will automatically link to existing email.

### Session not persisting

- Check that cookies are being set (browser dev tools → Application → Cookies)
- Ensure the session secret hasn't changed between server restarts
- Verify the database connection is working
