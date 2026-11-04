// Client-side reading of .txt and .eml files for the New demand form (D-11).
// Only plain-text emails are supported. MIME multipart, quoted-printable and base64 are decoded.

export const MAX_EMAIL_FILE_BYTES = 1024 * 1024;

export class EmailFileError extends Error {}

const toBytes = (value: string): Uint8Array => Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);

const toBinaryString = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    result += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return result;
};

const decodeBytes = (bytes: Uint8Array, charset = 'utf-8'): string => {
  try {
    return new TextDecoder(charset.trim().toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
};

const decodeQuotedPrintable = (value: string): Uint8Array => {
  const text = value.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const hex = text.slice(index + 1, index + 3);
    if (text[index] === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      index += 2;
    } else {
      bytes.push(text.charCodeAt(index) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
};

const parseHeaders = (block: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  block
    .replace(/\r?\n[ \t]+/g, ' ')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^([A-Za-z-]+):\s*(.*)$/);
      if (match && headers[match[1].toLowerCase()] === undefined) headers[match[1].toLowerCase()] = match[2];
    });
  return headers;
};

const splitMessage = (raw: string): { headers: Record<string, string>; body: string } => {
  const separator = raw.match(/\r?\n\r?\n/);
  if (!separator || separator.index === undefined) {
    return { headers: parseHeaders(raw), body: '' };
  }
  return {
    headers: parseHeaders(raw.slice(0, separator.index)),
    body: raw.slice(separator.index + separator[0].length)
  };
};

const headerParam = (value: string, name: string): string | undefined =>
  value.match(new RegExp(`${name}\\s*=\\s*"?([^";]+)"?`, 'i'))?.[1];

const decodeBody = (body: string, headers: Record<string, string>): string => {
  const encoding = (headers['content-transfer-encoding'] ?? '7bit').trim().toLowerCase();
  const charset = headerParam(headers['content-type'] ?? '', 'charset') ?? 'utf-8';
  if (encoding === 'base64') {
    try {
      return decodeBytes(toBytes(atob(body.replace(/\s/g, ''))), charset);
    } catch {
      throw new EmailFileError('The email body is not valid base64. Paste the text of the email instead.');
    }
  }
  if (encoding === 'quoted-printable') return decodeBytes(decodeQuotedPrintable(body), charset);
  return decodeBytes(toBytes(body), charset);
};

const findPlainText = (raw: string): string | null => {
  const { headers, body } = splitMessage(raw);
  const contentType = (headers['content-type'] ?? 'text/plain').toLowerCase();
  const mime = contentType.split(';')[0].trim();

  if (mime.startsWith('multipart/')) {
    const boundary = headerParam(headers['content-type'] ?? '', 'boundary');
    if (!boundary) return null;
    const parts = body.split(`--${boundary}`).slice(1);
    for (const part of parts) {
      if (part.startsWith('--')) break;
      const found = findPlainText(part.replace(/^\r?\n/, ''));
      if (found !== null) return found;
    }
    return null;
  }
  if (mime !== 'text/plain') return null;
  return decodeBody(body, headers);
};

// RFC 2047 encoded words in headers, for example =?UTF-8?Q?Java_Developer?=
const decodeHeaderWords = (value: string): string =>
  value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset: string, kind: string, text: string) => {
    try {
      if (kind.toUpperCase() === 'B') return decodeBytes(toBytes(atob(text)), charset);
      return decodeBytes(decodeQuotedPrintable(text.replace(/_/g, ' ')), charset);
    } catch {
      return text;
    }
  });

export const decodeEml = (raw: string): string => {
  const { headers } = splitMessage(raw);
  if (!headers.subject && !headers.from && !headers['content-type']) {
    throw new EmailFileError('This file does not look like an email. Use a .txt or .eml file with the demand email.');
  }
  const text = findPlainText(raw);
  if (text === null || !text.trim()) {
    throw new EmailFileError('This email has no plain-text part. Paste the text of the email instead.');
  }
  const header = (name: string): string[] =>
    headers[name.toLowerCase()] ? [`${name}: ${decodeHeaderWords(headers[name.toLowerCase()])}`] : [];
  return [...header('From'), ...header('To'), ...header('Subject'), ...header('Date'), '', text.trim()].join('\n');
};

const decodeText = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  if (bytes.includes(0)) {
    throw new EmailFileError('This file is not a text file. Use a .txt or .eml file.');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
};

export const readEmailFile = async (file: File): Promise<string> => {
  if (!/\.(txt|eml)$/i.test(file.name)) {
    throw new EmailFileError('Only .txt and .eml files are supported.');
  }
  if (file.size > MAX_EMAIL_FILE_BYTES) {
    throw new EmailFileError('The file is larger than 1 MB. Use a .txt or .eml file.');
  }
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new EmailFileError('Cannot read the file. Paste the text instead.');
  }
  const text = /\.eml$/i.test(file.name) ? decodeEml(toBinaryString(buffer)) : decodeText(buffer);
  if (!text.trim()) throw new EmailFileError('The file is empty.');
  return text;
};
