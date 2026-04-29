import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { learningsDir } from "../core/paths.js";
import { readEntity, writeEntity } from "../core/fs.js";
import { normalizeIdInput } from "../core/id.js";
import { EntityNotFoundError } from "../core/errors.js";
import {
  validateCompression,
  type CompressValidationResult,
} from "../core/compress-validate.js";

export interface LearningCompressResult {
  readonly id: string;
  readonly path: string;
  readonly ok: boolean;
  readonly bytesBefore: number;
  readonly bytesAfter: number;
  readonly errors: readonly string[];
  readonly skippedReason?: string;
}

export async function learningCompress(
  cwd: string,
  id: string,
  newBody: string,
): Promise<LearningCompressResult> {
  const normalizedId = normalizeIdInput(id, "learning");
  const lDir = learningsDir(cwd);
  const entries = await readdir(lDir);
  const dirName = entries.find(
    (e) => e.startsWith(`${normalizedId}-`) || e === normalizedId,
  );
  if (!dirName) {
    throw new EntityNotFoundError(normalizedId, "learnings");
  }
  const filePath = join(lDir, dirName, "index.md");
  const doc = await readEntity(filePath);
  const fm = { ...(doc.frontmatter as Record<string, unknown>) };

  if (fm["compressed"] === true || fm["compressed"] === "true") {
    const bytes = Buffer.byteLength(doc.body, "utf-8");
    return {
      id: normalizedId,
      path: filePath,
      ok: false,
      bytesBefore: bytes,
      bytesAfter: bytes,
      errors: [],
      skippedReason: "already compressed",
    };
  }

  const validation: CompressValidationResult = validateCompression(doc.body, newBody);

  if (!validation.ok) {
    return {
      id: normalizedId,
      path: filePath,
      ok: false,
      bytesBefore: validation.bytesBefore,
      bytesAfter: validation.bytesAfter,
      errors: validation.errors,
    };
  }

  fm["compressed"] = true;
  await writeEntity(filePath, fm, newBody);

  return {
    id: normalizedId,
    path: filePath,
    ok: true,
    bytesBefore: validation.bytesBefore,
    bytesAfter: validation.bytesAfter,
    errors: [],
  };
}
