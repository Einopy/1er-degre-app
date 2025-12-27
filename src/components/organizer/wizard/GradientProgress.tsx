interface GradientProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

export function GradientProgress({ currentStep, totalSteps }: GradientProgressProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)',
          }}
        />
      </div>
    </div>
  );
}
