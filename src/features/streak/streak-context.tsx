import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

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
