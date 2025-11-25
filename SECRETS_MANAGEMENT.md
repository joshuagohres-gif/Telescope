# Secrets Management System

## Overview

The Telescope application uses a dedicated secrets management system to store sensitive credentials locally while keeping them out of version control.

## File Structure

```
.secrets.json          # Local secrets (NEVER committed to git)
.secrets.example.json  # Template for setting up secrets (committed to git)
server/secrets.ts      # Secrets management module
```

## Setup

### 1. Create Your Local Secrets File

Copy the example file and add your real credentials:

```bash
cp .secrets.example.json .secrets.json
```

### 2. Edit `.secrets.json`

```json
{
  "openai": {
    "apiKey": "sk-proj-your-real-openai-key-here"
  },
  "database": {
    "url": "postgresql://user:password@localhost:5432/telescope"
  }
}
```

**IMPORTANT**: The `.secrets.json` file is automatically excluded from git via `.gitignore`.

## Usage in Code

### Server-Side Code

```typescript
import { getSecrets, getOpenAIKey, isOpenAIConfigured } from "./secrets";

// Get all secrets
const secrets = getSecrets();

// Get specific secret
const apiKey = getOpenAIKey();

// Check if API is configured
if (isOpenAIConfigured()) {
  // Use real API
} else {
  // Use mock mode
}
```

## Priority Order

The secrets system loads credentials in this priority order:

1. **Environment variables** (highest priority)
   - `OPENAI_API_KEY`
   - `DATABASE_URL`

2. **`.secrets.json` file**
   - Loaded from project root

3. **Default values** (lowest priority)
   - OpenAI: `null` (triggers mock mode)
   - Database: `postgresql://postgres@127.0.0.1:5432/telescope`

## Mock Mode vs Real API

### Mock Mode (Default)
When no OpenAI API key is configured, the application runs in **mock mode**:
- Generative Design feature returns simulated responses
- No API costs incurred
- Perfect for development and testing

### Real API Mode
When an OpenAI API key is configured:
- Generative Design uses real OpenAI GPT-4 API
- AI-powered design conversations
- Requires valid API key with available credits

## Security Best Practices

### ✅ DO

- **Store real credentials in `.secrets.json`** (local only)
- **Use `.secrets.example.json` as a template** (safe to commit)
- **Use environment variables in production**
- **Rotate API keys regularly**

### ❌ DON'T

- **NEVER commit `.secrets.json` to git**
- **NEVER hardcode secrets in source files**
- **NEVER share your `.secrets.json` file**
- **NEVER commit real API keys to documentation**

## Git Integration

The `.gitignore` file is configured to prevent secrets from being committed:

```gitignore
# Environment variables and secrets
.env
.secrets.json
```

When committing documentation or guides:
- Always use placeholder values like `your-api-key-here`
- Reference `.secrets.example.json` for structure
- Direct users to create their own `.secrets.json` locally

## Troubleshooting

### Secrets Not Loading

1. **Check file location**: `.secrets.json` must be in project root
2. **Check JSON syntax**: Validate your JSON with a linter
3. **Check file permissions**: Ensure file is readable
4. **Check server logs**: Look for `[Secrets]` log messages

### API Key Not Working

1. **Verify key format**: OpenAI keys start with `sk-proj-` or `sk-`
2. **Check API key status**: Visit https://platform.openai.com/api-keys
3. **Verify account credits**: Check https://platform.openai.com/usage
4. **Try environment variable**: Set `OPENAI_API_KEY` directly

### Reload Secrets

If you update `.secrets.json` while the server is running:

```typescript
import { reloadSecrets } from "./secrets";

reloadSecrets(); // Reload from disk
```

Or simply restart the server.

## Example Workflows

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/joshuagohres-gif/Telescope.git
cd Telescope

# 2. Set up secrets
cp .secrets.example.json .secrets.json
# Edit .secrets.json with your API keys

# 3. Start server
npm run dev
```

### Team Collaboration

1. **Never share your `.secrets.json` file**
2. Each team member creates their own `.secrets.json`
3. Document required secrets in `.secrets.example.json`
4. Use environment variables for shared development environments

### Production Deployment

1. **Don't use `.secrets.json` in production**
2. Set environment variables directly:
   ```bash
   export OPENAI_API_KEY="sk-proj-..."
   export DATABASE_URL="postgresql://..."
   ```
3. Use your platform's secrets management (Heroku Config Vars, AWS Secrets Manager, etc.)

## API Key Acquisition

### OpenAI API Key

1. Visit https://platform.openai.com/api-keys
2. Log in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-` or `sk-`)
5. Add to `.secrets.json` locally

**Cost Information**:
- GPT-4: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens
- GPT-3.5-Turbo: ~$0.0015 per 1K tokens (much cheaper)
- Monitor usage: https://platform.openai.com/usage

## Support

For issues with secrets management:
1. Check server console for `[Secrets]` log messages
2. Verify `.secrets.json` syntax and location
3. Try using environment variables directly
4. Check GitHub issues: https://github.com/joshuagohres-gif/Telescope/issues

## Related Documentation

- [OpenAI API Integration Guide](./OPENAI_API_GUIDE.md)
- [Generative Design Quick Start](./GENERATIVE_DESIGN_QUICKSTART.md)
- [Database Setup Guide](./README.md#database-setup)
