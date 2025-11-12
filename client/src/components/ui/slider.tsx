import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
import { useLiquidGlass } from "@/hooks/use-liquid-glass"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  liquidGlass?: boolean
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, liquidGlass = false, ...props }, ref) => {
  const glassRef = useLiquidGlass({ 
    enabled: liquidGlass,
    intensity: 0.3,
    borderRadius: 1.0,
  });

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(
        "relative h-2 w-full grow overflow-hidden rounded-full",
        liquidGlass 
          ? "bg-white/10 backdrop-blur-sm border border-white/20" 
          : "bg-secondary"
      )}>
        <SliderPrimitive.Range className={cn(
          "absolute h-full",
          liquidGlass
            ? "bg-gradient-to-r from-blue-400/50 to-purple-400/50 backdrop-blur-sm"
            : "bg-primary"
        )} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        ref={glassRef as any}
        className={cn(
          "block h-5 w-5 rounded-full border-2 ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          liquidGlass
            ? "border-white/30 bg-white/20 backdrop-blur-md shadow-lg hover:h-6 hover:w-6 hover:shadow-xl"
            : "border-primary bg-background"
        )} 
      />
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
