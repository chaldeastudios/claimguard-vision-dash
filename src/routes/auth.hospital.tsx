import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/auth-form";

export const Route = createFileRoute("/auth/hospital")({
  head: () => ({ meta: [{ title: "Facility sign in — ClaimGuard" }] }),
  component: () => (
    <AuthForm
      accountType="hospital"
      redirectTo="/hospital-portal"
      heroTitle="Submit claims straight into your insurer's review queue."
      heroSubtitle="Sign in to submit patient claims on behalf of your facility."
    />
  ),
});
