import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function normalizeExternalUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;

  return false;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];

  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.replace("::ffff:", "");
    if (isIP(mapped) === 4) return isPrivateIpv4(mapped);
  }

  return false;
}

function isPrivateOrLocalIp(address: string): boolean {
  const ipType = isIP(address);
  if (ipType === 4) return isPrivateIpv4(address);
  if (ipType === 6) return isPrivateIpv6(address);
  return true;
}

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

export async function validateExternalCompanyUrl(rawUrl: string): Promise<
  | {
      ok: true;
      normalizedUrl: string;
      resolvedAddresses: { address: string; family: 4 | 6 }[];
    }
  | { ok: false; error: string }
> {
  const normalizedUrl = normalizeExternalUrl(rawUrl);

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    return { ok: false, error: "Valid URL required" };
  }

  if (!parsed.hostname) {
    return { ok: false, error: "Valid URL required" };
  }

  if (!parsed.protocol || !["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Valid http/https URL required" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URL credentials are not allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith(".local")) {
    return { ok: false, error: "Private/local hostnames are not allowed" };
  }

  if (isIP(hostname) && isPrivateOrLocalIp(hostname)) {
    return { ok: false, error: "Private/local IP addresses are not allowed" };
  }

  let resolvedAddresses: { address: string; family: 4 | 6 }[] = [];

  if (isIP(hostname)) {
    const family = isIP(hostname);
    if (family !== 4 && family !== 6) {
      return { ok: false, error: "Unable to validate host" };
    }

    resolvedAddresses = [{ address: hostname, family }];
  } else {
    try {
      const records = await lookup(hostname, { all: true, verbatim: true });
      if (!records.length) {
        return { ok: false, error: "Unable to resolve host" };
      }

      if (records.some((record) => isPrivateOrLocalIp(record.address))) {
        return { ok: false, error: "Resolved host points to a private/local IP" };
      }

      resolvedAddresses = records
        .filter((record) => record.family === 4 || record.family === 6)
        .map((record) => ({
          address: record.address,
          family: record.family as 4 | 6,
        }));
    } catch {
      return { ok: false, error: "Unable to validate host" };
    }
  }

  if (resolvedAddresses.length === 0) {
    return { ok: false, error: "Unable to resolve host" };
  }

  return { ok: true, normalizedUrl: parsed.toString(), resolvedAddresses };
}
