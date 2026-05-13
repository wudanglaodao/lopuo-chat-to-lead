import { AdminPageLoading } from "@/components/admin/admin-loading";

export default function Loading() {
  return (
    <AdminPageLoading
      title="设置"
      description="正在加载官网 AI 客服的对话内容、入口样式、多语言和脚本配置。"
      variant="settings"
    />
  );
}
