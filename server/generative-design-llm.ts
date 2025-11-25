import { llmResponseEnvelopeSchema, type LLMResponseEnvelope, type PipelineStage, type DesignDomain } from "@shared/generative-design-schema";
import { getOpenAIKey } from "./secrets";

// ============================================================================
// LLM SYSTEM PROMPT TEMPLATE
// ============================================================================

export const TELESCOPE_DESIGN_SYSTEM_PROMPT = `You are an expert telescope designer and optical engineer used as a backend engine in a telescope design app.
All your responses must be valid JSON (no extra text, no explanations outside JSON).

Always respond with a top-level JSON object with this structure:

{
 "stage": "STAGE_INITIAL_CRITERIA",
 "next_stage": "STAGE_FOLLOWUP_QUESTIONS",
 "stage_flag": "FOLLOW",
 "domain": "UNKNOWN",
 "status": "needs_user_input",
 "followup_required": true,

 "followup_questions": [],
 "user_facing_text": "",

 "design_data": {
   "classification": null,
   "optical_design": null,
   "mechanical_design": null
 },

 "bom": [],
 "metadata": {
   "notes": [],
   "warnings": [],
   "assumptions": [],
   "suggested_ui_actions": []
 }
}

Important protocol rules:

1. Pipeline stages (stage):
   - STAGE_INITIAL_CRITERIA – classify the design domain based on user goals.
   - STAGE_FOLLOWUP_QUESTIONS – ask for more info if needed.
   - STAGE_DOMAIN_CLASSIFIED – domain chosen: AR, NR, SC, or RASA.
   - STAGE_DOMAIN_ANALYSIS – high-level design logic for the chosen domain.
   - STAGE_GEOMETRY_AND_TUBES – precise tube dimensions, optical spacing, focuser details.
   - STAGE_BOM_AND_MASS_ESTIMATE – Bill of Materials and weight estimates.
   - STAGE_FINAL_REVIEW – sanity check, summarization, and recommendations.
   - STAGE_COMPLETE – final output; nothing more to ask.

2. Design domains (domain):
   - AR – Apochromatic Refractor
   - NR – Newtonian Reflector
   - SC – Schmidt-Cassegrain
   - RASA – Rowe-Ackermann Schmidt Astrograph
   - UNKNOWN – not yet determined

3. Follow-up questions:
   If you need more information from the user:
   - Set stage_flag to "FOLLOW".
   - Set followup_required to true.
   - Populate followup_questions with specific, concise questions.
   - In user_facing_text, you must start with "[FOLLOW]" and then provide a friendly explanation of what you need.

4. Transition to next phase:
   Once you have enough information to proceed to design:
   - Set stage_flag to "NEXTPHASE".
   - Set followup_required to false.
   - Choose the domain as one of AR, NR, SC, or RASA.
   - Set stage to STAGE_DOMAIN_CLASSIFIED.
   - Set next_stage to STAGE_DOMAIN_ANALYSIS.
   - In user_facing_text, you must start with "[NEXTPHASE]".

5. Design data expectations by stage:

   a. At STAGE_INITIAL_CRITERIA and STAGE_FOLLOWUP_QUESTIONS:
      Focus on understanding:
      - desired targets (e.g., planets, galaxies, nebulae, clusters)
      - user experience level
      - budget/cost constraints
      - astrophotography vs. visual emphasis
      - portability and mount constraints
      
      Populate:
      - design_data.classification with your current best guess or null.
      - design_data.optical_design and design_data.mechanical_design as null.

   b. At STAGE_DOMAIN_CLASSIFIED:
      - Set domain to AR, NR, SC, or RASA based on user criteria.
      - Explain the choice in metadata.notes.
      - Set next_stage = "STAGE_DOMAIN_ANALYSIS".

   c. At STAGE_DOMAIN_ANALYSIS:
      Provide high-level design description for chosen domain:
      - approximate aperture and focal length
      - target focal ratio
      - high-level tube concept and mechanical layout
      
      Store this in design_data.optical_design and design_data.mechanical_design as structured JSON.
      Set next_stage = "STAGE_GEOMETRY_AND_TUBES".

   d. At STAGE_GEOMETRY_AND_TUBES:
      Provide precise dimensional design for tubes and optical geometry.
      
      For AR (Apochromatic Refractor):
      - Design three tubes:
        * main optical tube
        * lens shade / dew cover
        * eyepiece holding / focusing tube
      - For each tube, provide: length, inner diameter (ID), outer diameter (OD)
      - Define: exact locations of objective lens and eyepiece focal plane
      - Define: mechanical clearances for focusing travel
      - The focusing tube must include: linear rack gear: length, thickness, tooth pitch, position on circumference
      - The main tube must include: exact location where the focuser drive shaft enters and engages the rack.

      For NR (Newtonian Reflector):
      - Design: main tube (length, ID, OD)
      - primary mirror cell placement
      - secondary mirror spider and holder (positions and dimensions)
      - focuser tube with rack gear and drive shaft penetration
      - Ensure: correct distance from primary to secondary
      - Ensure: correct intercept distance from secondary to focuser
      - secondary size appropriate to fully illuminate target field.

      For SC (Schmidt-Cassegrain):
      - Design: corrector plate housing/front cell, main tube, rear cell with baffle tube
      - Specify: primary mirror diameter and focal ratio, secondary magnification
      - Specify: distances between corrector, primary, secondary, and focal plane
      - Focusing via primary mirror motion: specify threaded rod or lead screw, travel distance, and penetration point.

      For RASA (Rowe-Ackermann Schmidt Astrograph):
      - Design: Schmidt corrector assembly, main tube, front camera mounting plate / lens group holder, rear primary mirror housing
      - Specify: extremely fast focal ratio (f/2–f/3 range)
      - Specify: precise spacing between corrector, lens group, primary mirror, and sensor
      - Specify: backfocus and tolerances, primary mirror focusing mechanism.

      For this stage, you must populate:
      - design_data.optical_design with all optical distances, diameters, focal lengths, f-ratios.
      - design_data.mechanical_design with all tube dimensions, hole positions, rack gear geometry, etc.
      - Set next_stage = "STAGE_BOM_AND_MASS_ESTIMATE".

   e. At STAGE_BOM_AND_MASS_ESTIMATE:
      Generate a Bill of Materials:
      
      For all domains:
      - lenses and/or mirrors
      - eyepieces where appropriate
      - structural materials (tubes, cells, spiders, focusers)
      - estimated weight of 3D-printed material used in tubes and structural parts
      
      For AR: apochromatic objective lens (diameter, focal length), eyepiece spec, 3D print mass of the three tubes
      For NR: primary mirror, secondary mirror, spider hardware
      For SC and RASA: corrector plates, mirror sets, RASA lens group (for RASA), focusing hardware.
      
      Each BOM entry must be structured in the bom array with:
      - category, name, key specifications, quantity, estimated mass and optional estimated cost.
      
      Add design assumptions and limits in metadata.assumptions and metadata.warnings.
      Set next_stage = "STAGE_FINAL_REVIEW".

   f. At STAGE_FINAL_REVIEW and STAGE_COMPLETE:
      - Summarize the design: domain, key specs, strengths, and limitations.
      - Provide final consistency checks.
      - Set stage = "STAGE_COMPLETE" and stage_flag = "FINAL" once finished.

6. Dimension consistency:
   All dimensions must be mutually consistent:
   - focal planes line up with eyepieces or sensors
   - tube lengths match optical spacing
   - mirror and lens sizes are sufficient for the intended field.

7. Never output raw text outside the JSON object.
8. Do not wrap JSON in Markdown fences.
9. Do not include comments.
10. Ensure the JSON is syntactically valid.`;

// ============================================================================
// LLM RESPONSE PARSING AND VALIDATION
// ============================================================================

export function parseLLMResponse(rawResponse: string): LLMResponseEnvelope {
  try {
    // Remove markdown code fences if present
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
    }

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate against schema
    const validated = llmResponseEnvelopeSchema.parse(parsed);

    return validated;
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    console.error("Raw response:", rawResponse);
    throw new Error(`Invalid LLM response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// LLM CALL WRAPPER (using OpenAI-compatible API)
// ============================================================================

export interface LLMCallOptions {
  userMessage: string;
  conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  currentStage?: PipelineStage;
  currentDomain?: DesignDomain;
}

export async function callTelescopeDesignLLM(options: LLMCallOptions): Promise<LLMResponseEnvelope> {
  const { userMessage, conversationHistory = [], currentStage, currentDomain } = options;

  // Check for API key (from secrets system or environment)
  const apiKey = getOpenAIKey() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  No LLM API key found. Returning mock response.");
    return createMockLLMResponse(userMessage, currentStage, currentDomain);
  }

  try {
    // Build messages array
    const messages = [
      { role: "system" as const, content: TELESCOPE_DESIGN_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: "user" as const, content: userMessage },
    ];

    // Determine which API to use
    const isAnthropic = !!process.env.ANTHROPIC_API_KEY && !getOpenAIKey();

    let rawResponse: string;

    if (isAnthropic) {
      // Call Anthropic API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: messages.filter(m => m.role !== "system"),
          system: TELESCOPE_DESIGN_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      rawResponse = data.content[0].text;
    } else {
      // Call OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getOpenAIKey()}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o",
          messages,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      rawResponse = data.choices[0].message.content;
    }

    // Parse and validate the response
    return parseLLMResponse(rawResponse);
  } catch (error) {
    console.error("Error calling LLM:", error);
    // Return a fallback mock response
    return createMockLLMResponse(userMessage, currentStage, currentDomain);
  }
}

// ============================================================================
// MOCK LLM RESPONSE (for testing without API key)
// ============================================================================

function createMockLLMResponse(
  userMessage: string,
  currentStage?: PipelineStage,
  currentDomain?: DesignDomain
): LLMResponseEnvelope {
  const lowerMessage = userMessage.toLowerCase();

  // If we're in initial criteria or no stage is set
  if (!currentStage || currentStage === "STAGE_INITIAL_CRITERIA") {
    // Check if user mentioned a specific type
    if (lowerMessage.includes("nebula") || lowerMessage.includes("widefield") || lowerMessage.includes("astrophotography")) {
      return {
        stage: "STAGE_FOLLOWUP_QUESTIONS",
        next_stage: "STAGE_DOMAIN_CLASSIFIED",
        stage_flag: "FOLLOW",
        domain: "UNKNOWN",
        status: "needs_user_input",
        followup_required: true,
        followup_questions: [
          "What is your target aperture (e.g., 80mm, 100mm, 150mm)?",
          "What is your budget range?",
          "Do you need this telescope to be portable?",
          "What mount do you plan to use?",
        ],
        user_facing_text: "[FOLLOW] I understand you're interested in imaging nebulae and widefield targets. To design the optimal telescope for you, I need a few more details about your requirements.",
        design_data: {
          classification: { primary_use: "astrophotography", targets: ["nebulae", "widefield"] },
          optical_design: null,
          mechanical_design: null,
        },
        bom: [],
        metadata: {
          notes: ["Detected interest in nebula and widefield imaging"],
          warnings: [],
          assumptions: [],
          suggested_ui_actions: [],
        },
      };
    }

    // Generic follow-up
    return {
      stage: "STAGE_FOLLOWUP_QUESTIONS",
      next_stage: "STAGE_DOMAIN_CLASSIFIED",
      stage_flag: "FOLLOW",
      domain: "UNKNOWN",
      status: "needs_user_input",
      followup_required: true,
      followup_questions: [
        "What do you primarily want to observe or photograph (planets, deep sky objects, both)?",
        "What is your experience level with telescopes?",
        "Do you have any budget constraints?",
        "Do you need the telescope to be portable?",
      ],
      user_facing_text: "[FOLLOW] To design the perfect telescope for you, I need to understand your goals and constraints better. Please answer the following questions.",
      design_data: {
        classification: null,
        optical_design: null,
        mechanical_design: null,
      },
      bom: [],
      metadata: {
        notes: [],
        warnings: [],
        assumptions: [],
        suggested_ui_actions: [],
      },
    };
  }

  // If we have answers to follow-up questions, classify domain
  if (currentStage === "STAGE_FOLLOWUP_QUESTIONS") {
    let selectedDomain: DesignDomain = "NR";
    let domainReason = "Newtonian Reflector selected as a versatile general-purpose design";

    if (lowerMessage.includes("widefield") || lowerMessage.includes("fast")) {
      selectedDomain = "RASA";
      domainReason = "RASA selected for fast, widefield astrophotography";
    } else if (lowerMessage.includes("planet") || lowerMessage.includes("high magnification")) {
      selectedDomain = "SC";
      domainReason = "Schmidt-Cassegrain selected for planetary observation with compact design";
    } else if (lowerMessage.includes("refractor") || lowerMessage.includes("portable")) {
      selectedDomain = "AR";
      domainReason = "Apochromatic Refractor selected for portable, high-quality views";
    }

    return {
      stage: "STAGE_DOMAIN_CLASSIFIED",
      next_stage: "STAGE_DOMAIN_ANALYSIS",
      stage_flag: "NEXTPHASE",
      domain: selectedDomain,
      status: "in_progress",
      followup_required: false,
      followup_questions: [],
      user_facing_text: `[NEXTPHASE] Based on your requirements, I've classified this design as a ${selectedDomain} (${getDomainFullName(selectedDomain)}). Proceeding to detailed analysis.`,
      design_data: {
        classification: {
          domain: selectedDomain,
          reason: domainReason,
        },
        optical_design: null,
        mechanical_design: null,
      },
      bom: [],
      metadata: {
        notes: [domainReason],
        warnings: [],
        assumptions: [],
        suggested_ui_actions: ["Continue to domain analysis"],
      },
    };
  }

  // Continue with mock progression through other stages
  return {
    stage: "STAGE_DOMAIN_ANALYSIS",
    next_stage: "STAGE_GEOMETRY_AND_TUBES",
    stage_flag: "NEXTPHASE",
    domain: currentDomain || "NR",
    status: "in_progress",
    followup_required: false,
    followup_questions: [],
    user_facing_text: "[NEXTPHASE] Analyzing optical design for your telescope...",
    design_data: {
      classification: { domain: currentDomain || "NR" },
      optical_design: {
        aperture_mm: 150,
        focal_length_mm: 750,
        focal_ratio: 5.0,
      },
      mechanical_design: null,
    },
    bom: [],
    metadata: {
      notes: ["Mock response - API key not configured"],
      warnings: [],
      assumptions: [],
      suggested_ui_actions: [],
    },
  };
}

function getDomainFullName(domain: DesignDomain): string {
  const names: Record<DesignDomain, string> = {
    UNKNOWN: "Unknown",
    AR: "Apochromatic Refractor",
    NR: "Newtonian Reflector",
    SC: "Schmidt-Cassegrain",
    RASA: "Rowe-Ackermann Schmidt Astrograph",
  };
  return names[domain];
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export { getDomainFullName };
