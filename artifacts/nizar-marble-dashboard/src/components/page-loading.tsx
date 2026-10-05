import { Loader2 } from 'lucide-react';

export function PageLoading({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-20 text-[#5F6B76]"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-[#9B8C77]" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function LoadingBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="no-print fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-[#E7E5E0]">
      <div className="h-full w-1/3 animate-[loading-bar_1s_ease-in-out_infinite] bg-[#9B8C77]" />
    </div>
  );
}
