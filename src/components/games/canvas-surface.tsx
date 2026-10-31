"use client";
import { useEffect, useRef, type PointerEvent } from "react";
export type CanvasPoint = { x: number; y: number; pressure: number };
export function CanvasSurface({
  label,
  className,
  onReady,
  onPoint,
}: {
  label: string;
  className?: string;
  onReady?: (canvas: HTMLCanvasElement) => void | (() => void);
  onPoint?: (point: CanvasPoint) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return onReady?.(canvas);
  }, [onReady]);
  function handlePointer(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    onPoint?.({
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
      pressure: event.pressure,
    });
  }
  return (
    <canvas
      ref={ref}
      aria-label={label}
      role="img"
      className={className}
      onPointerDown={handlePointer}
      onPointerMove={(event) => {
        if (event.buttons) handlePointer(event);
      }}
    />
  );
}
