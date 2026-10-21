"use client";

import { FlaskConical, Radio } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brand, BrandMark } from "./brand";
import { LiveSyncProvider } from "./live-sync";
import { isActive, NAV } from "./nav";
import { NotificationsButton } from "./notifications";
import { SkyBackdrop } from "./sky-backdrop";
import { SyncStatus } from "./sync-status";
import { ThemeToggle } from "./theme-toggle";

interface Props {
  children: React.ReactNode;
  stationName: string;
  source: "SOLARMAN" | "DEMO";
  unread: number;
  lastSyncedAt: string | null;
  syncError: string | null;
  sunrise: string | null;
  sunset: string | null;
}

export function AppShell({ children, stationName, source, unread, lastSyncedAt, syncError, sunrise, sunset }: Props) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <LiveSyncProvider initialSyncedAt={lastSyncedAt} initialError={syncError ? "Couldn't get the latest readings." : null}>
      <SkyBackdrop sunrise={sunrise} sunset={sunset} />
      <a href="#main" className="bg-ink text-page sr-only z-50 rounded-full px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>

      <div className="mx-auto flex min-h-dvh max-w-[1480px]">
        {/* Desktop sidebar: a floating glass panel */}
        <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 p-3 lg:flex">
          <div className="card relative flex w-full flex-col overflow-hidden px-4 py-5">
            <div aria-hidden className="bg-sun pointer-events-none absolute -top-20 -left-16 size-48 rounded-full opacity-[0.12] blur-3xl" />
            <div className="relative px-1">
              <Brand name={stationName} />
            </div>

            <nav aria-label="Main" className="relative mt-9 flex flex-col gap-1" onMouseLeave={() => setHovered(null)}>
              <p className="text-ink-3 mb-1.5 px-4 text-[10.5px] font-bold tracking-[0.14em] uppercase">Menu</p>
              {NAV.map(({ href, label, icon: Icon, accent }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onMouseEnter={() => setHovered(href)}
                    onFocus={() => setHovered(href)}
                    className={cn(
                      "group relative flex h-11 items-center gap-3 rounded-2xl px-4 text-[14px] font-semibold transition-colors",
                      active ? "text-ink" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    {hovered === href && !active && (
                      <motion.span
                        layoutId="nav-hover"
                        className="bg-surface-sunk/70 absolute inset-0 rounded-2xl"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="bg-surface absolute inset-0 rounded-2xl"
                        style={{
                          boxShadow: `0 0 0 1px color-mix(in oklab, ${accent} 30%, var(--line)), 0 10px 28px -12px color-mix(in oklab, ${accent} 70%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.06)`,
                        }}
                        transition={{ type: "spring", stiffness: 480, damping: 40 }}
                      >
                        <span
                          className="absolute top-1/2 -left-px h-5 w-[3px] -translate-y-1/2 rounded-full"
                          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
                        />
                      </motion.span>
                    )}
                    <motion.span
                      className="relative grid"
                      whileHover={reduce ? undefined : { scale: 1.15, rotate: -6 }}
                      transition={{ type: "spring", stiffness: 400, damping: 12 }}
                      style={{ color: active ? accent : undefined }}
                    >
                      <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                    </motion.span>
                    <span className="relative">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative mt-auto space-y-3">
              <SourceBadge source={source} />
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          {/* Floating glass capsule: invisible at the top of the page, condenses into a pill once you scroll. */}
          <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 lg:px-6">
            <div
              data-scrolled={scrolled || undefined}
              className={cn(
                "relative flex h-14 items-center gap-3 rounded-[22px] border px-3 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out-soft sm:px-4 lg:h-16 lg:px-3",
                scrolled
                  ? "border-line/70 bg-surface/70 shadow-[0_1px_0_rgb(255_255_255/0.05)_inset,0_18px_40px_-20px_rgb(0_0_0/0.55)] backdrop-blur-2xl backdrop-saturate-150"
                  : "border-transparent bg-transparent",
              )}
            >
              {/* Hairline highlight along the top edge, only while condensed */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--gilt-2)_55%,transparent),transparent)] transition-opacity duration-500",
                  scrolled ? "opacity-100" : "opacity-0",
                )}
              />
              <Link href="/" className="lg:hidden" aria-label="Solar Home, go to overview">
                <BrandMark className="size-9" />
              </Link>
              <SyncStatus className="min-w-0 flex-1" />
              {source === "DEMO" && (
                <span className="bg-sun-soft text-sun-ink hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex lg:hidden">
                  <FlaskConical className="size-3.5" /> Sample data
                </span>
              )}
              <NotificationsButton unread={unread} />
            </div>
          </header>

          {source === "DEMO" && (
            <div className="border-sun/25 bg-sun-soft/70 text-sun-ink relative mx-4 mb-2 flex items-center gap-2.5 overflow-hidden rounded-2xl border px-4 py-2.5 text-[13px] backdrop-blur-xl sm:mx-6 lg:mx-8">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/20 [animation:shimmer-sweep_7s_ease-in-out_infinite] motion-reduce:hidden" />
              <FlaskConical className="relative size-4 shrink-0" />
              <span className="relative">
                You&apos;re looking at <strong>sample data</strong> from a made-up home. Connect your Solarman account in <code className="text-xs">.env</code>{" "}
                to see your own system.
              </span>
            </div>
          )}

          <main id="main" className="flex-1 px-4 pt-2 pb-28 sm:px-6 lg:px-8 lg:pb-12">
            {/* Soft fade-up between pages; keyed on the route so each page enters fresh. No filter here:
                it would make this wrapper a backdrop root and the cards' frosted glass would stop seeing the sky. */}
            <motion.div
              key={pathname}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="border-line bg-surface/75 shadow-pop fixed inset-x-3 bottom-3 z-40 rounded-[26px] border p-1.5 [padding-bottom:max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map(({ href, label, icon: Icon, accent }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-14 flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] font-semibold transition-colors",
                    active ? "text-ink" : "text-ink-3",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-[20px]"
                      style={{
                        background: `color-mix(in oklab, ${accent} 12%, var(--surface-sunk))`,
                        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 25%, transparent)`,
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <motion.span
                    className="relative grid"
                    animate={active && !reduce ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }}
                    whileTap={reduce ? undefined : { scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    style={{ color: active ? accent : undefined }}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                  </motion.span>
                  <span className="relative">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </LiveSyncProvider>
  );
}

function SourceBadge({ source }: { source: "SOLARMAN" | "DEMO" }) {
  if (source === "DEMO") {
    return (
      <div className="border-sun/20 bg-sun-soft/40 rounded-2xl border p-3.5">
        <p className="text-sun-ink flex items-center gap-2 text-[13px] font-semibold">
          <FlaskConical className="size-4" /> Sample data
        </p>
        <p className="text-ink-3 mt-1 text-xs leading-relaxed">Numbers come from a made-up home, not a real system.</p>
      </div>
    );
  }
  return (
    <div className="border-line bg-surface-2/60 relative overflow-hidden rounded-2xl border p-3.5">
      <p className="flex items-center gap-2 text-[13px] font-semibold">
        <span className="relative grid size-4 place-items-center">
          <span className="bg-good absolute size-4 animate-ping rounded-full opacity-20 [animation-duration:2.6s] motion-reduce:hidden" />
          <Radio className="text-good-ink relative size-4" />
        </span>
        Live from your inverter
      </p>
      <p className="text-ink-3 mt-1 text-xs leading-relaxed">Readings arrive about every 5 minutes through Solarman.</p>
    </div>
  );
}
