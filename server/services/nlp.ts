import OpenAI from "openai";
import type { NLPResult, TelescopeCommand } from "@shared/schema";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// Reference: javascript_openai_ai_integrations blueprint
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export async function interpretCommand(naturalLanguage: string): Promise<NLPResult> {
  try {
    const systemPrompt = `You are an expert astronomical telescope control assistant. Your job is to interpret natural language commands and convert them into structured telescope control actions.

Available intents:
- goto_target: Move telescope to a celestial object or coordinates
- track_object: Start tracking a celestial object
- stop_tracking: Stop tracking current object
- park: Move telescope to park position
- home: Move telescope to home position
- capture_image: Take a camera exposure
- adjust_focus: Move the focuser
- calibrate: Perform polar alignment or plate solving
- get_status: Query current telescope status
- unknown: Cannot interpret command

Extract parameters when applicable:
- target: Name of celestial object (e.g., "Mars", "Andromeda Galaxy")
- ra, dec: Right ascension (hours) and declination (degrees)
- alt, az: Altitude and azimuth (degrees)
- exposureTime: Exposure time in seconds
- gain: Camera gain 0-100
- focusSteps: Number of focus steps (positive = outward, negative = inward)

Respond ONLY with valid JSON matching this format:
{
  "intent": "goto_target",
  "parameters": { "target": "Mars" },
  "confidence": 0.95,
  "explanation": "User wants to point telescope at Mars"
}`;

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: naturalLanguage },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result: NLPResult = JSON.parse(content);
    return result;
  } catch (error: any) {
    console.error("NLP interpretation error:", error);
    return {
      intent: "unknown",
      confidence: 0,
      explanation: `Failed to interpret command: ${error.message}`,
    };
  }
}

export async function executeInterpretedCommand(nlpResult: NLPResult): Promise<any> {
  const { intent, parameters = {} } = nlpResult;

  switch (intent) {
    case "goto_target":
      if (parameters.target) {
        return { action: "goto_target", target: parameters.target };
      } else if (parameters.ra !== undefined && parameters.dec !== undefined) {
        return { action: "goto_coordinates", ra: parameters.ra, dec: parameters.dec };
      }
      break;

    case "track_object":
      if (parameters.target) {
        return { action: "track", target: parameters.target };
      }
      break;

    case "stop_tracking":
      return { action: "stop_tracking" };

    case "park":
      return { action: "park" };

    case "home":
      return { action: "home" };

    case "capture_image":
      return {
        action: "capture",
        exposureTime: parameters.exposureTime || 30,
        gain: parameters.gain || 50,
      };

    case "adjust_focus":
      return {
        action: "focus",
        steps: parameters.focusSteps || 100,
      };

    case "calibrate":
      return { action: "calibrate" };

    case "get_status":
      return { action: "status" };

    default:
      throw new Error(`Unknown intent: ${intent}`);
  }

  throw new Error("Could not create command from NLP result");
}
