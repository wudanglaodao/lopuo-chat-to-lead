import { AdminPageLoading } from "@/components/admin/admin-loading";

export default function Loading() {
  return (
    <AdminPageLoading
      title="总览"
      description="正在加载当前站点的知识库、会话、留咨线索和 AI 问答运行概况。"
      variant="dashboard"
    />
  );
}
