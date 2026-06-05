import { BillingLoadingScreen } from "@/components/layout/BillingLoadingScreen";
import { DEFAULT_PANEL_TITLE } from "@/lib/panel-title";

export default function RootLoading() {
  return <BillingLoadingScreen panelTitle={DEFAULT_PANEL_TITLE} message="Loading" />;
}
