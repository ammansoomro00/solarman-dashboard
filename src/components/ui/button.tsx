import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,color,box-shadow,transform,translate] duration-200 ease-out-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "relative overflow-hidden bg-ink text-page shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_8px_20px_-10px_var(--ink)] hover:-translate-y-px hover:shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_12px_28px_-10px_var(--ink)] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:-translate-x-[120%] before:skew-x-[-18deg] before:bg-white/20 before:transition-transform before:duration-700 hover:before:translate-x-[260%]",
        secondary: "border border-line bg-surface/70 text-ink backdrop-blur-xl hover:border-line-strong hover:bg-surface",
        ghost: "text-ink-2 hover:bg-surface-sunk/80 hover:text-ink",
        sun: "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sun)_70%,white),var(--sun))] text-[#1b1914] shadow-[0_8px_24px_-10px_var(--sun)] hover:-translate-y-px hover:brightness-105",
      },
      size: {
        sm: "h-8 rounded-full px-3 text-[13px]",
        md: "h-10 rounded-full px-4 text-sm",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
