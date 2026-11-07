// Reglas propias de análisis de enlaces (Sonny_Documentacion.md F5).
// Solo se analiza el TEXTO del enlace; nunca se visita.

// Marcas que suelen suplantarse: internacionales + bancos y billeteras de Latinoamérica.
export const BRANDS = [
  "paypal", "amazon", "apple", "icloud", "google", "microsoft", "outlook", "netflix", "spotify",
  "whatsapp", "facebook", "instagram", "tiktok", "dhl", "fedex", "ups", "usps", "correos",
  "mercadolibre", "mercadopago", "visa", "mastercard", "santander", "bbva", "itau", "bancolombia",
  "banorte", "bcp", "bnb", "bancounion", "bancosol", "tigo", "tigomoney", "entel", "claro", "movistar",
  "binance", "coinbase", "uber", "airbnb", "booking", "shein", "temu", "aliexpress", "docusign",
];

const RISKY_TLDS = ["xyz", "top", "click", "info", "online", "site", "live", "icu", "buzz", "rest", "cfd",
  "sbs", "shop", "loan", "work", "zip", "mov", "support", "cyou", "monster", "gq", "tk", "ml", "cf", "ga"];
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly", "rb.gy",
  "shorturl.at", "tiny.cc", "s.id", "rebrand.ly", "t.ly", "acortar.link", "bitly.ws"];
// Sufijos de dos partes habituales (el dominio registrable es la parte de antes).
const TWO_PART_SUFFIXES = ["com.bo", "com.ar", "com.mx", "com.co", "com.pe", "com.br", "com.ec", "com.py",
  "com.uy", "com.ve", "com.gt", "com.do", "co.uk", "gob.bo", "gob.mx", "gob.ar", "org.bo", "net.bo"];

export type LinkSignal =
  | { kind: "lookalike"; brand: string }   // typosquatting: paypa1.com
  | { kind: "brandInSubdomain"; brand: string } // mibanco.com.verificacion.net
  | { kind: "ip" }
  | { kind: "punycode" }
  | { kind: "shortener" }
  | { kind: "riskyTld"; tld: string }
  | { kind: "noHttps" };

export type LinkReport = { url: string; host: string; signals: LinkSignal[] };
export type RulesResult = { links: LinkReport[]; severe: boolean };

const LINK_RE = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,24}(?::\d+)?(?:\/[^\s]*)?|\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/[^\s]*)?/gi;

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Sustituciones típicas para parecer otra letra: paypa1 -> paypal, g00gle -> google.
function unLeet(s: string): string {
  return s.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s").replace(/rn/g, "m");
}

function registrable(host: string): { name: string; tld: string; sub: string[] } {
  const parts = host.split(".");
  const last2 = parts.slice(-2).join(".");
  const suffixLen = TWO_PART_SUFFIXES.includes(last2) ? 2 : 1;
  const tld = parts.slice(-suffixLen).join(".");
  const name = parts[parts.length - suffixLen - 1] ?? "";
  return { name, tld, sub: parts.slice(0, Math.max(0, parts.length - suffixLen - 1)) };
}

export function analyzeLinks(text: string): RulesResult {
  const links: LinkReport[] = [];
  for (const match of text.matchAll(LINK_RE)) {
    const raw = match[0].replace(/[).,;:!?»”"']+$/, "");
    // Evita falsos enlaces tipo "hola.Te" o "S.A." exigiendo un dominio de al menos 2 letras útiles.
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    let host: string;
    try {
      host = new URL(withScheme).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(raw) && !/^www\./i.test(raw) && !raw.includes("/") && raw.split(".").pop()!.length > 6) continue;

    const signals: LinkSignal[] = [];
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (isIp) signals.push({ kind: "ip" });
    if (host.split(".").some((p) => p.startsWith("xn--"))) signals.push({ kind: "punycode" });
    if (SHORTENERS.includes(host.replace(/^www\./, ""))) signals.push({ kind: "shortener" });
    if (/^http:\/\//i.test(raw)) signals.push({ kind: "noHttps" });

    if (!isIp) {
      const { name, tld, sub } = registrable(host.replace(/^www\./, ""));
      const lastTld = tld.split(".").pop()!;
      if (RISKY_TLDS.includes(lastTld)) signals.push({ kind: "riskyTld", tld: lastTld });

      const tokens = name.split("-").filter(Boolean);
      const isBrandItself = BRANDS.includes(name);
      if (!isBrandItself) {
        // Marca escrita casi igual (paypa1, amaz0n) o metida en un nombre más largo (bbva-seguridad).
        const hit = BRANDS.find((b) =>
          tokens.some((tok) => {
            const t = unLeet(tok);
            if (t === b) return true; // bbva-seguridad.xyz, paypa1.com
            return b.length >= 5 && Math.abs(t.length - b.length) <= 1 && levenshtein(t, b) === 1;
          }),
        );
        if (hit) signals.push({ kind: "lookalike", brand: hit });
        else {
          // La marca aparece como subdominio, pero el dominio real es otro.
          const inSub = BRANDS.find((b) => sub.some((s) => s === b));
          if (inSub) signals.push({ kind: "brandInSubdomain", brand: inSub });
        }
      }
    }
    links.push({ url: raw, host, signals });
  }
  const severe = links.some((l) =>
    l.signals.some((s) => ["lookalike", "brandInSubdomain", "ip", "punycode"].includes(s.kind)),
  );
  return { links, severe };
}
