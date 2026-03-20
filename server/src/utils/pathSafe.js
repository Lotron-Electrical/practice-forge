import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "..", "..", "data");

/**
 * Resolve a relative file path within DATA_DIR, rejecting traversal attempts.
 * Returns the resolved absolute path, or throws if it escapes DATA_DIR.
 */
export function safePath(relativePath) {
  const resolved = path.resolve(DATA_DIR, relativePath);
  if (!resolved.startsWith(DATA_DIR)) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }
  return resolved;
}

export { DATA_DIR };
