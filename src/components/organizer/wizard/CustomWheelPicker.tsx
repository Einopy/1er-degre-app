import * as React from "react";
import { cn } from "@/lib/utils";

interface WheelPickerOption {
  label: string;
  value: string;
}

interface CustomWheelPickerProps {
  options: WheelPickerOption[];
  value: string;
  onChange: (value: string) => void;
  itemHeight?: number;
  visibleItems?: number;
  className?: string;
}

export function CustomWheelPicker({
  options,
  value,
  onChange,
  itemHeight = 50,
  visibleItems = 5,
  className,
}: CustomWheelPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);
  const startYRef = React.useRef(0);
  const currentYRef = React.useRef(0);
  const velocityRef = React.useRef(0);
  const lastMoveTimeRef = React.useRef(0);
  const animationFrameRef = React.useRef<number>();
  const scrollAccumulatorRef = React.useRef(0);
  const scrollTimeoutRef = React.useRef<number>();

  const [currentIndex, setCurrentIndex] = React.useState(() => {
    const index = options.findIndex((opt) => opt.value === value);
    return index >= 0 ? index : 0;
  });

  const [offset, setOffset] = React.useState(0);

  const radius = (itemHeight * visibleItems) / Math.PI;
  const totalHeight = itemHeight * visibleItems;

  React.useEffect(() => {
    const index = options.findIndex((opt) => opt.value === value);
    if (index >= 0 && index !== currentIndex) {
      setCurrentIndex(index);
      setOffset(0);
    }
  }, [value, options, currentIndex]);

  const snapToIndex = React.useCallback(
    (targetIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(options.length - 1, targetIndex));
      setCurrentIndex(clampedIndex);
      setOffset(0);

      if (options[clampedIndex] && options[clampedIndex].value !== value) {
        onChange(options[clampedIndex].value);
      }
    },
    [options, onChange, value]
  );

  const animate = React.useCallback(() => {
    if (!isDraggingRef.current && Math.abs(velocityRef.current) > 0.1) {
      setOffset((prev) => {
        const newOffset = prev + velocityRef.current;
        const totalOffset = currentIndex * itemHeight + newOffset;

        if (totalOffset < 0 || totalOffset > (options.length - 1) * itemHeight) {
          velocityRef.current *= 0.8;
          if (Math.abs(velocityRef.current) < 0.1) {
            velocityRef.current = 0;
            return 0;
          }
        }

        return newOffset;
      });

      velocityRef.current *= 0.92;

      if (Math.abs(velocityRef.current) > 0.1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        velocityRef.current = 0;

        const totalOffset = currentIndex * itemHeight + offset;
        const targetIndex = Math.round(totalOffset / itemHeight);
        snapToIndex(targetIndex);
      }
    }
  }, [currentIndex, itemHeight, offset, options.length, snapToIndex]);

  const handleStart = React.useCallback((clientY: number) => {
    isDraggingRef.current = true;
    startYRef.current = clientY;
    currentYRef.current = clientY;
    velocityRef.current = 0;
    lastMoveTimeRef.current = Date.now();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const handleMove = React.useCallback(
    (clientY: number) => {
      if (!isDraggingRef.current) return;

      const now = Date.now();
      const deltaTime = now - lastMoveTimeRef.current;
      const deltaY = clientY - currentYRef.current;

      if (deltaTime > 0) {
        velocityRef.current = (deltaY / deltaTime) * 10;
      }

      currentYRef.current = clientY;
      lastMoveTimeRef.current = now;

      const totalDelta = startYRef.current - clientY;

      setOffset(() => {
        const newOffset = totalDelta;
        const totalOffset = currentIndex * itemHeight + newOffset;

        if (totalOffset < -itemHeight) {
          startYRef.current = clientY + itemHeight;
          setCurrentIndex((idx) => Math.max(0, idx - 1));
          return -itemHeight;
        }

        if (totalOffset > options.length * itemHeight) {
          startYRef.current = clientY - itemHeight;
          setCurrentIndex((idx) => Math.min(options.length - 1, idx + 1));
          return itemHeight;
        }

        return newOffset;
      });
    },
    [currentIndex, itemHeight, options.length]
  );

  const handleEnd = React.useCallback(() => {
    isDraggingRef.current = false;

    if (Math.abs(velocityRef.current) > 1) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      const totalOffset = currentIndex * itemHeight + offset;
      const targetIndex = Math.round(totalOffset / itemHeight);
      snapToIndex(targetIndex);
    }
  }, [animate, currentIndex, itemHeight, offset, snapToIndex]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        handleMove(e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        handleEnd();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        e.preventDefault();
        handleMove(e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      if (isDraggingRef.current) {
        handleEnd();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Accumulate scroll delta with sensitivity scaling
      const sensitivity = 0.4;
      scrollAccumulatorRef.current += e.deltaY * sensitivity;

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Calculate how many items to scroll based on accumulated delta
      const threshold = itemHeight;
      if (Math.abs(scrollAccumulatorRef.current) >= threshold) {
        const steps = Math.floor(Math.abs(scrollAccumulatorRef.current) / threshold);
        const direction = scrollAccumulatorRef.current > 0 ? 1 : -1;
        const targetIndex = Math.max(0, Math.min(options.length - 1, currentIndex + (direction * steps)));

        snapToIndex(targetIndex);

        // Reset accumulator to remainder
        scrollAccumulatorRef.current = scrollAccumulatorRef.current % threshold;
      }

      // Reset accumulator after a brief pause in scrolling
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollAccumulatorRef.current = 0;
      }, 150);
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("wheel", handleWheel);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleStart, handleMove, handleEnd, currentIndex, options.length, snapToIndex, itemHeight]);

  const renderItems = () => {
    const items = [];
    const centerIndex = currentIndex;
    const totalOffset = offset;

    const startIdx = Math.max(0, centerIndex - visibleItems);
    const endIdx = Math.min(options.length - 1, centerIndex + visibleItems);

    for (let i = startIdx; i <= endIdx; i++) {
      const option = options[i];
      if (!option) continue;

      const relativePosition = (i * itemHeight - currentIndex * itemHeight - totalOffset) / itemHeight;

      const angle = relativePosition * (180 / visibleItems);
      const translateZ = radius;
      const translateY = 0;
      const rotateX = -angle;

      const distanceFromCenter = Math.abs(relativePosition);
      const opacity = Math.max(0.1, 1 - distanceFromCenter * 0.35);
      const scale = Math.max(0.7, 1 - distanceFromCenter * 0.15);

      const isSelected = Math.abs(relativePosition) < 0.3;

      items.push(
        <div
          key={option.value}
          className={cn(
            "absolute left-0 right-0 flex items-center justify-center select-none transition-colors duration-200",
            isSelected ? "text-foreground font-semibold" : "text-muted-foreground font-light"
          )}
          style={{
            height: `${itemHeight}px`,
            top: `${totalHeight / 2 - itemHeight / 2}px`,
            transform: `rotateX(${rotateX}deg) translateZ(${translateZ}px) translateY(${translateY}px) scale(${scale})`,
            opacity,
            fontSize: isSelected ? "2rem" : "1.5rem",
            willChange: isDraggingRef.current ? "transform, opacity" : "auto",
          }}
        >
          {option.label}
        </div>
      );
    }

    return items;
  };

  return (
    <div className={cn("relative select-none touch-none", className)} style={{ height: `${totalHeight}px` }}>
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-grab active:cursor-grabbing"
        style={{
          perspective: "1000px",
          perspectiveOrigin: "center center",
        }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {renderItems()}
        </div>

        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${totalHeight / 2 - itemHeight / 2}px`,
            height: `${itemHeight}px`,
            background: "linear-gradient(to bottom, transparent, hsl(var(--accent) / 0.08) 20%, hsl(var(--accent) / 0.08) 80%, transparent)",
            borderRadius: "8px",
          }}
        />

        <div
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{
            height: `${totalHeight / 2 - itemHeight / 2}px`,
            background: "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)",
          }}
        />

        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{
            height: `${totalHeight / 2 - itemHeight / 2}px`,
            background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
