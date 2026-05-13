import { AdminPageLoading } from "@/components/admin/admin-loading";

export default function Loading() {
  return (
    <AdminPageLoading
      title="会话"
      description="正在加载访客咨询、AI 回复、未命中问题和留咨记录。"
      variant="table"
    />
  );
}
