import { ChartNoAxesColumn, House, Settings2, ShieldCheck } from "lucide-react";

/** `accent` is the design token each section glows with when active. */
export const NAV = [
  { href: "/", label: "Overview", icon: House, accent: "var(--sun)" },
  { href: "/trends", label: "Trends", icon: ChartNoAxesColumn, accent: "var(--grid)" },
  { href: "/system", label: "My system", icon: ShieldCheck, accent: "var(--home)" },
  { href: "/settings", label: "Settings", icon: Settings2, accent: "var(--battery)" },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
