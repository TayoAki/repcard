import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { syncStreakReminder } from "@/features/streak/streak-reminder";
import StreakSheet from "@/features/streak/streak-sheet";
import { fetchStreakDates } from "@/lib/api";
import { summarizeStreak } from "@/lib/streak";

type StreakValue = { current: number; best: number; show: () => void };

const StreakContext = createContext<StreakValue | null>(null);

export function StreakProvider({ children }: React.PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["streak"], queryFn: fetchStreakDates });

  const summary = useMemo(
    () => summarizeStreak((data?.dates ?? []).map((d) => new Date(d))),
    [data?.dates],
  );
  const show = useCallback(() => setOpen(true), []);

  // Keep the local pre-break reminder in sync with the live streak: it arms when
  // a streak is at risk and self-cancels once today is trained. No-ops unless
  // the user has already enabled notifications (see the streak sheet opt-in).
  useEffect(() => {
    syncStreakReminder(summary);
  }, [summary]);

  return (
    <StreakContext.Provider value={{ current: summary.current, best: summary.best, show }}>
      {children}
      <StreakSheet onClose={() => setOpen(false)} summary={summary} visible={open} />
    </StreakContext.Provider>
  );
}

export function useStreak() {
  const value = useContext(StreakContext);
  if (!value) throw new Error("useStreak requires StreakProvider");
  return value;
}
