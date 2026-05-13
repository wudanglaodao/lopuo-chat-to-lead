import { AdminPageLoading } from "@/components/admin/admin-loading";

export default function Loading() {
  return (
    <AdminPageLoading
      title="知识库"
      description="正在加载当前租户的 URL、sitemap 来源和同步状态。"
      variant="table"
    />
  );
}
