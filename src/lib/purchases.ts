/**
 * RevenueCat wrapper, env-gated like the OAuth/AI paths. Without
 * EXPO_PUBLIC_RC_* keys the whole thing is inert: every call resolves to the
 * free tier and the native SDK is never touched (so CI, Expo Go, and any build
 * without the keys stay green). Drop in keys + configure products in the
 * RevenueCat dashboard to turn it on.
 */
import { Platform } from "react-native";
import type PurchasesModule from "react-native-purchases";
import type { PurchasesPackage } from "react-native-purchases";

export const PRO_ENTITLEMENT = "pro";

const apiKey =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_RC_IOS_KEY
    : Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY
      : undefined;

/** True only when a RevenueCat key is configured for this platform/build. */
export const purchasesEnabled = (): boolean => Boolean(apiKey);

let cached: typeof PurchasesModule | null = null;
let configured = false;

function purchases(): typeof PurchasesModule {
  // Loaded lazily so the native module is never required without a key.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!cached) cached = (require("react-native-purchases") as { default: typeof PurchasesModule }).default;
  return cached;
}

async function ensureConfigured(): Promise<boolean> {
  if (!apiKey) return false;
  if (configured) return true;
  try {
    purchases().configure({ apiKey });
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export async function isProActive(): Promise<boolean> {
  if (!(await ensureConfigured())) return false;
  try {
    const info = await purchases().getCustomerInfo();
    return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
  } catch {
    return false;
  }
}

/** The purchasable packages of the current offering (empty when disabled). */
export async function getProPackages(): Promise<PurchasesPackage[]> {
  if (!(await ensureConfigured())) return [];
  try {
    const offerings = await purchases().getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

/** Returns whether Pro is active after the purchase (false on cancel/error). */
export async function purchasePro(pkg: PurchasesPackage): Promise<boolean> {
  if (!(await ensureConfigured())) return false;
  try {
    const { customerInfo } = await purchases().purchasePackage(pkg);
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT]);
  } catch {
    return false; // user cancelled or the purchase failed
  }
}

export async function restorePro(): Promise<boolean> {
  if (!(await ensureConfigured())) return false;
  try {
    const info = await purchases().restorePurchases();
    return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
  } catch {
    return false;
  }
}
