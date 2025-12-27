interface CircularProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

export function CircularProgress({ currentStep, totalSteps, stepLabel }: CircularProgressProps) {
  const segments = Array.from({ length: totalSteps }, (_, i) => i);
  const segmentAngle = 360 / totalSteps;
  const radius = 28;
  const strokeWidth = 6;
  const center = 40;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground flex-1 text-right">
        {stepLabel}
      </span>
      <div className="relative w-20 h-20 shrink-0">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          className="transform -rotate-90"
        >
          {segments.map((index) => {
            const startAngle = index * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const startX = center + radius * Math.cos(startRad);
            const startY = center + radius * Math.sin(startRad);
            const endX = center + radius * Math.cos(endRad);
            const endY = center + radius * Math.sin(endRad);

            const largeArcFlag = segmentAngle > 180 ? 1 : 0;

            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <path
                key={index}
                d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
                fill="none"
                stroke={isCompleted || isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className="transition-all duration-300"
                style={{
                  opacity: isCompleted ? 1 : isCurrent ? 0.8 : 0.3,
                }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold">
            {currentStep + 1}/{totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
}
