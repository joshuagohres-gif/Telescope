/**
 * CAD Generative API Routes
 *
 * Server-side endpoints for LLM-based generative CAD.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GenerativeBridge } from '../client/src/cad/generative/llm-bridge';
import type {
  GenerativeRequest,
  GenerativeResponse,
  RefineRequest,
} from '../client/src/cad/generative/llm-bridge';

const router = Router();

// Initialize the generative bridge
// API key should come from environment variable
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn('[CAD] Warning: OPENAI_API_KEY not set. Generative features will be disabled.');
}

const bridge = apiKey ? new GenerativeBridge(apiKey) : null;

// Validation schemas
const generateRequestSchema = z.object({
  description: z.string().min(10).max(2000),
  context: z
    .object({
      existingParts: z.array(z.string()).optional(),
      constraints: z.array(z.string()).optional(),
      materials: z.array(z.string()).optional(),
    })
    .optional(),
  temperature: z.number().min(0).max(1).optional(),
  includeComments: z.boolean().optional(),
});

const refineRequestSchema = z.object({
  cadScript: z.string().min(1),
  paramSchema: z.record(z.any()),
  refinementInstructions: z.string().min(10).max(1000),
  currentParams: z.record(z.any()).optional(),
});

const suggestParamsRequestSchema = z.object({
  cadScript: z.string().min(1),
  paramSchema: z.record(z.any()),
  objective: z.string().min(10).max(500),
});

/**
 * POST /api/cad/generate
 *
 * Generate a CAD model from natural language description.
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    // Check if generative features are enabled
    if (!bridge) {
      return res.status(503).json({
        error: 'Generative features are not available',
        message: 'OpenAI API key is not configured on the server',
      });
    }

    // Validate request body
    const validationResult = generateRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const request: GenerativeRequest = validationResult.data;

    console.log('[CAD] Generating model from description:', request.description.substring(0, 100));

    // Call the generative bridge
    const startTime = Date.now();
    const response: GenerativeResponse = await bridge.generateFromDescription(request);
    const duration = Date.now() - startTime;

    console.log('[CAD] Generation successful:', response.templateName, `(${duration}ms)`);

    return res.status(200).json({
      success: true,
      data: response,
      meta: {
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[CAD] Generation error:', error);

    // Check for specific error types
    if (error.message?.includes('API key')) {
      return res.status(503).json({
        error: 'API configuration error',
        message: 'OpenAI API is not properly configured',
      });
    }

    if (error.message?.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      });
    }

    return res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/cad/refine
 *
 * Refine an existing CAD model with additional instructions.
 */
router.post('/refine', async (req: Request, res: Response) => {
  try {
    if (!bridge) {
      return res.status(503).json({
        error: 'Generative features are not available',
        message: 'OpenAI API key is not configured on the server',
      });
    }

    // Validate request body
    const validationResult = refineRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const request: RefineRequest = validationResult.data;

    console.log('[CAD] Refining model with instructions:', request.refinementInstructions.substring(0, 100));

    const startTime = Date.now();
    const response: GenerativeResponse = await bridge.refineModel(request);
    const duration = Date.now() - startTime;

    console.log('[CAD] Refinement successful:', response.templateName, `(${duration}ms)`);

    return res.status(200).json({
      success: true,
      data: response,
      meta: {
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[CAD] Refinement error:', error);

    return res.status(500).json({
      error: 'Refinement failed',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

/**
 * POST /api/cad/suggest-params
 *
 * Get parameter suggestions for a specific objective.
 */
router.post('/suggest-params', async (req: Request, res: Response) => {
  try {
    if (!bridge) {
      return res.status(503).json({
        error: 'Generative features are not available',
        message: 'OpenAI API key is not configured on the server',
      });
    }

    // Validate request body
    const validationResult = suggestParamsRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const { cadScript, paramSchema, objective } = validationResult.data;

    console.log('[CAD] Suggesting parameters for objective:', objective.substring(0, 100));

    const startTime = Date.now();
    const suggestions = await bridge.suggestParameters(cadScript, paramSchema, objective);
    const duration = Date.now() - startTime;

    console.log('[CAD] Parameter suggestions generated', `(${duration}ms)`);

    return res.status(200).json({
      success: true,
      data: suggestions,
      meta: {
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[CAD] Parameter suggestion error:', error);

    return res.status(500).json({
      error: 'Parameter suggestion failed',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

/**
 * GET /api/cad/status
 *
 * Check if generative features are available.
 */
router.get('/status', (req: Request, res: Response) => {
  return res.status(200).json({
    available: bridge !== null,
    message: bridge
      ? 'Generative features are available'
      : 'OpenAI API key is not configured',
  });
});

export default router;
