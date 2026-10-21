"use client";

import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "@/lib/utils";

/** On: a glowing green track; the thumb springs across with a little overshoot. */
export function Switch({ className, ...props }: React.ComponentProps<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root
      className={cn(
        "group bg-line-strong relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-[background-color,box-shadow] duration-300 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--home)_75%,white),var(--home))] data-[state=checked]:shadow-[0_0_0_1px_color-mix(in_oklab,var(--home)_40%,transparent),0_4px_16px_-4px_var(--home)]",
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="bg-surface pointer-events-none block size-5 translate-x-0.5 rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[translate,width] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:w-6 data-[state=checked]:translate-x-[20px] group-active:data-[state=checked]:translate-x-[16px]" />
    </RadixSwitch.Root>
  );
}
