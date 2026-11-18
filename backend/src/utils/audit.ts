import { AuditLogModel } from "@dsa/shared";
import type { Request } from "express";

export interface AuditInput {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Records an administrative action. Metadata must stay safe: no passwords,
 * tokens, source code or hidden test contents.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  await AuditLogModel.create({
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
    ip: input.req?.ip ?? null,
    requestId: input.req?.id ? String(input.req.id) : null,
  });
}
