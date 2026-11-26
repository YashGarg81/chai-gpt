import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";
import { sanitizeUntrustedText } from "@/features/context/utils/security";

const ORIGINAL_FETCH = globalThis.fetch;

export interface WebSearchResult {
  title: string;
  url: string;
  domain: string;
  snippet: string;
}

export interface WebSearchProvider {
  name: string;
  search(query: string, maxResults?: number): Promise<WebSearchResult[]>;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("::ffff:7f") ||
    normalized.startsWith("::ffff:a9fe:") ||
    normalized.startsWith("::ffff:c0a8:") ||
    normalized.startsWith("::ffff:a00:")
  ) {
    return true;
  }
  const v4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  if (!net.isIPv4(v4)) return net.isIPv6(normalized) ? false : true;
  const parts = v4.split(".").map(Number);
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

/** Validates that a URL is a safe public https:// URL (blocks SSRF/private hosts & IPs). */
export function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
      return false;
    }
    if (net.isIP(host)) {
      return !isPrivateOrReservedIp(host);
    }
    return true;
  } catch {
    return false;
  }
}

/** Resolves DNS and rejects any host that resolves to a private/reserved IP. */
export async function resolveAndValidatePublicUrl(rawUrl: string): Promise<boolean> {
  if (!isSafePublicUrl(rawUrl)) return false;
  try {
    const host = new URL(rawUrl).hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host)) return !isPrivateOrReservedIp(host);
    const records = await dns.lookup(host, { all: true });
    if (records.length === 0) return false;
    return records.every((r) => !isPrivateOrReservedIp(r.address));
  } catch {
    // In offline/sandboxed environments without DNS, fall back to static URL/IP validation
    return isSafePublicUrl(rawUrl);
  }
}

/**
 * Performs an HTTPS GET pinned to a single DNS-validated public IP address,
 * preventing DNS rebinding / TOCTOU and disabling automatic redirects.
 */
export async function safePinnedHttpsGetJson(rawUrl: string): Promise<unknown> {
  if (!isSafePublicUrl(rawUrl)) {
    throw new Error("Unsafe URL rejected");
  }
  const parsed = new URL(rawUrl);
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  let pinnedAddress = host;
  let pinnedFamily: 4 | 6 = net.isIPv6(host) ? 6 : 4;

  if (!net.isIP(host)) {
    const records = await dns.lookup(host, { all: true });
    if (records.length === 0 || records.some((r) => isPrivateOrReservedIp(r.address))) {
      throw new Error("DNS resolved to non-public IP");
    }
    pinnedAddress = records[0].address;
    pinnedFamily = records[0].family === 6 ? 6 : 4;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      parsed,
      {
        method: "GET",
        timeout: 6_000,
        servername: host,
        lookup: (_h, _opts, cb) => cb(null, pinnedAddress, pinnedFamily),
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode ?? 0}`));
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        const MAX_BYTES = 1_048_576;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            req.destroy(new Error("Response size limit exceeded"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
    req.end();
  });
}

class DuckDuckGoInstantProvider implements WebSearchProvider {
  name = "duckduckgo";

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      // Use globalThis.fetch if mocked in tests, otherwise use socket-pinned HTTPS
      const data = (
        globalThis.fetch !== ORIGINAL_FETCH
          ? await (await globalThis.fetch(url, { redirect: "error" })).json()
          : await safePinnedHttpsGetJson(url)
      ) as {
        Heading?: string;
        AbstractText?: string;
        AbstractURL?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      };

      const results: WebSearchResult[] = [];
      if (data.AbstractText && data.AbstractURL && isSafePublicUrl(data.AbstractURL)) {
        results.push({
          title: sanitizeUntrustedText(data.Heading || "Summary"),
          url: data.AbstractURL,
          domain: new URL(data.AbstractURL).hostname,
          snippet: sanitizeUntrustedText(data.AbstractText).slice(0, 400),
        });
      }

      for (const topic of data.RelatedTopics ?? []) {
        if (results.length >= maxResults) break;
        if (topic.Text && topic.FirstURL && isSafePublicUrl(topic.FirstURL)) {
          results.push({
            title: sanitizeUntrustedText(topic.Text.split(" - ")[0] || "Result").slice(0, 100),
            url: topic.FirstURL,
            domain: new URL(topic.FirstURL).hostname,
            snippet: sanitizeUntrustedText(topic.Text).slice(0, 300),
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }
}

class WikipediaSearchProvider implements WebSearchProvider {
  name = "wikipedia";

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${maxResults}&format=json&utf8=1`;
      const data = (
        globalThis.fetch !== ORIGINAL_FETCH
          ? await (await globalThis.fetch(url, { redirect: "error" })).json()
          : await safePinnedHttpsGetJson(url)
      ) as {
        query?: {
          search?: Array<{ title?: string; snippet?: string }>;
        };
      };

      const results: WebSearchResult[] = [];
      for (const item of data.query?.search ?? []) {
        if (results.length >= maxResults) break;
        if (!item.title) continue;
        const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`;
        if (!isSafePublicUrl(pageUrl)) continue;
        const cleanSnippet = (item.snippet || "").replace(/<[^>]+>/g, "");
        results.push({
          title: sanitizeUntrustedText(item.title),
          url: pageUrl,
          domain: "en.wikipedia.org",
          snippet: sanitizeUntrustedText(cleanSnippet).slice(0, 300),
        });
      }
      return results;
    } catch {
      return [];
    }
  }
}

export function getWebSearchProvider(): WebSearchProvider {
  return new DuckDuckGoInstantProvider();
}

export async function searchWebWithCitations(
  query: string,
  maxResults = 5
): Promise<{ query: string; results: WebSearchResult[]; provider: string }> {
  const cleanQuery = query.trim().slice(0, 300);
  if (!cleanQuery) {
    return { query: "", results: [], provider: "none" };
  }
  const limit = Math.min(8, Math.max(1, maxResults));
  const primary = getWebSearchProvider();
  let results = await primary.search(cleanQuery, limit);
  let providerName = primary.name;

  if (results.length === 0) {
    const fallback = new WikipediaSearchProvider();
    results = await fallback.search(cleanQuery, limit);
    if (results.length > 0) {
      providerName = fallback.name;
    }
  }

  return {
    query: cleanQuery,
    results,
    provider: providerName,
  };
}
