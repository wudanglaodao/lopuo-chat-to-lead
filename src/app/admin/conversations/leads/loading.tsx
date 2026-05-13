import { AdminPageLoading } from "@/components/admin/admin-loading";

export default function Loading() {
  return (
    <AdminPageLoading
      title="会话线索"
      description="正在加载联系方式、AI 会话摘要、来源页面和所属租户。"
      variant="table"
    />
  );
}
