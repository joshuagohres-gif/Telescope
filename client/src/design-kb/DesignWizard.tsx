import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Wrench, Eye, Download, CheckCircle } from "lucide-react";
import { TelescopePreview } from "./TelescopePreview";
import { DesignValidator } from "./DesignValidator";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  design?: TelescopeDesign | null;
}

interface TelescopeDesign {
  aperture_mm: number;
  focal_ratio: number;
  focal_length_mm: number;
  type: "newtonian" | "dobsonian" | "refractor" | "sct" | "maksutov";
  focuser_type: string;
  obstruction_pct?: number;
  tube_length_mm?: number;
  tube_diameter_mm?: number;
  secondary_size_mm?: number;
  mount_type?: string;
  budget_usd?: number;
  primary_use?: string;
  confidence: number;
}

const WIZARD_STAGES = ["conversation", "refinement", "validation", "complete"] as const;
type WizardStage = typeof WIZARD_STAGES[number];

const INITIAL_SYSTEM_PROMPT = `You are an expert telescope design consultant. Your goal is to understand the user's needs and help them design a custom telescope.

Start by asking about:
1. What they want to observe (planets, deep sky, both)
2. Their experience level
3. Budget constraints
4. Portability needs
5. Any specific requirements

Based on their answers, extract telescope design parameters and provide them in this JSON format:
{
  "aperture_mm": number,
  "focal_ratio": number,
  "type": "newtonian" | "dobsonian" | "refractor" | "sct" | "maksutov",
  "focuser_type": string,
  "primary_use": string,
  "budget_usd": number,
  "confidence": 0-1
}

Be conversational, friendly, and educational. Explain your recommendations.`;

function extractDesignFromResponse(content: string): TelescopeDesign | null {
  // Try to find JSON in the response
  const jsonMatch = content.match(/\{[\s\S]*?"aperture_mm"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const design = JSON.parse(jsonMatch[0]);
      // Calculate derived values
      design.focal_length_mm = design.aperture_mm * design.focal_ratio;
      return design as TelescopeDesign;
    } catch (e) {
      console.error("Failed to parse design JSON:", e);
    }
  }
  return null;
}

export function DesignWizard() {
  const [stage, setStage] = useState<WizardStage>("conversation");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! I'm your telescope design assistant. I'll help you create a custom telescope design tailored to your needs.\n\nLet's start with a few questions:\n\n1. What do you primarily want to observe? (Planets, galaxies, nebulae, or a bit of everything?)\n2. What's your experience level with telescopes?\n3. Do you have a budget in mind?",
      design: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDesign, setCurrentDesign] = useState<TelescopeDesign | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callDesignAPI = async (userMessage: string): Promise<string> => {
    // Extract requirements from conversation history
    const requirements = extractRequirements(messages, userMessage);

    try {
      // Call real API endpoint
      const response = await fetch('/astrodb/v1/designs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirements }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const design = data.data;

      // Format response with design details
      return formatDesignResponse(design, userMessage);
    } catch (error) {
      console.error('API call failed, using fallback:', error);
      // Fallback to simple rule-based response
      return generateFallbackResponse(userMessage);
    }
  };

  const extractRequirements = (messages: Message[], latestMessage: string) => {
    // Extract requirements from conversation context
    const allMessages = messages.map(m => m.content).join(' ') + ' ' + latestMessage;
    const lowerText = allMessages.toLowerCase();

    return {
      primary_use: lowerText.includes('planet') || lowerText.includes('lunar') ? 'planetary' :
                   lowerText.includes('deep') || lowerText.includes('galaxy') || lowerText.includes('nebula') ? 'deep_sky' :
                   'general',
      budget_usd: parseInt(allMessages.match(/\$?(\d{3,4})/)?.[1] || '400'),
      experience_level: lowerText.includes('beginner') || lowerText.includes('first') ? 'beginner' :
                       lowerText.includes('advanced') || lowerText.includes('experienced') ? 'advanced' :
                       'intermediate',
      portability: lowerText.includes('portable') || lowerText.includes('travel') ? 'high' : 'moderate',
      observing_location: lowerText.includes('dark') || lowerText.includes('rural') ? 'dark_site' : 'suburban',
      specific_targets: latestMessage,
      notes: latestMessage,
    };
  };

  const formatDesignResponse = (design: any, userMessage: string): string => {
    const emoji = design.type === 'dobsonian' || design.type === 'newtonian' ? '🔭' :
                  design.type === 'refractor' ? '🔬' : '✨';

    return `${emoji} **Perfect! Here's what I'm thinking:**

${design.reasoning || 'Based on your requirements, I recommend:'}

**Design Specifications:**
- **Aperture:** ${design.aperture_mm}mm (${(design.aperture_mm / 25.4).toFixed(1)} inches)
- **Focal Ratio:** f/${design.focal_ratio}
- **Type:** ${design.type}
- **Focuser:** ${design.focuser_type}
- **Budget:** $${design.budget_usd}

**Estimated Performance:**
- **Limiting Magnitude:** ${design.estimated_performance?.limiting_magnitude?.toFixed(1) || 'N/A'}
- **Resolution:** ${design.estimated_performance?.resolution_arcsec?.toFixed(2) || 'N/A'}" arc-seconds
- **Max Magnification:** ${design.estimated_performance?.max_magnification || 'N/A'}×

${design.recommendations ? '\n**Recommendations:**\n' + design.recommendations.map((r: string) => `- ${r}`).join('\n') : ''}

${design.warnings ? '\n⚠️ **Warnings:**\n' + design.warnings.map((w: string) => `- ${w}`).join('\n') : ''}

\`\`\`json
{
  "aperture_mm": ${design.aperture_mm},
  "focal_ratio": ${design.focal_ratio},
  "type": "${design.type}",
  "focuser_type": "${design.focuser_type}",
  "primary_use": "${design.primary_use}",
  "budget_usd": ${design.budget_usd},
  "confidence": ${design.confidence}
}
\`\`\`

What do you think? Would you like me to adjust anything?`;
  };

  const generateFallbackResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("planet") || lowerMessage.includes("lunar")) {
      return `🔭 For planetary observation, I recommend a longer focal length scope (f/8-f/12).\n\nThis would give you excellent high-magnification views of the Moon, planets, and double stars.\n\nTell me your budget and I can suggest specific configurations!`;
    }

    if (lowerMessage.includes("deep") || lowerMessage.includes("galaxy")) {
      return `✨ For deep-sky objects, you'll want a fast, wide-field scope (f/4-f/6) with larger aperture.\n\nThis maximizes light gathering for faint galaxies and nebulae.\n\nWhat's your budget?`;
    }

    return `Tell me more about:\n1. What you want to observe\n2. Your budget\n3. Experience level\n\nThis will help me design the perfect telescope for you!`;
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    try {
      const response = await callDesignAPI(input);
      const design = extractDesignFromResponse(response);

      const assistantMessage: Message = {
        role: "assistant",
        content: response,
        design,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (design && design.confidence > 0.6) {
        setCurrentDesign(design);
      }
    } catch (error) {
      console.error("Error getting response:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error generating your design. Please try rephrasing your requirements or check that the Design KB is properly configured.",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const moveToRefinement = () => {
    setStage("refinement");
  };

  const moveToValidation = () => {
    setStage("validation");
  };

  const completeDesign = () => {
    setStage("complete");
  };

  if (stage === "conversation") {
    return (
      <div className="h-[calc(100vh-200px)] flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Design Your Telescope</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Chat Interface */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                      {msg.design && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="text-xs opacity-80">
                            Design extracted: {msg.design.aperture_mm}mm f/{msg.design.focal_ratio} {msg.design.type}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        Thinking...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Tell me about your telescope needs..."
                    className="flex-1 min-h-[60px] max-h-[120px]"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isProcessing}
                    size="lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </Card>
          </div>

          {/* Current Design Preview */}
          <div className="lg:col-span-1">
            <Card className="p-4 h-full">
              <h3 className="font-semibold mb-3">Current Design</h3>
              {currentDesign ? (
                <div className="space-y-3">
                  <TelescopePreview design={currentDesign} />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aperture:</span>
                      <span className="font-medium">{currentDesign.aperture_mm}mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Focal Ratio:</span>
                      <span className="font-medium">f/{currentDesign.focal_ratio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Focal Length:</span>
                      <span className="font-medium">{currentDesign.focal_length_mm}mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{currentDesign.type}</span>
                    </div>
                    {currentDesign.budget_usd && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-medium">${currentDesign.budget_usd}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${currentDesign.confidence * 100}%` }}
                          />
                        </div>
                        <span>{Math.round(currentDesign.confidence * 100)}% confident</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={moveToRefinement}
                    className="w-full"
                    disabled={currentDesign.confidence < 0.6}
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Refine Design
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    Chat with me to design your perfect telescope!
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "refinement") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Refine Your Design</h2>
        </div>
        {currentDesign && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TelescopePreview design={currentDesign} />
            <Card className="p-4">
              <p className="text-muted-foreground mb-4">Use the optical calculator and other tools to fine-tune your design parameters.</p>
              <div className="space-y-4">
                <Button onClick={moveToValidation} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validate Design
                </Button>
                <Button onClick={() => setStage("conversation")} variant="outline" className="w-full">
                  Back to Chat
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (stage === "validation") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Validate Design</h2>
        </div>
        {currentDesign && (
          <DesignValidator design={currentDesign} onComplete={completeDesign} />
        )}
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h2 className="text-2xl font-bold">Design Complete!</h2>
        </div>
        {currentDesign && (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <TelescopePreview design={currentDesign} />
              <h3 className="text-xl font-semibold">Your Custom {currentDesign.aperture_mm}mm f/{currentDesign.focal_ratio} {currentDesign.type}</h3>
              <p className="text-muted-foreground">Design validated and ready to build!</p>
              <div className="flex gap-4 justify-center">
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Export BOM
                </Button>
                <Button variant="outline">
                  Download STL Files
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
