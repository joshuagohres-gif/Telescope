import { useState, useEffect, useCallback } from "react";
import type {
  DesignSession,
  DesignTurn,
  DesignStateSnapshot,
  BomItem,
  StageTransition,
  LLMResponseEnvelope,
  CreateDesignSessionRequest,
  AddDesignTurnRequest,
} from "@shared/generative-design-schema";

interface FullDesignSession {
  session: DesignSession;
  turns: DesignTurn[];
  snapshots: DesignStateSnapshot[];
  bomItems: BomItem[];
  transitions: StageTransition[];
}

export function useGenerativeDesign() {
  const [sessions, setSessions] = useState<DesignSession[]>([]);
  const [currentSession, setCurrentSession] = useState<FullDesignSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/generative-design/sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a single session with full details
  const fetchSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/generative-design/sessions/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch session");
      const data: FullDesignSession = await response.json();
      setCurrentSession(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new design session
  const createSession = useCallback(async (request: CreateDesignSessionRequest) => {
    try {
      setLoading(true);
      const response = await fetch("/api/generative-design/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error("Failed to create session");
      const data: { session: DesignSession; latestResponse: LLMResponseEnvelope } = await response.json();
      
      // Fetch full session details
      await fetchSession(data.session.id);
      
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchSession]);

  // Add a turn (user message + LLM response)
  const addTurn = useCallback(async (sessionId: string, request: AddDesignTurnRequest) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/generative-design/sessions/${sessionId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error("Failed to add turn");
      const data: { session: DesignSession; latestResponse: LLMResponseEnvelope } = await response.json();
      
      // Refresh full session details
      await fetchSession(sessionId);
      
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchSession]);

  // Delete (archive) a session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/generative-design/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete session");
      
      // Refresh sessions list
      await fetchSessions();
      
      // Clear current session if it was deleted
      if (currentSession?.session.id === sessionId) {
        setCurrentSession(null);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchSessions, currentSession]);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    currentSession,
    loading,
    error,
    fetchSessions,
    fetchSession,
    createSession,
    addTurn,
    deleteSession,
  };
}
