import type { Metadata } from "next";
import { ActivateAccountForm } from "@/components/auth/ActivateAccountForm";

export const metadata: Metadata = {
  title: "Activar cuenta · OpenDayCare",
};

export default async function ActivatePage(
  props: PageProps<"/auth/activate">,
) {
  const { code } = await props.searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-auth-bg p-10">
      <ActivateAccountForm initialCode={typeof code === "string" ? code : ""} />
    </main>
  );
}
