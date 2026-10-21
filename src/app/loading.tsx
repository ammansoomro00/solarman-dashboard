/** Mirrors the overview layout so nothing jumps when content arrives. Glass blocks with a light sweep. */
export default function Loading() {
  return (
    <div aria-busy aria-label="Loading">
      <div className="mb-8 space-y-2">
        <Bar className="h-4 w-40" />
        <Bar className="h-9 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <Block className="h-[560px] md:col-span-2 lg:col-span-8 lg:row-span-2" glow="var(--sun)" delay={0} />
        <Block className="h-[270px] lg:col-span-4" glow="var(--battery)" delay={0.15} />
        <Block className="h-[270px] lg:col-span-4" glow="var(--home)" delay={0.3} />
        <Block className="h-[380px] md:col-span-2 lg:col-span-8" glow="var(--grid)" delay={0.45} />
        <Block className="h-[380px] md:col-span-2 lg:col-span-4" glow="var(--sun)" delay={0.6} />
      </div>
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return (
    <div className={`bg-surface-sunk/70 relative overflow-hidden rounded-full ${className}`}>
      <Sweep delay={0} />
    </div>
  );
}

function Block({ className, glow, delay }: { className: string; glow: string; delay: number }) {
  return (
    <div className={`card relative overflow-hidden ${className}`}>
      <div className="absolute -top-20 -left-16 size-64 rounded-full opacity-[0.10] blur-3xl" style={{ background: glow }} />
      <div className="relative space-y-3 p-6">
        <div className="bg-surface-sunk/80 h-3 w-24 rounded-full" />
        <div className="bg-surface-sunk/80 h-6 w-2/3 rounded-full" />
      </div>
      <Sweep delay={delay} />
    </div>
  );
}

function Sweep({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--ink)_6%,transparent)] to-transparent [animation:shimmer-sweep_1.8s_ease-in-out_infinite]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
