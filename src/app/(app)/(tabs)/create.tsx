import { Redirect } from "expo-router";

/**
 * The tab bar intercepts presses on this tab, but the route still exists -
 * deep links or programmatic navigation land here, so forward them to the
 * composer instead of rendering a blank screen.
 */
export default function CreateTab() {
  return <Redirect href="/workout/compose" />;
}
