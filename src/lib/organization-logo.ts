import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSession } from "./session-middleware";

export const LOGO_BUCKET = "organization-logos";
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function logoPath(organizationId: string) {
  return `${organizationId}/logo`;
}

// Uploads to a path keyed by the institution's own organization id (one
// logo per institution card, shared by whoever signs into it -- see
// auth-session.server.ts) and stores the resulting public URL on that
// organizations row. Runs server-side via the service-role client since
// there's no more Supabase Auth session for storage RLS to key off.
export const uploadOrganizationLogo = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => {
    if (!(data instanceof FormData)) throw new Error("Expected FormData");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    return { file };
  })
  .handler(async ({ data, context }): Promise<string> => {
    const { file } = data;
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file.");
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new Error("Image is too large (max 5MB).");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = logoPath(context.session.organizationId);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: pub } = supabaseAdmin.storage.from(LOGO_BUCKET).getPublicUrl(path);
    // The object path is stable across re-uploads (upsert), so without a
    // cache-busting query param the browser/CDN would keep serving the
    // previous image after a replace.
    const url = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ logo_url: url })
      .eq("id", context.session.organizationId);
    if (updateError) throw updateError;

    return url;
  });

const UpdateNameInput = z.object({ name: z.string().trim().min(1) });

// The institution's display name is shared by whoever signs into that
// card, same as the logo above -- editing it here renames the card itself,
// not a personal display name (there's no per-person profile anymore).
export const updateOrganizationName = createServerFn({ method: "POST" })
  .middleware([requireSession])
  .inputValidator((data) => UpdateNameInput.parse(data))
  .handler(async ({ data, context }): Promise<void> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ name: data.name })
      .eq("id", context.session.organizationId);
    if (error) throw error;
  });
