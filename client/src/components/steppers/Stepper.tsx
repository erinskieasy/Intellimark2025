import * as React from "react";
import { cn } from "@/lib/utils";

export interface StepProps {
  title: string;
  icon: React.ReactNode;
  active?: boolean;
}

export const Step = React.forwardRef<HTMLDivElement, StepProps>(
  ({ title, icon, active = false }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "stepper-item flex-1 relative z-10 flex flex-col items-center",
          active && "active"
        )}
      >
        <div 
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            active ? "bg-primary text-white" : "bg-gray-300 text-gray-600"
          )}
        >
          {icon}
        </div>
        <div 
          className={cn(
            "text-xs mt-1 font-medium",
            active ? "text-primary" : "text-gray-500"
          )}
        >
          {title}
        </div>
      </div>
    );
  }
);

Step.displayName = "Step";

export interface StepperProps {
  currentStep: number;
  steps: Array<{
    title: string;
    icon: React.ReactNode;
  }>;
  className?: string;
}

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ currentStep, steps, className }, ref) => {
    return (
      <div ref={ref} className={cn("mb-8 mt-2", className)}>
        <div className="flex justify-between relative">
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              icon={step.icon}
              active={index < currentStep}
            />
          ))}
        </div>
      </div>
    );
  }
);

Stepper.displayName = "Stepper";
