# OpenAI API Integration Guide

## Overview

The Telescope application has OpenAI API access configured for AI-powered features including natural language commands, design generation, and knowledge base queries.

## API Key Storage

The OpenAI API key is securely stored in the `.env` file, which is:
- **Not committed to version control** (listed in `.gitignore`)
- **Loaded at server startup**
- **Accessible via environment variables**

### Environment Variable

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage in Server-Side Code

### Method 1: Direct Environment Variable Access

```typescript
// In any server-side TypeScript file
import { config } from 'dotenv';

// Load environment variables (if not already loaded)
config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}
```

### Method 2: Using the OpenAI SDK (Recommended)

The application already has the `openai` package installed. Here's how to use it:

```typescript
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Example: Chat completion
async function generateResponse(prompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful astronomy assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
```

### Method 3: Using Existing OpenAI Integration

The application already has OpenAI integrated in the design generation feature:

```typescript
// See: server/design-routes.ts for existing implementation
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Generate telescope design
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [/* ... */],
  response_format: { type: 'json_object' },
});
```

## Common Use Cases

### 1. Natural Language Telescope Commands

```typescript
// server/nlp-commands-routes.ts (create this file)
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/api/nlp/command', async (req, res) => {
  const { command } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a telescope control assistant. Parse natural language commands into telescope control actions."
        },
        {
          role: "user",
          content: command
        }
      ],
    });

    const parsedCommand = completion.choices[0].message.content;
    res.json({ success: true, parsed: parsedCommand });
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse command' });
  }
});

export default router;
```

### 2. AI-Powered Knowledge Base Queries

```typescript
// server/kb-ai-routes.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function queryKnowledgeBase(question: string, context: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are an expert astronomy assistant. Use the following knowledge base context to answer questions accurately:\n\n${context}`
      },
      {
        role: "user",
        content: question
      }
    ],
    temperature: 0.3, // Lower temperature for more factual responses
  });

  return response.choices[0].message.content;
}
```

### 3. Image Analysis (Vision API)

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeAstronomyImage(imageUrl: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this astronomical image and describe what you see." },
          { type: "image_url", image_url: { url: imageUrl } }
        ],
      },
    ],
  });

  return response.choices[0].message.content;
}
```

### 4. Embeddings for Semantic Search

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function createEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

// Use for semantic search in knowledge base
async function semanticSearch(query: string, documents: string[]) {
  const queryEmbedding = await createEmbedding(query);

  // Calculate cosine similarity with document embeddings
  // Store embeddings in database for efficient searching
  // ... implementation details
}
```

## Best Practices

### 1. Error Handling

Always wrap OpenAI API calls in try-catch blocks:

```typescript
try {
  const response = await openai.chat.completions.create({/* ... */});
  return response;
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error('OpenAI API Error:', error.status, error.message);
    // Handle specific error codes (rate limits, invalid requests, etc.)
  } else {
    console.error('Unexpected error:', error);
  }
  throw error;
}
```

### 2. Rate Limiting

Implement rate limiting to avoid hitting API limits:

```typescript
import pLimit from 'p-limit';

// Limit concurrent API calls
const limit = pLimit(5); // Max 5 concurrent requests

const promises = tasks.map(task =>
  limit(() => openai.chat.completions.create({/* ... */}))
);

const results = await Promise.all(promises);
```

### 3. Token Management

Monitor token usage to control costs:

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [/* ... */],
  max_tokens: 500, // Limit response length
});

console.log('Tokens used:', response.usage);
// { prompt_tokens: 50, completion_tokens: 200, total_tokens: 250 }
```

### 4. Streaming Responses

For real-time feedback (like chat interfaces):

```typescript
const stream = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [/* ... */],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}
```

## Client-Side Usage (Important!)

**Never expose the API key to the client!** Always make OpenAI API calls from the server.

### Correct Pattern

```typescript
// CLIENT: client/src/hooks/use-ai-chat.ts
export function useAIChat() {
  const sendMessage = async (message: string) => {
    // Call YOUR server endpoint
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return response.json();
  };

  return { sendMessage };
}

// SERVER: server/ai-routes.ts
router.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body;

  // Use OpenAI API here (server-side only)
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: message }],
  });

  res.json({ response: completion.choices[0].message.content });
});
```

## Testing

### Mock OpenAI for Tests

```typescript
// In test files
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked response' } }]
        })
      }
    }
  }))
}));
```

## Available Models

- **gpt-4**: Most capable, best for complex reasoning
- **gpt-4-turbo**: Faster and cheaper than gpt-4
- **gpt-3.5-turbo**: Fast and cost-effective for simpler tasks
- **gpt-4-vision-preview**: Image understanding
- **text-embedding-3-small**: Embeddings for semantic search

## Cost Monitoring

Monitor your API usage at: https://platform.openai.com/usage

Approximate costs (as of 2024):
- GPT-4: ~$0.03/1K tokens (prompt) + $0.06/1K tokens (completion)
- GPT-3.5-Turbo: ~$0.0015/1K tokens (much cheaper)

## Security Checklist

- [x] API key stored in `.env` file
- [x] `.env` file in `.gitignore`
- [x] API key never exposed to client
- [x] API calls only from server-side code
- [ ] Rate limiting implemented (if needed)
- [ ] Error handling in place
- [ ] Usage monitoring set up

## Existing Integrations

The application already uses OpenAI in:

1. **Design Generation** (`server/design-routes.ts`)
   - Generates telescope designs from natural language descriptions
   - Uses GPT-4 with JSON response format

2. **Ready for Integration**:
   - Natural language telescope commands
   - Knowledge base AI queries
   - Image analysis
   - Semantic search

## Quick Start Example

Here's a complete example to add a new AI-powered feature:

```typescript
// server/ai-assistant-routes.ts
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// New AI assistant endpoint
router.post('/api/ai/assistant', async (req, res) => {
  const { prompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert astronomy and telescope assistant."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;

    res.json({
      success: true,
      response,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
    });
  }
});

export default router;

// Add to server/routes.ts:
// import aiAssistantRouter from './ai-assistant-routes';
// app.use(aiAssistantRouter);
```

## Support & Resources

- OpenAI API Documentation: https://platform.openai.com/docs
- OpenAI Node.js SDK: https://github.com/openai/openai-node
- API Key Management: https://platform.openai.com/api-keys
- Usage Dashboard: https://platform.openai.com/usage

## Notes

- The API key is **active and ready to use**
- The `openai` npm package is already installed
- Environment variables are loaded automatically by the server
- Always test with lower-cost models (gpt-3.5-turbo) during development
