"use client";

import { Check, ChevronDown, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { savePreferences, type PreferenceInput } from "@/app/actions";
import { Card, CardHeader } from "@/components/overview/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { moneyText } from "@/lib/format";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { value: "PKR", label: "Pakistani rupee (Rs)" },
  { value: "INR", label: "Indian rupee (₹)" },
  { value: "AED", label: "UAE dirham (AED)" },
  { value: "USD", label: "US dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British pound (£)" },
];

type Values = { pricePerUnit: number; sellPricePerUnit: number; currency: string; co2KgPerUnit: number };

export function PricesForm({ initial }: { initial: Values }) {
  const [values, setValues] = useState({
    pricePerUnit: String(initial.pricePerUnit),
    sellPricePerUnit: String(initial.sellPricePerUnit),
    currency: initial.currency,
    co2KgPerUnit: String(initial.co2KgPerUnit),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    values.pricePerUnit !== String(initial.pricePerUnit) ||
    values.sellPricePerUnit !== String(initial.sellPricePerUnit) ||
    values.currency !== initial.currency ||
    values.co2KgPerUnit !== String(initial.co2KgPerUnit);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
    setStatus("idle");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await savePreferences(values as PreferenceInput);
      if (res.ok) {
        setStatus("saved");
        setErrors({});
        setFormError(null);
      } else {
        setStatus("error");
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    });
  };

  return (
    <Card aria-labelledby="prices-title">
      <CardHeader id="prices-title" title="Electricity prices" />
      <p className="text-ink-2 mt-1 text-[13px]">
        Used to work out how much money your solar system saves you. Check your latest electricity bill for the price per unit.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pricePerUnit" label="What you pay per unit" hint="Total bill amount ÷ units used, including taxes." error={errors.pricePerUnit}>
            <input
              id="pricePerUnit"
              inputMode="decimal"
              value={values.pricePerUnit}
              onChange={set("pricePerUnit")}
              aria-invalid={!!errors.pricePerUnit}
              aria-describedby="pricePerUnit-hint pricePerUnit-error"
              className={inputClass(!!errors.pricePerUnit)}
            />
          </Field>
          <Field id="sellPricePerUnit" label="What you earn per unit sold" hint="Put 0 if you don't have net metering." error={errors.sellPricePerUnit}>
            <input
              id="sellPricePerUnit"
              inputMode="decimal"
              value={values.sellPricePerUnit}
              onChange={set("sellPricePerUnit")}
              aria-invalid={!!errors.sellPricePerUnit}
              aria-describedby="sellPricePerUnit-hint sellPricePerUnit-error"
              className={inputClass(!!errors.sellPricePerUnit)}
            />
          </Field>
        </div>
        <SavingsPreview price={Number(values.pricePerUnit)} currency={values.currency} />

        <Field id="currency" label="Currency" error={errors.currency}>
          <div className="relative">
            <select id="currency" value={values.currency} onChange={set("currency")} className={cn(inputClass(!!errors.currency), "appearance-none pr-10")}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="text-ink-3 pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
          </div>
        </Field>

        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          aria-expanded={advanced}
          className="text-ink-2 hover:text-ink flex items-center gap-1.5 text-[13px] font-semibold"
        >
          <ChevronDown className={cn("size-4 transition-transform", advanced && "rotate-180")} />
          Advanced
        </button>
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <Field
                id="co2KgPerUnit"
                label="Pollution avoided per solar unit (kg of CO₂)"
                hint="Around 0.45 kg for Pakistan's grid. Only change this if you know your local figure."
                error={errors.co2KgPerUnit}
              >
                <input
                  id="co2KgPerUnit"
                  inputMode="decimal"
                  value={values.co2KgPerUnit}
                  onChange={set("co2KgPerUnit")}
                  aria-invalid={!!errors.co2KgPerUnit}
                  aria-describedby="co2KgPerUnit-hint co2KgPerUnit-error"
                  className={inputClass(!!errors.co2KgPerUnit)}
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={pending || !dirty}>
            {pending ? "Saving…" : "Save prices"}
          </Button>
          <AnimatePresence>
            {status === "saved" && !dirty && (
              <motion.p
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-good-ink flex items-center gap-1.5 text-[13px] font-semibold"
                role="status"
              >
                <Check className="size-4" /> Saved
              </motion.p>
            )}
            {status === "error" && formError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-bad-ink text-[13px] font-semibold" role="alert">
                {formError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </form>
    </Card>
  );
}

function inputClass(invalid: boolean) {
  return cn(
    "h-11 w-full rounded-2xl border bg-surface/70 px-4 text-[15px] font-semibold text-ink tabular backdrop-blur-xl transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-ink-3 focus-visible:outline-none",
    invalid
      ? "border-bad shadow-[0_0_0_4px_color-mix(in_oklab,var(--bad)_15%,transparent)]"
      : "border-line hover:border-line-strong focus:border-[color-mix(in_oklab,var(--sun)_70%,var(--line))] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--sun)_16%,transparent),0_8px_24px_-12px_var(--sun)]",
  );
}

/** Shows what the entered price means in money, so the number feels real while typing. */
function SavingsPreview({ price, currency }: { price: number; currency: string }) {
  // A typical sunny day for a home system, used only to make the price tangible.
  const DAY_UNITS = 20;
  const valid = Number.isFinite(price) && price > 0;
  return (
    <AnimatePresence initial={false}>
      {valid && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="border-sun/25 bg-sun-soft/50 relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3">
            <span aria-hidden className="bg-sun pointer-events-none absolute -top-8 -left-6 size-24 rounded-full opacity-20 blur-2xl" />
            <Sparkles className="text-sun-ink relative size-4 shrink-0" />
            <p className="text-ink-2 relative text-[13px] leading-snug">
              At this price, a sunny day of {DAY_UNITS} units from your panels is worth about{" "}
              <strong className="text-ink tabular">
                <AnimatedNumber value={price * DAY_UNITS} format={(n) => moneyText(n, currency)} />
              </strong>
              .
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-ink-2 mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-bad-ink mt-1.5 text-xs font-semibold">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-ink-3 mt-1.5 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
