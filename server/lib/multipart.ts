import type { IncomingMessage } from "http";

export interface ParsedMultipartFile {
  fieldName: string;
  filename: string;
  contentType: string | null;
  buffer: Buffer;
}

export interface ParsedMultipartForm {
  fields: Record<string, string>;
  file: ParsedMultipartFile | null;
  files: ParsedMultipartFile[];
}

interface MultipartOptions {
  fieldName: string;
  maxSizeBytes: number;
}

function getBoundary(contentType: string | undefined): string | null {
  if (!contentType) return null;
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] ?? match?.[2] ?? null;
}

function splitBuffer(buffer: Buffer, separator: Buffer): Buffer[] {
  const parts: Buffer[] = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);
  while (index !== -1) {
    parts.push(buffer.slice(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }
  parts.push(buffer.slice(start));
  return parts;
}

function normalizePart(part: Buffer): Buffer {
  let result = part;
  if (result.length >= 2 && result.slice(0, 2).toString() === "\r\n") {
    result = result.slice(2);
  }
  if (result.length >= 2 && result.slice(-2).toString() === "\r\n") {
    result = result.slice(0, -2);
  }
  return result;
}

export async function parseMultipartFile(
  req: IncomingMessage,
  options: MultipartOptions,
): Promise<ParsedMultipartFile> {
  const parsed = await parseMultipartForm(req, options);
  if (!parsed.file) {
    throw new Error("No file found in multipart payload");
  }
  return parsed.file;
}

export async function parseMultipartFiles(
  req: IncomingMessage,
  options: MultipartOptions,
): Promise<ParsedMultipartFile[]> {
  const parsed = await parseMultipartForm(req, options);
  return parsed.files;
}

export async function parseMultipartForm(
  req: IncomingMessage,
  options: MultipartOptions,
): Promise<ParsedMultipartForm> {
  const boundary = getBoundary(req.headers["content-type"]);
  if (!boundary) {
    throw new Error("Missing multipart boundary");
  }

  const maxSizeBytes = options.maxSizeBytes;
  const chunks: Buffer[] = [];
  let totalSize = 0;
  let abortedBySize = false;
  let settled = false;

  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer) => {
      if (abortedBySize) {
        return;
      }
      totalSize += chunk.length;
      if (totalSize > maxSizeBytes) {
        abortedBySize = true;
        if (settled) return;
        settled = true;
        reject(new Error("Payload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    req.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });

  const body = Buffer.concat(chunks);
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const rawParts = splitBuffer(body, boundaryBuffer);
  const fields: Record<string, string> = {};
  let file: ParsedMultipartFile | null = null;
  const files: ParsedMultipartFile[] = [];

  for (const rawPart of rawParts) {
    const part = normalizePart(rawPart);
    if (!part.length) continue;
    const partText = part.toString("utf8");
    if (partText === "--" || partText === "--\r\n") continue;

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;

    const headerBlock = part.slice(0, headerEnd).toString("utf8");
    const content = part.slice(headerEnd + 4);

    const headers = headerBlock.split("\r\n").reduce<Record<string, string>>((acc, line) => {
      const [key, ...rest] = line.split(":");
      if (!key || rest.length === 0) return acc;
      acc[key.trim().toLowerCase()] = rest.join(":").trim();
      return acc;
    }, {});

    const disposition = headers["content-disposition"];
    if (!disposition) continue;

    const nameMatch = disposition.match(/name="([^"]+)"/i);
    const filenameMatch = disposition.match(/filename="([^"]*)"/i);
    const fieldName = nameMatch?.[1];
    const filename = filenameMatch?.[1];

    if (!fieldName) {
      continue;
    }

    if (!filename) {
      fields[fieldName] = content.toString("utf8");
      continue;
    }

    if (fieldName !== options.fieldName) {
      continue;
    }

    file = {
      fieldName,
      filename,
      contentType: headers["content-type"] ?? null,
      buffer: content,
    };
    files.push(file);
  }

  return { fields, file, files };
}
