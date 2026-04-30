import { mkdir, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

export async function assertAllowedPath(path: string, roots: string[]): Promise<string> {
  if (roots.length === 0) {
    throw new Error("Set MYMIND_ALLOWED_FILE_ROOTS before uploading local files.");
  }

  const target = await realpath(path);
  const allowedRoots = await Promise.all(roots.map((root) => realpath(root)));
  const allowed = allowedRoots.some((root) => isWithinPath(target, root));

  if (!allowed) {
    throw new Error(`File is outside MYMIND_ALLOWED_FILE_ROOTS: ${path}`);
  }
  return target;
}

export async function assertOutputPath(
  outputDir: string,
  outputFilename: string,
  options: { createDirectory: boolean }
): Promise<string> {
  const safeName = basename(outputFilename);
  if (safeName !== outputFilename) {
    throw new Error("outputFilename must be a filename, not a path.");
  }

  if (options.createDirectory) {
    await mkdir(outputDir, { recursive: true });
  }

  let outputDirRealPath: string;
  try {
    outputDirRealPath = await realpath(outputDir);
  } catch (error) {
    if (!options.createDirectory && isNotFoundError(error)) {
      return resolve(outputDir, safeName);
    }
    throw error;
  }
  const outputPath = resolve(outputDirRealPath, safeName);
  if (!isWithinPath(outputPath, outputDirRealPath)) {
    throw new Error("outputFilename resolves outside MYMIND_OUTPUT_DIR.");
  }

  try {
    const existingPath = await realpath(outputPath);
    if (!isWithinPath(existingPath, outputDirRealPath)) {
      throw new Error("Existing output file resolves outside MYMIND_OUTPUT_DIR.");
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  return outputPath;
}

export function isWithinPath(target: string, root: string): boolean {
  const relation = relative(root, target);
  return relation === "" || (relation !== ".." && !relation.startsWith(`..${sep}`) && !isAbsolute(relation));
}

export function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
