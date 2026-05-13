import { AdminPageLoading } from "@/components/admin/admin-loading";

export default function Loading() {
  return (
    <AdminPageLoading
      title="设置"
      description="正在加载租户空间、默认租户、模型覆盖项和 AI 安全边界。"
      variant="settings"
    />
  );
}
