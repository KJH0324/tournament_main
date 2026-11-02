import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin/gate";
import { AdminLogin } from "@/components/admin-login";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "관리 로그인 · Mission Control" }] }),
  loader: async () => {
    const session = await getAdminSession();
    if (session.authed) throw redirect({ to: "/admin" });
    return null;
  },
  component: LoginRoute,
});

function LoginRoute() {
  return <AdminLogin />;
}
