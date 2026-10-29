import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginHero } from "@/components/auth/LoginHero";

export const metadata: Metadata = {
  title: "Iniciar sesión · OpenDayCare",
};

export default async function LoginPage(props: PageProps<"/auth/login">) {
  const { next, activated } = await props.searchParams;

  return (
    <main className="grid min-h-screen bg-auth-bg lg:grid-cols-[1.05fr_1fr]">
      <LoginHero />
      <LoginForm
        next={typeof next === "string" ? next : ""}
        activated={activated === "1"}
      />
    </main>
  );
}
