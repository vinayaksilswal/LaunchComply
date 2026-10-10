"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GripHorizontal, Maximize2, Minimize2, PanelLeft, PanelRight, Move, X } from "lucide-react";

export type AssistantDock = "left" | "right" | "floating";
export function AssistantWindow({ children, dock, minimized, maximized, onDock, onMinimize, onMaximize, onClose }: {
  children: ReactNode; dock: AssistantDock; minimized: boolean; maximized: boolean;
  onDock: (dock: AssistantDock) => void; onMinimize: (value: boolean) => void; onMaximize: (value: boolean) => void; onClose: () => void;
}) {
  const windowRef = useRef<HTMLElement>(null);
  const [desktop, setDesktop] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 16 });
  const [size, setSize] = useState({ width: 380, height: 560 });
  const gesture = useRef<{ kind: "move" | "resize"; x: number; y: number; left: number; top: number; width: number; height: number } | null>(null);
  const floating = desktop && dock === "floating" && !minimized && !maximized;
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const constrain = (x: number, y: number, width = size.width, height = size.height) => {
    const area = windowRef.current?.parentElement;
    if (!area) return;
    const boundedWidth = Math.min(Math.max(300, width), Math.max(300, area.clientWidth - 16));
    const boundedHeight = Math.min(Math.max(260, height), Math.max(260, area.clientHeight - 16));
    setSize({ width: boundedWidth, height: boundedHeight });
    setPosition({ x: Math.min(Math.max(8, x), Math.max(8, area.clientWidth - boundedWidth - 8)), y: Math.min(Math.max(8, y), Math.max(8, area.clientHeight - boundedHeight - 8)) });
  };
  useEffect(() => {
    const area = windowRef.current?.parentElement;
    if (!area || !floating) return;
    // Re-clamp on viewport changes so the header and controls remain reachable.
    const observer = new ResizeObserver(() => {
      const width = Math.min(size.width, Math.max(300, area.clientWidth - 16));
      const height = Math.min(size.height, Math.max(260, area.clientHeight - 16));
      setSize({ width, height });
      setPosition(current => ({ x: Math.min(current.x, Math.max(8, area.clientWidth - width - 8)), y: Math.min(current.y, Math.max(8, area.clientHeight - height - 8)) }));
    });
    observer.observe(area); return () => observer.disconnect();
  }, [floating, size.width, size.height]);
  const start = (event: React.PointerEvent<HTMLElement>, kind: "move" | "resize") => {
    if (!floating || event.button !== 0 || (kind === "move" && (event.target as Element).closest("button"))) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { kind, x: event.clientX, y: event.clientY, left: position.x, top: position.y, width: size.width, height: size.height };
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const current = gesture.current; if (!current) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (current.kind === "move") constrain(current.left + dx, current.top + dy, current.width, current.height);
    else constrain(current.left, current.top, current.width + dx, current.height + dy);
  };
  const stop = () => { gesture.current = null; };
  const placement = minimized ? "absolute bottom-3 right-3 w-64 rounded-xl shadow-xl"
    : maximized ? "absolute inset-2 rounded-xl shadow-xl"
    : floating ? "absolute rounded-xl shadow-xl"
    : `absolute inset-y-0 right-0 w-full md:static md:w-auto ${dock === "left" ? "md:order-first border-r" : "border-l"}`;
  return <aside ref={windowRef} aria-label="Architecture assistant window" className={`${placement} z-20 flex flex-col min-h-0 overflow-hidden bg-white border-slate-200 border`} style={floating ? { left: position.x, top: position.y, width: size.width, height: size.height, maxWidth: "calc(100% - 16px)", maxHeight: "calc(100% - 16px)" } : undefined}>
    {minimized ? <div className="flex items-center justify-between p-2"><button onClick={() => onMinimize(false)} className="text-xs font-semibold text-cyan-800">Restore architecture assistant</button><button aria-label="Close assistant window" onClick={onClose} className="p-1"><X className="w-4 h-4" /></button></div> :
      <div className="flex items-center justify-between gap-1 border-b bg-slate-50 px-2 py-1.5 shrink-0">
        <div role={floating ? "button" : undefined} tabIndex={floating ? 0 : undefined} aria-label={floating ? "Move assistant window" : undefined} title={floating ? "Drag to move · Arrow keys also move" : "Float the assistant to move it"} onPointerDown={event => start(event, "move")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onKeyDown={event => { if (!floating || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); constrain(position.x + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0), position.y + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0)); }} className={`flex-1 flex items-center gap-1 py-1 text-[10px] text-slate-500 touch-none ${floating ? "cursor-move" : ""}`}><GripHorizontal className="w-4 h-4" /><span>Assistant</span></div>
        {desktop && <><button aria-label="Dock assistant left" title="Dock left" aria-pressed={dock === "left" && !maximized} onClick={() => { onDock("left"); onMaximize(false); }} className="p-1.5 rounded hover:bg-white"><PanelLeft className="w-3.5 h-3.5" /></button><button aria-label="Dock assistant right" title="Dock right" aria-pressed={dock === "right" && !maximized} onClick={() => { onDock("right"); onMaximize(false); }} className="p-1.5 rounded hover:bg-white"><PanelRight className="w-3.5 h-3.5" /></button><button aria-label="Float assistant window" title="Float and drag" aria-pressed={floating} onClick={() => { onDock("floating"); onMaximize(false); constrain(position.x, position.y); }} className="p-1.5 rounded hover:bg-white"><Move className="w-3.5 h-3.5" /></button></>}
        <button aria-label="Minimize assistant window" title="Minimize" onClick={() => onMinimize(true)} className="p-1.5 rounded hover:bg-white"><Minimize2 className="w-3.5 h-3.5" /></button>
        <button aria-label={maximized ? "Restore assistant window size" : "Maximize assistant window"} title={maximized ? "Restore size" : "Maximize"} onClick={() => onMaximize(!maximized)} className="p-1.5 rounded hover:bg-white"><Maximize2 className="w-3.5 h-3.5" /></button>
      </div>}
    <div className={`${minimized ? "hidden" : "flex"} flex-col flex-1 min-h-0`}>{children}</div>
    {floating && <button aria-label="Resize assistant window" title="Drag to resize · Arrow keys also resize" onPointerDown={event => start(event, "resize")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); constrain(position.x, position.y, size.width + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0), size.height + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0)); }} className="absolute bottom-0 right-0 h-5 w-5 cursor-se-resize touch-none bg-white text-slate-400">◢</button>}
  </aside>;
}
