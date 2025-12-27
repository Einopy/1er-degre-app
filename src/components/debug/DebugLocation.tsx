// src/components/debug/DebugLocation.tsx
import { useLocation } from 'react-router-dom';

export function DebugLocation() {
  const location = useLocation();

  console.log('[DebugLocation] render ->', location.pathname);

  return (
    <div className="fixed bottom-2 right-2 z-[9999] rounded bg-black/70 px-2 py-1 text-xs text-white">
      {location.pathname}
    </div>
  );
}