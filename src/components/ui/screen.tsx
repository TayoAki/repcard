import { type PropsWithChildren } from "react";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cx } from "@/lib/cx";

type Props = PropsWithChildren<{ edges?: Edge[]; className?: string }>;

/** Standard screen container: themed background + safe-area handling. */
export default function Screen({ children, className, edges = ["top", "bottom"] }: Props) {
  return (
    <SafeAreaView className={cx("flex-1 bg-background", className)} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
