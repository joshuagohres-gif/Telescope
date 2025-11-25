import type { Express } from "express";
import { z } from "zod";
import { generativeDesignStorage } from "./generative-design-storage";
import { callTelescopeDesignLLM, parseLLMResponse } from "./generative-design-llm";
import {
  createDesignSessionRequestSchema,
  addDesignTurnRequestSchema,
  type PipelineStage,
  type DesignDomain,
} from "@shared/generative-design-schema";

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export function registerGenerativeDesignRoutes(app: Express) {
  // ==========================================================================
  // POST /api/generative-design/sessions - Create new design session
  // ==========================================================================
  app.post("/api/generative-design/sessions", async (req, res) => {
    try {
      const { title, initialPrompt } = createDesignSessionRequestSchema.parse(req.body);

      // Get or create anonymous user (until Auth is implemented)
      const user = await generativeDesignStorage.getOrCreateAnonymousUser();

      // Create design session
      const session = await generativeDesignStorage.createDesignSession({
        userId: user.id,
        title,
        status: "active",
        currentStage: "STAGE_INITIAL_CRITERIA",
        selectedDomain: "UNKNOWN",
      });

      // Store the initial user message as a turn
      await generativeDesignStorage.createDesignTurn({
        designSessionId: session.id,
        stage: "STAGE_INITIAL_CRITERIA",
        actorType: "user",
        userVisibleText: initialPrompt,
        llmRawResponse: null,
        llmRequestPayload: null,
        categorizationTags: ["initial_criteria", "user_input"],
      });

      // Call LLM with initial prompt
      const llmResponse = await callTelescopeDesignLLM({
        userMessage: initialPrompt,
        currentStage: "STAGE_INITIAL_CRITERIA",
        currentDomain: "UNKNOWN",
      });

      // Store LLM response as a turn
      const llmTurn = await generativeDesignStorage.createDesignTurn({
        designSessionId: session.id,
        stage: llmResponse.stage,
        actorType: "llm",
        userVisibleText: llmResponse.user_facing_text,
        llmRawResponse: llmResponse,
        llmRequestPayload: { userMessage: initialPrompt },
        categorizationTags: [
          `stage=${llmResponse.stage}`,
          `domain=${llmResponse.domain}`,
          `flag=${llmResponse.stage_flag}`,
        ],
      });

      // Update session with new stage and domain
      const updatedSession = await generativeDesignStorage.updateDesignSession(session.id, {
        currentStage: llmResponse.stage,
        selectedDomain: llmResponse.domain,
      });

      // Create stage transition if stage changed
      if (session.currentStage !== llmResponse.stage) {
        await generativeDesignStorage.createStageTransition({
          designSessionId: session.id,
          fromStage: session.currentStage,
          toStage: llmResponse.stage,
          reason: "Initial LLM response",
          triggerTurnId: llmTurn.id,
        });
      }

      // Create snapshot if we've reached a significant stage
      if (shouldCreateSnapshot(llmResponse.stage)) {
        await generativeDesignStorage.createDesignStateSnapshot({
          designSessionId: session.id,
          stage: llmResponse.stage,
          selectedDomain: llmResponse.domain,
          opticalDesign: llmResponse.design_data.optical_design,
          mechanicalDesign: llmResponse.design_data.mechanical_design,
          bom: llmResponse.bom,
          metadata: llmResponse.metadata,
        });
      }

      res.json({
        session: updatedSession,
        latestResponse: llmResponse,
      });
    } catch (error) {
      console.error("Error creating design session:", error);
      res.status(500).json({
        error: "Failed to create design session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // GET /api/generative-design/sessions - Get all sessions for user
  // ==========================================================================
  app.get("/api/generative-design/sessions", async (req, res) => {
    try {
      // Get anonymous user (until Auth is implemented)
      const user = await generativeDesignStorage.getOrCreateAnonymousUser();

      const sessions = await generativeDesignStorage.getDesignSessionsByUserId(user.id);

      res.json({ sessions });
    } catch (error) {
      console.error("Error fetching design sessions:", error);
      res.status(500).json({
        error: "Failed to fetch design sessions",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // GET /api/generative-design/sessions/:id - Get full session details
  // ==========================================================================
  app.get("/api/generative-design/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const fullSession = await generativeDesignStorage.getFullDesignSession(id);

      if (!fullSession) {
        return res.status(404).json({ error: "Design session not found" });
      }

      res.json(fullSession);
    } catch (error) {
      console.error("Error fetching design session:", error);
      res.status(500).json({
        error: "Failed to fetch design session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // POST /api/generative-design/sessions/:id/turns - Add user message and get LLM response
  // ==========================================================================
  app.post("/api/generative-design/sessions/:id/turns", async (req, res) => {
    try {
      const { id } = req.params;
      const { userMessage } = addDesignTurnRequestSchema.parse(req.body);

      // Get session
      const session = await generativeDesignStorage.getDesignSessionById(id);
      if (!session) {
        return res.status(404).json({ error: "Design session not found" });
      }

      // Get conversation history
      const turns = await generativeDesignStorage.getDesignTurnsBySessionId(id);
      const conversationHistory = turns
        .filter(t => t.actorType !== "system")
        .map(t => ({
          role: t.actorType === "user" ? "user" as const : "assistant" as const,
          content: t.actorType === "user" 
            ? (t.userVisibleText || "") 
            : JSON.stringify(t.llmRawResponse),
        }));

      // Store user message
      await generativeDesignStorage.createDesignTurn({
        designSessionId: session.id,
        stage: session.currentStage,
        actorType: "user",
        userVisibleText: userMessage,
        llmRawResponse: null,
        llmRequestPayload: null,
        categorizationTags: [`stage=${session.currentStage}`, "user_input"],
      });

      // Call LLM
      const llmResponse = await callTelescopeDesignLLM({
        userMessage,
        conversationHistory,
        currentStage: session.currentStage,
        currentDomain: session.selectedDomain,
      });

      // Store LLM response
      const llmTurn = await generativeDesignStorage.createDesignTurn({
        designSessionId: session.id,
        stage: llmResponse.stage,
        actorType: "llm",
        userVisibleText: llmResponse.user_facing_text,
        llmRawResponse: llmResponse,
        llmRequestPayload: { userMessage, conversationHistory },
        categorizationTags: [
          `stage=${llmResponse.stage}`,
          `domain=${llmResponse.domain}`,
          `flag=${llmResponse.stage_flag}`,
        ],
      });

      // Update session
      const updatedSession = await generativeDesignStorage.updateDesignSession(session.id, {
        currentStage: llmResponse.stage,
        selectedDomain: llmResponse.domain,
      });

      // Create stage transition if stage changed
      if (session.currentStage !== llmResponse.stage) {
        await generativeDesignStorage.createStageTransition({
          designSessionId: session.id,
          fromStage: session.currentStage,
          toStage: llmResponse.stage,
          reason: `User message: ${userMessage.substring(0, 50)}...`,
          triggerTurnId: llmTurn.id,
        });
      }

      // Create snapshot if appropriate
      if (shouldCreateSnapshot(llmResponse.stage)) {
        await generativeDesignStorage.createDesignStateSnapshot({
          designSessionId: session.id,
          stage: llmResponse.stage,
          selectedDomain: llmResponse.domain,
          opticalDesign: llmResponse.design_data.optical_design,
          mechanicalDesign: llmResponse.design_data.mechanical_design,
          bom: llmResponse.bom,
          metadata: llmResponse.metadata,
        });
      }

      // Store BOM items if present
      if (llmResponse.bom && llmResponse.bom.length > 0) {
        for (const bomItem of llmResponse.bom) {
          await generativeDesignStorage.createBomItem({
            designSessionId: session.id,
            stage: llmResponse.stage,
            category: bomItem.category || "unknown",
            name: bomItem.name || "Unnamed item",
            specs: bomItem.specs || null,
            estimatedQuantity: bomItem.quantity?.toString() || null,
            estimatedCost: bomItem.cost?.toString() || null,
          });
        }
      }

      res.json({
        session: updatedSession,
        latestResponse: llmResponse,
      });
    } catch (error) {
      console.error("Error adding turn to design session:", error);
      res.status(500).json({
        error: "Failed to add turn",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // DELETE /api/generative-design/sessions/:id - Delete session
  // ==========================================================================
  app.delete("/api/generative-design/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const session = await generativeDesignStorage.getDesignSessionById(id);
      if (!session) {
        return res.status(404).json({ error: "Design session not found" });
      }

      // Archive instead of delete
      await generativeDesignStorage.updateDesignSession(id, {
        status: "archived",
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting design session:", error);
      res.status(500).json({
        error: "Failed to delete design session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // GET /api/generative-design/sessions/:id/snapshots - Get all snapshots
  // ==========================================================================
  app.get("/api/generative-design/sessions/:id/snapshots", async (req, res) => {
    try {
      const { id } = req.params;

      const snapshots = await generativeDesignStorage.getSnapshotsBySessionId(id);

      res.json({ snapshots });
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({
        error: "Failed to fetch snapshots",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // GET /api/generative-design/sessions/:id/bom - Get BOM items
  // ==========================================================================
  app.get("/api/generative-design/sessions/:id/bom", async (req, res) => {
    try {
      const { id } = req.params;

      const bomItems = await generativeDesignStorage.getBomItemsBySessionId(id);

      res.json({ bomItems });
    } catch (error) {
      console.error("Error fetching BOM items:", error);
      res.status(500).json({
        error: "Failed to fetch BOM items",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ==========================================================================
  // GET /api/generative-design/sessions/:id/transitions - Get stage transitions
  // ==========================================================================
  app.get("/api/generative-design/sessions/:id/transitions", async (req, res) => {
    try {
      const { id } = req.params;

      const transitions = await generativeDesignStorage.getStageTransitionsBySessionId(id);

      res.json({ transitions });
    } catch (error) {
      console.error("Error fetching stage transitions:", error);
      res.status(500).json({
        error: "Failed to fetch stage transitions",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function shouldCreateSnapshot(stage: PipelineStage): boolean {
  // Create snapshots at significant stages
  const snapshotStages: PipelineStage[] = [
    "STAGE_DOMAIN_CLASSIFIED",
    "STAGE_DOMAIN_ANALYSIS",
    "STAGE_GEOMETRY_AND_TUBES",
    "STAGE_BOM_AND_MASS_ESTIMATE",
    "STAGE_FINAL_REVIEW",
    "STAGE_COMPLETE",
  ];
  return snapshotStages.includes(stage);
}
