import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/auth-form";

export const Route = createFileRoute("/auth/insurer")({
  head: () => ({ meta: [{ title: "Reviewer sign in — ClaimGuard" }] }),
  component: () => (
    <AuthForm
      accountType="insurer"
      redirectTo="/dashboard"
      heroTitle="Fraud review built for national health schemes."
      heroSubtitle="Sign in to review flagged claims, audit hospitals, and protect public funds."
      formSubtitleSignIn="Access the ClaimGuard reviewer console."
      formSubtitleSignUp="Set up access for your scheme team."
    />
  ),
});
