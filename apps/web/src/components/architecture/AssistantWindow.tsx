"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";

export function AssistantWindow({ children, minimized, onMinimize, onClose }: {
  children: ReactNode; minimized: boolean;
  onMinimize: (value: boolean) => void; onClose: () => void;
}) {
  const windowRef = useRef<HTMLElement>(null);
  const initialized = useRef(false);
  const [position, setPosition] = useState({ x: 8, y: 8 });
  const [size, setSize] = useState({ width: 400, height: 560 });
  const gesture = useRef<{ kind: "move" | "resize"; x: number; y: number; left: number; top: number; width: number; height: number } | null>(null);
  const constrain = useCallback((x: number, y: number, width: number, height: number) => {
    const area = windowRef.current?.parentElement;
    if (!area) return;
    const availableWidth = Math.max(1, area.clientWidth - 16), availableHeight = Math.max(1, area.clientHeight - 16);
    const boundedWidth = Math.min(Math.max(300, width), availableWidth);
    const boundedHeight = Math.min(Math.max(260, height), availableHeight);
    if (!minimized) setSize({ width: boundedWidth, height: boundedHeight });
    const visibleWidth = minimized ? Math.min(248, availableWidth) : boundedWidth;
    const visibleHeight = minimized ? 40 : boundedHeight;
    setPosition({ x: Math.min(Math.max(8, x), Math.max(8, area.clientWidth - visibleWidth - 8)), y: Math.min(Math.max(8, y), Math.max(8, area.clientHeight - visibleHeight - 8)) });
  }, [minimized]);
  useEffect(() => {
    const area = windowRef.current?.parentElement;
    if (!area) return;
    const update = () => {
      const visibleWidth = minimized ? 248 : size.width;
      const visibleHeight = minimized ? 40 : size.height;
      if (!initialized.current) {
        initialized.current = true;
        constrain(area.clientWidth - visibleWidth - 16, minimized ? area.clientHeight - 56 : 16, size.width, size.height);
      } else {
        setPosition(current => ({ x: Math.min(Math.max(8, current.x), Math.max(8, area.clientWidth - Math.min(visibleWidth, area.clientWidth - 16) - 8)), y: Math.min(Math.max(8, current.y), Math.max(8, area.clientHeight - Math.min(visibleHeight, area.clientHeight - 16) - 8)) }));
        if (!minimized) setSize(current => ({ width: Math.min(current.width, Math.max(1, area.clientWidth - 16)), height: Math.min(current.height, Math.max(1, area.clientHeight - 16)) }));
      }
    };
    update(); const observer = new ResizeObserver(update);
    observer.observe(area); return () => observer.disconnect();
  }, [minimized, size.width, size.height, constrain]);
  const start = (event: React.PointerEvent<HTMLElement>, kind: "move" | "resize") => {
    if (event.button !== 0 || (kind === "move" && (event.target as Element).closest("button"))) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { kind, x: event.clientX, y: event.clientY, left: position.x, top: position.y, width: size.width, height: size.height };
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const current = gesture.current; if (!current) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    constrain(current.left + (current.kind === "move" ? dx : 0), current.top + (current.kind === "move" ? dy : 0), current.width + (current.kind === "resize" ? dx : 0), current.height + (current.kind === "resize" ? dy : 0));
  };
  const stop = () => { gesture.current = null; };
  const keyMove = (event: React.KeyboardEvent<HTMLElement>, resize = false) => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault(); const step = event.shiftKey ? 40 : 20;
    constrain(position.x + (resize ? 0 : direction[0] * step), position.y + (resize ? 0 : direction[1] * step), size.width + (resize ? direction[0] * step : 0), size.height + (resize ? direction[1] * step : 0));
  };
  return <aside ref={windowRef} aria-label="Architecture assistant window" className="absolute z-20 flex flex-col min-h-0 overflow-hidden rounded-xl bg-white border border-slate-200 shadow-xl" style={{ left: position.x, top: position.y, width: minimized ? 248 : size.width, height: minimized ? 40 : size.height, maxWidth: "calc(100% - 16px)", maxHeight: "calc(100% - 16px)" }}>
    <div className="flex items-center gap-1 border-b bg-slate-50 px-2 h-10 shrink-0">
      <div role="button" tabIndex={0} aria-label="Move assistant window" title="Drag to move · Arrow keys also move" onPointerDown={event => start(event, "move")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onKeyDown={event => keyMove(event)} className="flex-1 flex items-center gap-2 py-2 text-xs font-semibold text-slate-700 touch-none cursor-move"><GripHorizontal className="w-4 h-4" /><span>Architecture AI</span></div>
      <button aria-label={minimized ? "Expand assistant window" : "Minimize assistant window"} title={minimized ? "Expand" : "Minimize"} aria-expanded={!minimized} onClick={() => onMinimize(!minimized)} className="p-1.5 rounded hover:bg-white">{minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
      <button aria-label="Close assistant window" onClick={onClose} className="p-1.5 rounded hover:bg-white"><X className="w-4 h-4" /></button>
    </div>
    <div className={`${minimized ? "hidden" : "flex"} flex-col flex-1 min-h-0`}>{children}</div>
    {!minimized && <button aria-label="Resize assistant window" title="Drag to resize · Arrow keys also resize" onPointerDown={event => start(event, "resize")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onKeyDown={event => keyMove(event, true)} className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize touch-none bg-white text-slate-500">◢</button>}
  </aside>;
}
