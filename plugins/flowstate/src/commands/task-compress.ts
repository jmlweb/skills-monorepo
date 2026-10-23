import type { BacklogStore } from "../core/store.js";
import { EntityNotFoundError } from "../core/errors.js";
import {
  validateCompression,
  type CompressValidationResult,
} from "../core/compress-validate.js";

const PROTECTED_SECTIONS = ["Acceptance Criteria"] as const;

export interface TaskCompressResult {
  readonly id: string;
  readonly path: string;
  readonly ok: boolean;
  readonly bytesBefore: number;
  readonly bytesAfter: number;
  readonly errors: readonly string[];
  readonly skippedReason?: string;
}

export async function taskCompress(
  store: BacklogStore,
  id: string,
  newBody: string,
): Promise<TaskCompressResult> {
  const task = await store.find("task", id, ["complete"]);
  if (!task) {
    throw new EntityNotFoundError(id, "tasks/complete");
  }
  const filePath = task.path;
  const fm = { ...task.frontmatter };

  if (fm["compressed"] === true || fm["compressed"] === "true") {
    const bytes = Buffer.byteLength(task.body, "utf-8");
    return {
      id,
      path: filePath,
      ok: false,
      bytesBefore: bytes,
      bytesAfter: bytes,
      errors: [],
      skippedReason: "already compressed",
    };
  }

  const validation: CompressValidationResult = validateCompression(task.body, newBody, {
    protectedSections: PROTECTED_SECTIONS,
  });

  if (!validation.ok) {
    return {
      id,
      path: filePath,
      ok: false,
      bytesBefore: validation.bytesBefore,
      bytesAfter: validation.bytesAfter,
      errors: validation.errors,
    };
  }

  fm["compressed"] = true;
  await store.save(task, fm, newBody);

  return {
    id,
    path: filePath,
    ok: true,
    bytesBefore: validation.bytesBefore,
    bytesAfter: validation.bytesAfter,
    errors: [],
  };
}
