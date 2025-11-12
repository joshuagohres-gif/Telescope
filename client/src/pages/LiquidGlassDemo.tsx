import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LiquidGlassDemo() {
  const [sliderValue, setSliderValue] = useState([50]);
  const [glassSliderValue, setGlassSliderValue] = useState([75]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Liquid Glass UI Demo</h1>
          <p className="text-gray-300">
            Showcasing liquid glass effects on buttons and sliders
          </p>
        </div>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Button Variants</CardTitle>
            <CardDescription className="text-gray-300">
              Comparing standard buttons with liquid glass effects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Standard Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Liquid Glass Buttons</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="glass">Glass Variant</Button>
                <Button variant="default" liquidGlass>
                  Default + Glass
                </Button>
                <Button variant="secondary" liquidGlass>
                  Secondary + Glass
                </Button>
                <Button variant="outline" liquidGlass>
                  Outline + Glass
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Button Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="glass" size="sm">
                  Small Glass
                </Button>
                <Button variant="glass" size="default">
                  Default Glass
                </Button>
                <Button variant="glass" size="lg">
                  Large Glass
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Slider Variants</CardTitle>
            <CardDescription className="text-gray-300">
              Standard slider vs liquid glass slider
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Standard Slider</h3>
                <span className="text-sm text-gray-400">{sliderValue[0]}%</span>
              </div>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Liquid Glass Slider</h3>
                <span className="text-sm text-gray-400">{glassSliderValue[0]}%</span>
              </div>
              <Slider
                liquidGlass
                value={glassSliderValue}
                onValueChange={setGlassSliderValue}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-400 italic">
                Hover over the thumb to see the liquid glass effect!
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Interactive Demo</CardTitle>
            <CardDescription className="text-gray-300">
              Hover and interact with the elements below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {["Save", "Cancel", "Submit", "Delete", "Upload", "Download"].map((label) => (
                <Button key={label} variant="glass" className="w-full">
                  {label}
                </Button>
              ))}
            </div>

            <div className="space-y-4 p-6 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-sm font-medium text-white">Volume Control</h3>
              <Slider liquidGlass defaultValue={[60]} max={100} step={1} />
              
              <h3 className="text-sm font-medium text-white mt-4">Brightness</h3>
              <Slider liquidGlass defaultValue={[80]} max={100} step={1} />
              
              <h3 className="text-sm font-medium text-white mt-4">Contrast</h3>
              <Slider liquidGlass defaultValue={[50]} max={100} step={1} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardHeader>
            <CardTitle className="text-white">About Liquid Glass</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300 text-sm">
            <p>
              The liquid glass effect uses SVG displacement maps to create a subtle, 
              fluid distortion that responds to mouse movement. This creates an organic,
              glass-like appearance that adds depth and interactivity to UI elements.
            </p>
            <p>
              <strong className="text-white">Features:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Mouse-responsive distortion effects</li>
              <li>Smooth, performant animations using requestAnimationFrame</li>
              <li>Customizable intensity and border radius</li>
              <li>Seamlessly integrates with existing components</li>
              <li>Works with both light and dark themes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
