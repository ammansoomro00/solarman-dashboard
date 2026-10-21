import type { Metadata } from "next";
import { CardsSettings } from "@/components/settings/cards-settings";
import { PricesForm } from "@/components/settings/prices-form";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { getPreferences } from "@/lib/data/queries";
import { normalizeCards } from "@/lib/preferences";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const prefs = await getPreferences();
  return (
    <>
      <div className="mb-6 lg:mb-8">
        <p className="text-ink-3 text-[11px] font-bold tracking-[0.14em] uppercase">Make it yours</p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-tight sm:text-[34px]">
          Settings
          <span className="bg-[linear-gradient(100deg,var(--battery),var(--grid))] bg-clip-text text-transparent">.</span>
        </h1>
        <p className="text-ink-2 mt-1 max-w-xl text-sm">Set your electricity prices so savings are accurate, and choose what you see on the overview.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-4 lg:col-span-7 lg:space-y-5">
          <PricesForm
            initial={{
              pricePerUnit: prefs.pricePerUnit,
              sellPricePerUnit: prefs.sellPricePerUnit,
              currency: prefs.currency,
              co2KgPerUnit: prefs.co2KgPerUnit,
            }}
          />
          <AppearanceSettings />
        </div>
        <div className="lg:col-span-5">
          <CardsSettings initial={normalizeCards(prefs.overviewCards)} />
        </div>
      </div>
    </>
  );
}
