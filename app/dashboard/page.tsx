import { getDashboardSummary } from "@/features/dashboard/actions/dashboard-actions";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  return <DashboardView initialData={summary} />;
}
