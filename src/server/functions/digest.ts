import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "../auth/middleware";
import { requireOrgMember } from "../authz.server";
import { sendDigestForOrg } from "../notify/weekly-digest.server";

const sendDigestInput = z.object({ orgId: z.string().uuid() });

/** Manual "Email me this" trigger — the same content the Monday cron sends. */
export const sendMyWeeklyDigest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((input: unknown) => sendDigestInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireOrgMember(context.userId, data.orgId);
    const result = await sendDigestForOrg(data.orgId);
    if (!result.sent) throw new Error(result.reason ?? "Could not send digest");
    return { ok: true };
  });
