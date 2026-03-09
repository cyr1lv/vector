import { createHash } from "node:crypto";

export type VectorSoftwareSpecialization =
  | "backend"
  | "frontend"
  | "fullstack"
  | "web"
  | "mobile"
  | "desktop"
  | "embedded";

export type VectorSoftwareSpecializationHint = {
  specialization: VectorSoftwareSpecialization;
  confidence: number;
  confidence_label: "low" | "medium" | "high";
  evidence_snippet: string;
  supporting_terms: string[];
  source: "vector_service_v1";
};

type SpecializationRow = {
  specialization: VectorSoftwareSpecialization;
  aliases: string[];
  alias_weights?: Partial<Record<string, number>>;
  prototype: string;
};

export type PlatformSoftwareSpecializationSignalPayload = Partial<
  Record<
    | `fit.${"candidate" | "vacancy"}.software_specialization_vector`
    | "fit.software_specialization_vector_confidence"
    | "fit.software_specialization_vector_source",
    string
  >
>;

const EMBED_DIM = 1536;

const SPECIALIZATION_ROWS: SpecializationRow[] = [
  {
    specialization: "frontend",
    aliases: [
      "frontend",
      "front end",
      "front-end",
      "frontend engineer",
      "frontend developer",
      "front end engineer",
      "front end developer",
      "front-end engineer",
      "front-end developer",
      "ui development",
      "user interface",
      "ui engineer",
      "ui developer",
      "react",
      "angular",
      "vue",
      "css",
      "html",
    ],
    alias_weights: {
      frontend: 2.4,
      "front end": 2.4,
      "front-end": 2.4,
      "frontend engineer": 3.1,
      "frontend developer": 3.1,
      "front end engineer": 3.1,
      "front end developer": 3.1,
      "front-end engineer": 3.1,
      "front-end developer": 3.1,
      "ui development": 2.2,
      "user interface": 2.2,
      "ui engineer": 2.5,
      "ui developer": 2.5,
      react: 2.1,
      angular: 2,
      vue: 2,
      css: 1.4,
      html: 1.1,
    },
    prototype: "frontend web ui engineer building user interfaces in react angular vue html css",
  },
  {
    specialization: "fullstack",
    aliases: ["full stack", "fullstack", "end to end", "end-to-end"],
    prototype: "fullstack engineer building frontend and backend application layers end to end",
  },
  {
    specialization: "backend",
    aliases: [
      "backend",
      "back end",
      "back-end",
      "server side",
      "server-side",
      "api",
      "rest api",
      "node.js",
      "spring boot",
      ".net",
      "java",
    ],
    prototype: "backend engineer building apis services data access and server side systems",
  },
  {
    specialization: "mobile",
    aliases: [
      "mobile",
      "ios",
      "android",
      "react native",
      "flutter",
      "swift",
      "kotlin",
      "mobile app",
    ],
    prototype: "mobile engineer building ios android react native flutter applications",
  },
  {
    specialization: "desktop",
    aliases: ["desktop", "electron", "qt", "wpf", "winforms", "windows application"],
    prototype: "desktop software engineer building electron qt wpf winforms applications",
  },
  {
    specialization: "embedded",
    aliases: [
      "embedded",
      "firmware",
      "device driver",
      "microcontroller",
      "bare metal",
      "rtos",
      "plc",
      "scada",
      "hmi",
      "ladder logic",
      "codesys",
      "rslogix",
    ],
    prototype: "embedded software engineer building firmware device drivers plc scada hmi systems",
  },
  {
    specialization: "web",
    aliases: ["web", "browser", "web app", "web application", "spa", "single page application"],
    alias_weights: {
      web: 0.45,
      browser: 0.35,
      "web app": 0.9,
      "web application": 1,
      spa: 1,
      "single page application": 1.1,
    },
    prototype: "web software engineer building browser based applications and web platforms",
  },
];

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function confidenceLabel(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.78) return "medium";
  return "low";
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const den = Math.sqrt(na) * Math.sqrt(nb);
  if (den === 0) return 0;
  const cos = dot / den;
  return Math.max(0, Math.min(1, (cos + 1) / 2));
}

function embed1536(text: string): number[] {
  const h = createHash("sha256").update(text, "utf8").digest();
  const out: number[] = [];
  for (let i = 0; i < EMBED_DIM; i++) {
    const j = i % h.length;
    out.push((h.readUInt8(j) / 255) * 2 - 1);
  }
  return out;
}

function extractPhrases(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const phrases = new Set<string>();
  const words = normalized.split(" ").filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    phrases.add(words[i]);
    if (i + 1 < words.length) phrases.add(`${words[i]} ${words[i + 1]}`);
    if (i + 2 < words.length) phrases.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  for (const row of SPECIALIZATION_ROWS) {
    for (const alias of row.aliases) {
      const normalizedAlias = normalizeText(alias);
      if (normalized.includes(normalizedAlias)) phrases.add(normalizedAlias);
    }
  }
  return Array.from(phrases).slice(0, 260);
}

function aliasWeight(row: SpecializationRow, alias: string): number {
  return row.alias_weights?.[alias] ?? 1;
}

function aliasHitStats(row: SpecializationRow, normalizedText: string, phrases: string[]): {
  supportingTerms: string[];
  weightedAliasHits: number;
  phraseBoost: number;
} {
  const supportingTerms = row.aliases.filter((alias) =>
    normalizedText.includes(normalizeText(alias))
  );
  const weightedAliasHits = supportingTerms.reduce((sum, alias) => {
    return sum + aliasWeight(row, alias);
  }, 0);
  const phraseBoost = phrases.reduce((sum, phrase) => {
    const matchingAlias = row.aliases.find((alias) => normalizeText(alias) === phrase);
    if (!matchingAlias) return sum;
    return sum + aliasWeight(row, matchingAlias) * 0.35;
  }, 0);
  return {
    supportingTerms,
    weightedAliasHits,
    phraseBoost,
  };
}

export function retrieveSoftwareSpecializationHints(
  text: string,
  maxHints = 3
): VectorSoftwareSpecializationHint[] {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return [];
  const textEmbedding = embed1536(normalizedText);
  const phrases = extractPhrases(normalizedText);
  const rowsWithEmbeddings = SPECIALIZATION_ROWS.map((row) => ({
    row,
    embedding: embed1536(`${row.specialization} ${row.aliases.join(" ")} ${row.prototype}`),
  }));

  const scored = rowsWithEmbeddings
    .map(({ row, embedding }) => {
      const { supportingTerms, weightedAliasHits, phraseBoost } = aliasHitStats(
        row,
        normalizedText,
        phrases
      );
      const similarity = cosineSimilarity(textEmbedding, embedding);
      const score = Math.max(
        weightedAliasHits > 0
          ? Math.min(0.96, 0.74 + weightedAliasHits * 0.08 + phraseBoost * 0.03)
          : 0,
        similarity
      );
      const evidence = supportingTerms[0] ?? row.aliases.find((alias) => normalizedText.includes(normalizeText(alias)));
      return {
        specialization: row.specialization,
        confidence: Math.max(0, Math.min(0.99, score)),
        supporting_terms: supportingTerms.slice(0, 5),
        evidence_snippet: (evidence ?? row.prototype).slice(0, 120),
      };
    })
    .filter((row) => row.confidence >= 0.72)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (b.supporting_terms.length !== a.supporting_terms.length) {
        return b.supporting_terms.length - a.supporting_terms.length;
      }
      const priority: Record<VectorSoftwareSpecialization, number> = {
        fullstack: 7,
        frontend: 6,
        backend: 5,
        mobile: 4,
        desktop: 3,
        embedded: 2,
        web: 1,
      };
      return priority[b.specialization] - priority[a.specialization];
    })
    .slice(0, maxHints)
    .map((row) => ({
      ...row,
      confidence_label: confidenceLabel(row.confidence),
      source: "vector_service_v1" as const,
    }));

  return scored;
}

export function inferSoftwareSpecialization(
  text: string
): VectorSoftwareSpecializationHint | null {
  return retrieveSoftwareSpecializationHints(text, 1)[0] ?? null;
}

export function buildPlatformSoftwareSpecializationSignalPayload(params: {
  side: "candidate" | "vacancy";
  text: string;
}): PlatformSoftwareSpecializationSignalPayload | null {
  const hint = inferSoftwareSpecialization(params.text);
  if (!hint) return null;
  return {
    [`fit.${params.side}.software_specialization_vector`]: hint.specialization,
    "fit.software_specialization_vector_confidence": hint.confidence_label,
    "fit.software_specialization_vector_source": hint.source,
  };
}
