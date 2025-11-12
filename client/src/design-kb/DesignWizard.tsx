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

  const simulateLLMResponse = async (userMessage: string): Promise<string> => {
    // Simulate LLM processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Simple rule-based responses (in production, this would call OpenAI API)
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("planet") || lowerMessage.includes("lunar") || lowerMessage.includes("moon")) {
      return `Great choice! For planetary observation, you'll want:\n\n🔭 **Recommended Design**: Longer focal length scope (f/8-f/12) with moderate aperture\n- Better for high magnification\n- Sharper views of planets\n- Less affected by atmospheric turbulence\n\nBased on typical planetary setups, I'm thinking:\n\n\`\`\`json
{
  "aperture_mm": 150,
  "focal_ratio": 8,
  "type": "newtonian",
  "focuser_type": "crayford",
  "primary_use": "planetary",
  "budget_usd": 300,
  "confidence": 0.7
}
\`\`\`\n\nThis would give you a 150mm f/8 Newtonian - excellent for lunar and planetary detail!\n\nWhat do you think? Would you like a larger aperture for more light gathering, or keep it compact?`;
    }

    if (lowerMessage.includes("deep") || lowerMessage.includes("galaxy") || lowerMessage.includes("nebula")) {
      return `Excellent! Deep sky objects need:\n\n✨ **Recommended Design**: Fast, wide-field scope (f/4-f/6) with larger aperture\n- Gathers more light for faint objects\n- Wider field of view\n- Great for nebulae and galaxies\n\n\`\`\`json
{
  "aperture_mm": 200,
  "focal_ratio": 5,
  "type": "dobsonian",
  "focuser_type": "crayford",
  "primary_use": "deep_sky",
  "budget_usd": 400,
  "confidence": 0.8
}
\`\`\`\n\nThis 200mm f/5 Dobsonian would be perfect for hunting down galaxies and nebulae!\n\nDoes this sound good? Any specific targets you're excited about?`;
    }

    if (lowerMessage.match(/\d+/) && (lowerMessage.includes("budget") || lowerMessage.includes("$") || lowerMessage.includes("spend"))) {
      const budget = parseInt(lowerMessage.match(/\d+/)?.[0] || "500");
      return `Got it! Working with a $${budget} budget.\n\nThat gives us some good options. For that price range, I'd suggest a Dobsonian mount (simple, sturdy, great value) with a nice aperture.\n\nWhat's more important to you:\n1. **Portability** - smaller, easier to transport\n2. **Light gathering** - bigger aperture, heavier but shows more\n3. **Versatility** - good at everything, master of none`;
    }

    if (lowerMessage.includes("beginner") || lowerMessage.includes("first") || lowerMessage.includes("new")) {
      return `Perfect! As a beginner, I'd recommend starting with a Dobsonian mount - they're:\n\n✅ Easy to use (point and shoot!)\n✅ Stable and sturdy\n✅ Great value for aperture\n✅ Low maintenance\n\nNow, what excites you more:\n- The **Moon and planets** (crisp detail, high magnification)\n- **Nebulae and galaxies** (faint fuzzies, wide views)\n- **Both!** (we can optimize for versatility)`;
    }

    // Default response
    return `Interesting! Tell me more about:\n\n1. What you're most excited to observe\n2. Where you'll be using it (backyard, dark site, travel?)\n3. Any size/weight constraints\n\nThe more I know, the better I can tailor the design!`;
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
      const response = await simulateLLMResponse(input);
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
          content: "Sorry, I encountered an error. Could you rephrase that?",
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
