import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { getPreferences, getStation, getSyncInfo, getUnreadCount } from "@/lib/data/queries";
import { sunTimes } from "@/lib/energy/sun";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Solar Home", template: "%s · Solar Home" },
  description: "See what your solar panels, battery and home are doing, in plain words.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [station, prefs] = await Promise.all([getStation(), getPreferences()]);
  const [unread, sync] = await Promise.all([getUnreadCount(station.id), getSyncInfo(station.id)]);
  const sun = station.latitude !== null && station.longitude !== null ? sunTimes(new Date(), station.latitude, station.longitude) : null;

  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <ThemeProvider defaultTheme={prefs.theme}>
          <AppShell
            stationName={station.name}
            source={sync.source}
            unread={unread}
            lastSyncedAt={sync.lastSuccessAt?.toISOString() ?? null}
            syncError={sync.lastError}
            sunrise={sun?.sunrise.toISOString() ?? null}
            sunset={sun?.sunset.toISOString() ?? null}
          >
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
