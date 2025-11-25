import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGenerativeDesign } from "@/hooks/use-generative-design";
import type { DesignTurn, LLMResponseEnvelope, BomItem, StageTransition } from "@shared/generative-design-schema";
import { 
  Plus, 
  MessageSquare, 
  Loader2, 
  Send, 
  Trash2, 
  Eye, 
  ChevronDown,
  Telescope,
  AlertCircle,
  Package,
  Settings
} from "lucide-react";

export function GenerativeDesignInterface() {
  const {
    sessions,
    currentSession,
    loading,
    error,
    createSession,
    fetchSession,
    addTurn,
    deleteSession,
  } = useGenerativeDesign();

  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionPrompt, setNewSessionPrompt] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.turns]);

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim() || !newSessionPrompt.trim()) return;

    const result = await createSession({
      title: newSessionTitle,
      initialPrompt: newSessionPrompt,
    });

    if (result) {
      setNewSessionTitle("");
      setNewSessionPrompt("");
      setShowNewSessionDialog(false);
      setSelectedSessionId(result.session.id);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    await fetchSession(sessionId);
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !selectedSessionId) return;

    const result = await addTurn(selectedSessionId, {
      userMessage: userMessage,
    });

    if (result) {
      setUserMessage("");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm("Are you sure you want to archive this session?")) {
      await deleteSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    }
  };

  const getDomainBadgeColor = (domain: string) => {
    switch (domain) {
      case "AR": return "bg-blue-500";
      case "NR": return "bg-green-500";
      case "SC": return "bg-purple-500";
      case "RASA": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getStageBadgeColor = (stage: string) => {
    if (stage.includes("COMPLETE")) return "bg-green-600";
    if (stage.includes("FOLLOWUP") || stage.includes("QUESTIONS")) return "bg-yellow-600";
    if (stage.includes("BOM") || stage.includes("GEOMETRY")) return "bg-purple-600";
    return "bg-blue-600";
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Sessions List */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Telescope className="w-5 h-5" />
              Design Sessions
            </h2>
            <Button
              size="sm"
              onClick={() => setShowNewSessionDialog(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>

          {showNewSessionDialog && (
            <Card className="p-4 space-y-3">
              <Input
                placeholder="Session title"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
              />
              <Textarea
                placeholder="Describe your telescope design goals..."
                value={newSessionPrompt}
                onChange={(e) => setNewSessionPrompt(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateSession}
                  disabled={loading || !newSessionTitle.trim() || !newSessionPrompt.trim()}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowNewSessionDialog(false);
                    setNewSessionTitle("");
                    setNewSessionPrompt("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                  selectedSessionId === session.id ? "bg-accent border-primary" : ""
                }`}
                onClick={() => handleLoadSession(session.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{session.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getDomainBadgeColor(session.selectedDomain)}`}>
                        {session.selectedDomain}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {sessions.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No design sessions yet.</p>
                <p className="text-xs mt-2">Create one to get started!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedSessionId && currentSession ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{currentSession.session.title}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge className={getStageBadgeColor(currentSession.session.currentStage)}>
                      {currentSession.session.currentStage.replace("STAGE_", "").replace(/_/g, " ")}
                    </Badge>
                    <Badge className={getDomainBadgeColor(currentSession.session.selectedDomain)}>
                      {getDomainName(currentSession.session.selectedDomain)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {currentSession.turns.length} turns
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {currentSession.turns.map((turn, index) => (
                  <TurnMessage key={turn.id} turn={turn} index={index} />
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  placeholder="Type your message..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !userMessage.trim()}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Telescope className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">No Session Selected</h2>
              <p className="text-sm">Select a session from the sidebar or create a new one</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Right Sidebar - Design Details */}
      {selectedSessionId && currentSession && (
        <div className="w-96 border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Design Details
            </h2>
          </div>

          <ScrollArea className="flex-1 p-4">
            <DesignDetailsPanel session={currentSession} />
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// Turn Message Component
function TurnMessage({ turn, index }: { turn: DesignTurn; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const isUser = turn.actorType === "user";
  const llmResponse = turn.llmRawResponse as LLMResponseEnvelope | null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Card className={`p-4 max-w-3xl ${isUser ? "bg-primary text-primary-foreground" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium opacity-70">
                {isUser ? "You" : "AI Designer"}
              </span>
              {!isUser && llmResponse && (
                <Badge variant="outline" className="text-xs">
                  {llmResponse.stage_flag}
                </Badge>
              )}
            </div>

            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{turn.userVisibleText}</p>
            ) : (
              <>
                {llmResponse && (
                  <>
                    <p className="text-sm whitespace-pre-wrap mb-3">
                      {llmResponse.user_facing_text}
                    </p>

                    {llmResponse.followup_questions && llmResponse.followup_questions.length > 0 && (
                      <div className="mt-3 p-3 bg-accent/50 rounded-md">
                        <h4 className="text-sm font-semibold mb-2">Follow-up Questions:</h4>
                        <ol className="list-decimal list-inside space-y-1">
                          {llmResponse.followup_questions.map((q, i) => (
                            <li key={i} className="text-sm">{q}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {(llmResponse.design_data.optical_design || 
                      llmResponse.design_data.mechanical_design ||
                      llmResponse.bom.length > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {expanded ? "Hide" : "Show"} Design Data
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </Button>
                    )}

                    {expanded && (
                      <div className="mt-3 space-y-3 text-sm">
                        {llmResponse.design_data.optical_design && (
                          <div className="p-3 bg-accent/30 rounded-md">
                            <h4 className="font-semibold mb-2">Optical Design:</h4>
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(llmResponse.design_data.optical_design, null, 2)}
                            </pre>
                          </div>
                        )}

                        {llmResponse.design_data.mechanical_design && (
                          <div className="p-3 bg-accent/30 rounded-md">
                            <h4 className="font-semibold mb-2">Mechanical Design:</h4>
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(llmResponse.design_data.mechanical_design, null, 2)}
                            </pre>
                          </div>
                        )}

                        {llmResponse.bom.length > 0 && (
                          <div className="p-3 bg-accent/30 rounded-md">
                            <h4 className="font-semibold mb-2">Bill of Materials:</h4>
                            <div className="space-y-2">
                              {llmResponse.bom.map((item: any, i: number) => (
                                <div key={i} className="text-xs border-l-2 border-primary pl-2">
                                  <div className="font-medium">{item.name || item.category}</div>
                                  {item.specs && (
                                    <div className="text-muted-foreground">
                                      {JSON.stringify(item.specs)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Design Details Panel Component
function DesignDetailsPanel({ session }: { session: any }) {
  const latestSnapshot = session.snapshots[session.snapshots.length - 1];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Package className="w-4 h-4" />
          BOM Items
        </h3>
        {session.bomItems.length > 0 ? (
          <div className="space-y-2">
            {session.bomItems.map((item: BomItem) => (
              <Card key={item.id} className="p-3 text-sm">
                <div className="font-medium">{item.name}</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {item.category}
                </Badge>
                {item.estimatedQuantity && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Qty: {item.estimatedQuantity}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No BOM items yet</p>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold text-sm mb-2">Stage Progress</h3>
        <div className="space-y-1">
          {session.transitions.map((transition: StageTransition) => (
            <div key={transition.id} className="text-xs border-l-2 border-primary pl-2 py-1">
              <div className="font-medium">
                {transition.fromStage.replace("STAGE_", "")} → {transition.toStage.replace("STAGE_", "")}
              </div>
              {transition.reason && (
                <div className="text-muted-foreground">{transition.reason}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {latestSnapshot && (
        <>
          <Separator />
          <div>
            <h3 className="font-semibold text-sm mb-2">Latest Snapshot</h3>
            <Badge variant="outline" className="text-xs mb-2">
              {latestSnapshot.stage.replace("STAGE_", "")}
            </Badge>
            {latestSnapshot.metadata && (
              <div className="text-xs space-y-2">
                {latestSnapshot.metadata.notes && latestSnapshot.metadata.notes.length > 0 && (
                  <div>
                    <div className="font-medium">Notes:</div>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {latestSnapshot.metadata.notes.map((note: string, i: number) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function getDomainName(domain: string): string {
  const names: Record<string, string> = {
    UNKNOWN: "Unknown",
    AR: "Apochromatic Refractor",
    NR: "Newtonian Reflector",
    SC: "Schmidt-Cassegrain",
    RASA: "Rowe-Ackermann Schmidt Astrograph",
  };
  return names[domain] || domain;
}
