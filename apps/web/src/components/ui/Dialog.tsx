"use client";

import { twMerge } from "tailwind-merge";
import { useEffect, useRef } from "react";

let openDialogs = 0;
let previousOverflow = "";

/** Native modal behavior provides focus containment, outside inertness and focus restoration. */
export function Dialog({
  children,
  label,
  onDismiss,
  busy = false,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onDismiss: () => void;
  busy?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    if (openDialogs++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialog.showModal();
    return () => {
      dialog.close();
      if (--openDialogs === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ),
        ).filter(
          (element) =>
            element.getClientRects().length > 0 && element.tabIndex >= 0,
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onDismiss();
      }}
      className={twMerge(
        "workspace-dialog max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
