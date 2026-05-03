import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Mail, Lock, AlertCircle } from "lucide-react";
import LogoC10 from "@/assets/LogoC10.png";
import Image from "next/image";

import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/authz";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/medical");
  }

  const params = await searchParams;
  const authError = params.error;

  async function loginAction(formData: FormData) {
    "use server";

    const gmail = String(formData.get("gmail") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await signIn("credentials", {
        gmail,
        password,
        redirectTo: "/medical",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect("/login?error=Invalid%20credentials");
      }
      throw error;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-100/60 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="mm-card overflow-hidden">
          {/* Header stripe */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
              <Image
                src={LogoC10}
                alt="Medical Management logo"
                width={48}
                height={48}
                quality={100}
                priority
                sizes="48px"
                className="h-12 w-12 object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-white">Khoa Trang bị</h1>
            <p className="mt-1 text-sm text-sky-100">Bệnh viện Trung Ương Quân Đội 108</p>
          </div>

          {/* Form body */}
          <form action={loginAction} className="space-y-4 p-6">
            {authError ? (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{authError}</span>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="gmail" className="block text-xs font-medium text-zinc-600">
                Gmail <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="gmail"
                  name="gmail"
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  className="mm-input pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-zinc-600">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mm-input pl-9"
                />
              </div>
            </div>

            <SubmitButton label="Đăng nhập" pendingLabel="Đang xử lý..." className="w-full" />
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} BAN KHVT - KHOA TRANG BI - BỆNH VIỆN TRUNG ƯƠNG QUÂN ĐỘI 108
        </p>
      </div>
    </main>
  );
}
