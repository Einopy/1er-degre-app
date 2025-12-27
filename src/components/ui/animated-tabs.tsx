import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const AnimatedTabs = TabsPrimitive.Root;

interface AnimatedTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  showPill?: boolean;
  defaultValue?: string;
}

const AnimatedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  AnimatedTabsListProps
>(({ className, showPill = true, defaultValue, children, ...props }, ref) => {
  const [pillStyle, setPillStyle] = React.useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const [activeValue, setActiveValue] = React.useState<string | null>(defaultValue || null);

  const updatePillPosition = React.useCallback(() => {
    if (!showPill || !activeValue || !listRef.current) return;

    const activeElement = itemRefs.current.get(activeValue);
    if (!activeElement) return;

    const listRect = listRef.current.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    setPillStyle({
      left: activeRect.left - listRect.left,
      width: activeRect.width,
      opacity: 1,
    });
  }, [activeValue, showPill]);

  React.useEffect(() => {
    updatePillPosition();
  }, [updatePillPosition]);

  React.useEffect(() => {
    const handleResize = () => {
      updatePillPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePillPosition]);

  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === AnimatedTabsTrigger) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onValueChange: (value: string) => {
          setActiveValue(value);
          updatePillPosition();
        },
        registerRef: (value: string, element: HTMLButtonElement | null) => {
          if (element) {
            itemRefs.current.set(value, element);
          } else {
            itemRefs.current.delete(value);
          }
        },
      });
    }
    return child;
  });

  const combinedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [ref]
  );

  return (
    <TabsPrimitive.List
      ref={combinedRef}
      className={cn(
        'relative inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    >
      {showPill && (
        <div
          className="absolute top-1.5 bottom-1.5 rounded-md bg-background shadow-sm transition-all duration-300 ease-out"
          style={{
            left: `${pillStyle.left}px`,
            width: `${pillStyle.width}px`,
            opacity: pillStyle.opacity,
            willChange: 'left, width',
          }}
        />
      )}
      {enhancedChildren}
    </TabsPrimitive.List>
  );
});
AnimatedTabsList.displayName = 'AnimatedTabsList';

interface AnimatedTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  onValueChange?: (value: string) => void;
  registerRef?: (value: string, element: HTMLButtonElement | null) => void;
}

const AnimatedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  AnimatedTabsTriggerProps
>(({ className, value, onValueChange, registerRef, ...props }, ref) => {
  const localRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (value && registerRef) {
      registerRef(value as string, localRef.current);
    }
    return () => {
      if (value && registerRef) {
        registerRef(value as string, null);
      }
    };
  }, [value, registerRef]);

  const combinedRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      localRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    },
    [ref]
  );

  return (
    <TabsPrimitive.Trigger
      ref={combinedRef}
      value={value}
      onClick={() => {
        if (value && onValueChange) {
          onValueChange(value as string);
        }
      }}
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none',
        className
      )}
      {...props}
    />
  );
});
AnimatedTabsTrigger.displayName = 'AnimatedTabsTrigger';

const AnimatedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
AnimatedTabsContent.displayName = 'AnimatedTabsContent';

export { AnimatedTabs, AnimatedTabsList, AnimatedTabsTrigger, AnimatedTabsContent };
