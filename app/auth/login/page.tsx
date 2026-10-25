import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginHero } from "@/components/auth/LoginHero";

export const metadata: Metadata = {
  title: "Iniciar sesión · OpenDayCare",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-auth-bg lg:grid-cols-[1.05fr_1fr]">
      <LoginHero />
      <LoginForm />
    </main>
  );
}
