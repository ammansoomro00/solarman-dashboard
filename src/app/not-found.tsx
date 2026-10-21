import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card relative mx-auto mt-8 grid max-w-lg place-items-center overflow-hidden px-6 py-16 text-center">
      {/* A sun that has set below the horizon */}
      <div aria-hidden className="bg-sun pointer-events-none absolute top-6 left-1/2 size-64 -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl" />
      <div aria-hidden className="relative h-16 w-40 overflow-hidden">
        <span className="absolute top-8 left-1/2 size-20 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_40%_35%,color-mix(in_oklab,var(--sun)_45%,white),var(--sun)_60%)] shadow-[0_0_40px_var(--sun)]" />
        <span className="bg-line-strong absolute right-0 bottom-0 left-0 h-px" />
      </div>
      <p className="tabular text-display relative mt-4 bg-[linear-gradient(120deg,var(--gilt-1),var(--gilt-2))] bg-clip-text font-bold text-transparent">404</p>
      <h1 className="relative mt-3 text-xl font-bold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="text-ink-2 relative mt-2 text-sm">It may have moved. Head back to the overview to see your system.</p>
      <Link
        href="/"
        className="group bg-ink text-page relative mt-6 inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-[0_8px_20px_-10px_var(--ink)] transition-transform hover:-translate-y-px"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Go to overview
      </Link>
    </div>
  );
}
