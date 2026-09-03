import { useCallback, useEffect, useState } from "react";
import type { PurchasesPackage } from "react-native-purchases";

import {
  getProPackages,
  isProActive,
  purchasePro,
  purchasesEnabled,
  restorePro,
} from "@/lib/purchases";

/** RepCard Pro entitlement state + purchase actions. Inert (isPro=false,
 *  canPurchase=false) until RevenueCat keys are configured. */
export function usePro() {
  const [isPro, setIsPro] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [pro, pkgs] = await Promise.all([isProActive(), getProPackages()]);
    setIsPro(pro);
    setPackages(pkgs);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const buy = useCallback(async (pkg: PurchasesPackage) => {
    const ok = await purchasePro(pkg);
    if (ok) setIsPro(true);
    return ok;
  }, []);

  const restore = useCallback(async () => {
    const ok = await restorePro();
    if (ok) setIsPro(true);
    return ok;
  }, []);

  return { isPro, packages, loading, canPurchase: purchasesEnabled(), buy, restore, refresh };
}
