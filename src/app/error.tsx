"use client";

import { CloudOff, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reduce = useReducedMotion();
  const dbDown = /database|prisma|ECONNREFUSED|can't reach/i.test(error.message);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className="card relative mx-auto mt-8 grid max-w-lg place-items-center overflow-hidden px-6 py-16 text-center"
    >
      <div aria-hidden className="bg-bad pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl" />
      <span className="relative grid size-20 place-items-center">
        {!reduce && (
          <motion.span
            className="border-bad/40 absolute inset-0 rounded-full border"
            animate={{ scale: [0.8, 1.3], opacity: [0.8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <motion.span
          className="border-line bg-surface-2 text-bad-ink relative grid size-14 place-items-center rounded-full border"
          animate={reduce ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <CloudOff className="size-6" />
        </motion.span>
      </span>
      <h1 className="relative mt-5 text-xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-ink-2 relative mt-2 max-w-sm text-sm leading-relaxed">
        {dbDown
          ? "We couldn't reach the database. Make sure it's running (npm run db:up) and try again."
          : "This page couldn't be loaded. Your data is safe; please try again."}
      </p>
      <Button className="group mt-6" variant="primary" onClick={reset}>
        <RotateCcw className="transition-transform duration-500 group-hover:-rotate-180" />
        Try again
      </Button>
      {error.digest && <p className="text-ink-3 relative mt-4 text-xs">Reference: {error.digest}</p>}
    </motion.div>
  );
}
