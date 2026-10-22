import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user && user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <LoginForm />
    </div>
  );
}
