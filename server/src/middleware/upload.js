import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "..", "..", "data");

const ALLOWED_EXTENSIONS = new Set([
  ".xml",
  ".mxl",
  ".mei",
  ".abc",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".tiff",
  ".mp3",
  ".wav",
  ".m4a",
  ".flac",
  ".ogg",
  ".mp4",
  ".mov",
  ".webm",
  ".txt",
  ".md",
]);

const storage = multer.diskStorage({
  destination: path.join(DATA_DIR, "uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed`), false);
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export function detectFileType(mimetype, ext) {
  ext = ext.toLowerCase();
  if ([".xml", ".mxl", ".mei", ".abc"].includes(ext))
    return "sheet_music_digital";
  if ([".pdf", ".png", ".jpg", ".jpeg", ".tiff"].includes(ext))
    return "sheet_music_scanned";
  if ([".mp3", ".wav", ".m4a", ".flac", ".ogg"].includes(ext)) return "audio";
  if ([".mp4", ".mov", ".webm"].includes(ext)) return "video";
  if ([".txt", ".md"].includes(ext)) return "document";
  return "document";
}

export function initialProcessingStatus(fileType) {
  if (fileType === "sheet_music_scanned" || fileType === "video")
    return "pending";
  return "complete";
}

export function moveToTypeDir(currentPath, fileType, filename) {
  let targetDir;
  if (fileType === "audio") targetDir = path.join(DATA_DIR, "recordings");
  else if (fileType === "sheet_music_digital")
    targetDir = path.join(DATA_DIR, "scores");
  else return currentPath; // stays in uploads

  const targetPath = path.join(targetDir, filename);
  fs.renameSync(currentPath, targetPath);
  return targetPath;
}
