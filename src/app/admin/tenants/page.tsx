import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TenantsPage() {
  redirect("/admin/settings/tenants");
}
