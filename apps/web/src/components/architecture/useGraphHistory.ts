"use client";
import { useCallback, useRef, useState } from "react";
import type { ArchitectureGraph } from "./CloudDiagram";

const same = (a: ArchitectureGraph, b: ArchitectureGraph) => JSON.stringify(a) === JSON.stringify(b);
const LIMIT = 80;

/** Session-local draft history. Server/source refreshes start a new history. */
export function useGraphHistory() {
  const [graph, render] = useState<ArchitectureGraph>({ nodes: [], edges: [] });
  const [, refresh] = useState(0);
  const state = useRef({ present: graph, past: [] as ArchitectureGraph[], future: [] as ArchitectureGraph[], group: null as ArchitectureGraph | null });
  const endEdit = useCallback(() => {
    const s = state.current;
    if (s.group && !same(s.group, s.present)) {
      s.past = [...s.past, s.group].slice(-LIMIT);
      s.future = [];
    }
    s.group = null;
    refresh(value => value + 1);
  }, []);
  const beginEdit = useCallback(() => {
    if (!state.current.group) state.current.group = state.current.present;
  }, []);
  const setGraph = useCallback((action: ArchitectureGraph | ((current: ArchitectureGraph) => ArchitectureGraph)) => {
    const s = state.current;
    const next = typeof action === "function" ? action(s.present) : action;
    if (same(s.present, next)) return;
    if (!s.group) s.past = [...s.past, s.present].slice(-LIMIT);
    s.future = [];
    s.present = next;
    render(next);
  }, []);
  const resetGraph = useCallback((next: ArchitectureGraph) => {
    state.current = { present: next, past: [], future: [], group: null };
    render(next);
    refresh(value => value + 1);
  }, []);
  const undo = useCallback(() => {
    endEdit();
    const s = state.current;
    const next = s.past.pop();
    if (!next) return;
    s.future = [...s.future, s.present].slice(-LIMIT);
    s.present = next;
    render(next);
    return next;
  }, [endEdit]);
  const redo = useCallback(() => {
    endEdit();
    const s = state.current;
    const next = s.future.pop();
    if (!next) return;
    s.past = [...s.past, s.present].slice(-LIMIT);
    s.present = next;
    render(next);
    return next;
  }, [endEdit]);
  return { graph, setGraph, resetGraph, beginEdit, endEdit, undo, redo,
    canUndo: state.current.past.length > 0 || !!(state.current.group && !same(state.current.group, graph)),
    canRedo: state.current.future.length > 0 };
}
