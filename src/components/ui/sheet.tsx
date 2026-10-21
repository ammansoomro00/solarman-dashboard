"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";

/** Slide-over panel: from the right on desktop, from the bottom on phones. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[#0b0a08]/35 backdrop-blur-[6px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "bg-surface/85 shadow-pop fixed z-50 flex flex-col overflow-hidden outline-none backdrop-blur-2xl backdrop-saturate-150",
                  "border-line inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[28px] border-t",
                  "sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[420px] sm:rounded-[28px] sm:border",
                  className,
                )}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              >
                <span aria-hidden className="bg-sun pointer-events-none absolute -top-24 -right-16 size-56 rounded-full opacity-[0.12] blur-3xl" />
                <div className="relative flex items-start justify-between gap-4 px-6 pt-6 pb-4">
                  <div>
                    <Dialog.Title className="text-lg font-bold tracking-tight">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="text-ink-2 mt-1 text-sm">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close className="border-line text-ink-2 hover:bg-surface-sunk hover:text-ink grid size-9 shrink-0 place-items-center rounded-full border transition-[background-color,color,transform] hover:rotate-90">
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                  </Dialog.Close>
                </div>
                <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
