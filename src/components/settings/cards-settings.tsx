"use client";

import { ArrowDown, ArrowUp, Check, GripVertical } from "lucide-react";
import { AnimatePresence, motion, Reorder, useDragControls, useReducedMotion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import { saveOverviewCards } from "@/app/actions";
import { Card, CardHeader } from "@/components/overview/card";
import { Switch } from "@/components/ui/switch";
import { CARD_IDS, CARD_LABELS, type CardId } from "@/lib/preferences";
import { cn } from "@/lib/utils";

/**
 * Show/hide and reorder overview cards (drag the grip, or use the arrows). Changes
 * apply immediately (optimistic) and are saved in the background; a failed save rolls back.
 */
export function CardsSettings({ initial }: { initial: CardId[] }) {
  const [saved, setSaved] = useState<CardId[]>(initial);
  const [cards, setOptimistic] = useOptimistic(saved);
  const [dragOrder, setDragOrder] = useState<CardId[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [, startTransition] = useTransition();

  const visible = dragOrder ?? cards;
  const hidden = CARD_IDS.filter((id) => !visible.includes(id));

  const commit = (next: CardId[]) =>
    startTransition(async () => {
      setOptimistic(next);
      setError(null);
      const res = await saveOverviewCards(next);
      if (res.ok) {
        setSaved(next);
        setFlash(true);
        window.setTimeout(() => setFlash(false), 1400);
      } else {
        setError(res.error);
      }
    });

  const toggle = (id: CardId, on: boolean) => commit(on ? [...cards, id] : cards.filter((c) => c !== id));
  const move = (id: CardId, dir: -1 | 1) => {
    const i = cards.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const endDrag = () => {
    if (dragOrder && dragOrder.join() !== cards.join()) commit(dragOrder);
    setDragOrder(null);
  };

  return (
    <Card id="cards" className="scroll-mt-24" aria-labelledby="cards-title">
      <CardHeader
        id="cards-title"
        title="Overview cards"
        action={
          <AnimatePresence>
            {flash && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="text-good-ink bg-home-soft flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                role="status"
              >
                <Check className="size-3.5" /> Saved
              </motion.span>
            )}
          </AnimatePresence>
        }
      />
      <p className="text-ink-2 mt-1 text-[13px]">Choose which cards appear on the overview. Drag to change their order.</p>
      {error && (
        <p className="rounded-tile bg-sun-soft text-sun-ink mt-3 px-4 py-2.5 text-[13px]" role="alert">
          {error}
        </p>
      )}

      <Reorder.Group axis="y" values={visible} onReorder={setDragOrder} className="mt-4 space-y-2">
        {visible.map((id, i) => (
          <VisibleRow
            key={id}
            id={id}
            first={i === 0}
            last={i === visible.length - 1}
            onMove={(dir) => move(id, dir)}
            onToggle={(on) => toggle(id, on)}
            onDragStart={() => setDragOrder(cards)}
            onDragEnd={endDrag}
          />
        ))}
      </Reorder.Group>

      {hidden.length > 0 && (
        <>
          <p className="text-ink-3 mt-5 mb-2 text-[10.5px] font-bold tracking-[0.14em] uppercase">Hidden</p>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {hidden.map((id) => (
                <motion.li
                  layout
                  key={id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", stiffness: 500, damping: 42 }}
                  className="border-line flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3"
                >
                  <span className="w-6" />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-3 text-sm font-semibold">{CARD_LABELS[id].title}</p>
                    <p className="text-ink-3 truncate text-xs">{CARD_LABELS[id].description}</p>
                  </div>
                  <Switch checked={false} onCheckedChange={(on) => toggle(id, on)} aria-label={`Show ${CARD_LABELS[id].title}`} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </Card>
  );
}

function VisibleRow({
  id,
  first,
  last,
  onMove,
  onToggle,
  onDragStart,
  onDragEnd,
}: {
  id: CardId;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggle: (on: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const reduce = useReducedMotion();
  const label = CARD_LABELS[id];

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={reduce ? undefined : { scale: 1.03, boxShadow: "0 20px 40px -16px rgb(0 0 0 / 0.35)", zIndex: 10 }}
      transition={{ type: "spring", stiffness: 500, damping: 42 }}
      className="border-line bg-surface/80 relative flex items-center gap-2 rounded-2xl border px-2 py-3 backdrop-blur-xl"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        aria-hidden
        tabIndex={-1}
        className="text-ink-3 hover:text-ink grid h-10 w-6 cursor-grab touch-none place-items-center rounded-md active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={first}
          aria-label={`Move ${label.title} up`}
          className="text-ink-3 hover:bg-surface-sunk hover:text-ink grid size-5 place-items-center rounded-md disabled:opacity-25"
        >
          <ArrowUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={last}
          aria-label={`Move ${label.title} down`}
          className="text-ink-3 hover:bg-surface-sunk hover:text-ink grid size-5 place-items-center rounded-md disabled:opacity-25"
        >
          <ArrowDown className="size-3" />
        </button>
      </div>
      <div className={cn("min-w-0 flex-1 pl-1")}>
        <p className="text-sm font-semibold">{label.title}</p>
        <p className="text-ink-3 truncate text-xs">{label.description}</p>
      </div>
      <span className="pr-2">
        <Switch checked onCheckedChange={onToggle} aria-label={`Show ${label.title}`} />
      </span>
    </Reorder.Item>
  );
}
