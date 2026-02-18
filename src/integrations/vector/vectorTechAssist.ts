import { createHash } from "node:crypto";

export type VectorTechHint = {
  canonical_name: string;
  domain_block: string;
  subtech_of?: string;
  confidence: number;
  evidence_snippet: string;
};

type OntologyRow = {
  canonical_name: string;
  domain_block: string;
  subtech_of?: string;
  aliases: string[];
  is_baseline: boolean;
  is_root: boolean;
};

const EMBED_DIM = 1536;

const ONTOLOGY_ROWS: OntologyRow[] = [
  { canonical_name: "Windows Server", domain_block: "core_infra", aliases: ["windows server", "server 2019", "server 2022"], is_baseline: false, is_root: true },
  { canonical_name: "VMware", domain_block: "core_infra", aliases: ["vmware", "vsphere", "esxi", "vcenter"], is_baseline: false, is_root: true },
  { canonical_name: "Azure (IaaS)", domain_block: "cloud_iaas", aliases: ["azure", "azure vm", "virtual machine", "virtual machines"], is_baseline: false, is_root: true },
  { canonical_name: "Microsoft 365", domain_block: "identity_workplace", aliases: ["microsoft 365", "office 365", "o365", "m365"], is_baseline: false, is_root: true },
  { canonical_name: "PowerShell", domain_block: "automation_iac", aliases: ["powershell", "pwsh", "script"], is_baseline: false, is_root: true },
  { canonical_name: "Terraform", domain_block: "automation_iac", aliases: ["terraform", "tfstate", "hcl"], is_baseline: false, is_root: true },
  { canonical_name: "Bicep/ARM", domain_block: "automation_iac", aliases: ["bicep", "arm template", "arm"], is_baseline: false, is_root: true },
  { canonical_name: "Virtual Machines", domain_block: "cloud_iaas", subtech_of: "Azure (IaaS)", aliases: ["virtual machine", "virtual machines", "azure vm", "vms"], is_baseline: false, is_root: false },
  { canonical_name: "Networking", domain_block: "cloud_iaas", subtech_of: "Azure (IaaS)", aliases: ["vnet", "subnet", "nsg", "networking"], is_baseline: false, is_root: false },
  { canonical_name: "Storage", domain_block: "cloud_iaas", subtech_of: "Azure (IaaS)", aliases: ["blob storage", "managed disk", "storage"], is_baseline: false, is_root: false },
  { canonical_name: "Backup / DR", domain_block: "cloud_iaas", subtech_of: "Azure (IaaS)", aliases: ["backup", "disaster recovery", "dr"], is_baseline: false, is_root: false },
  { canonical_name: "Exchange Online", domain_block: "identity_workplace", subtech_of: "Microsoft 365", aliases: ["exchange online", "exchange"], is_baseline: false, is_root: false },
  { canonical_name: "Teams", domain_block: "identity_workplace", subtech_of: "Microsoft 365", aliases: ["teams", "microsoft teams"], is_baseline: false, is_root: false },
  { canonical_name: "SharePoint", domain_block: "identity_workplace", subtech_of: "Microsoft 365", aliases: ["sharepoint", "sharepoint online"], is_baseline: false, is_root: false },
  { canonical_name: "Intune", domain_block: "identity_workplace", subtech_of: "Microsoft 365", aliases: ["intune", "endpoint manager"], is_baseline: false, is_root: false },
  { canonical_name: "Identity (Entra ID)", domain_block: "identity_workplace", subtech_of: "Microsoft 365", aliases: ["entra", "entra id", "azure ad", "identity"], is_baseline: false, is_root: false },
  { canonical_name: "vSphere / ESXi", domain_block: "core_infra", subtech_of: "VMware", aliases: ["vsphere", "esxi"], is_baseline: false, is_root: false },
  { canonical_name: "vCenter", domain_block: "core_infra", subtech_of: "VMware", aliases: ["vcenter"], is_baseline: false, is_root: false },
  { canonical_name: "Clusterbeheer", domain_block: "core_infra", subtech_of: "VMware", aliases: ["cluster", "clusterbeheer"], is_baseline: false, is_root: false },
  { canonical_name: "Backup & recovery", domain_block: "core_infra", subtech_of: "VMware", aliases: ["backup", "recovery"], is_baseline: false, is_root: false },
  { canonical_name: "Active Directory", domain_block: "identity_workplace", aliases: ["active directory", "ad ds", "activedirectory"], is_baseline: true, is_root: false },
];

const ONTOLOGY_BY_NAME = new Map(ONTOLOGY_ROWS.map((row) => [row.canonical_name.toLowerCase(), row]));

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
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

function extractCandidatePhrases(cvText: string): string[] {
  const text = normalizeText(cvText);
  const phrases = new Set<string>();
  const words = text.split(" ").filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    phrases.add(words[i]);
    if (i + 1 < words.length) phrases.add(`${words[i]} ${words[i + 1]}`);
    if (i + 2 < words.length) phrases.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  for (const row of ONTOLOGY_ROWS) {
    for (const alias of row.aliases) {
      if (text.includes(alias)) phrases.add(alias);
    }
  }
  return Array.from(phrases).slice(0, 220);
}

export function retrieveVectorTechHints(cvText: string, maxPerDomain = 4): VectorTechHint[] {
  const phrases = extractCandidatePhrases(cvText);
  const scored: VectorTechHint[] = [];
  const ontologyEmbeddings = ONTOLOGY_ROWS.map((row) => ({
    row,
    embedding: embed1536(`${row.canonical_name} ${row.aliases.join(" ")}`),
  }));

  for (const phrase of phrases) {
    const phraseEmbedding = embed1536(phrase);
    for (const entry of ontologyEmbeddings) {
      const exactAliasMatch = entry.row.aliases.some((alias) => alias === phrase);
      const similarity = exactAliasMatch ? 0.92 : cosineSimilarity(phraseEmbedding, entry.embedding);
      if (similarity < 0.78) continue;
      scored.push({
        canonical_name: entry.row.canonical_name,
        domain_block: entry.row.domain_block,
        subtech_of: entry.row.subtech_of,
        confidence: similarity,
        evidence_snippet: phrase.slice(0, 80),
      });
    }
  }

  const byCanonical = new Map<string, VectorTechHint>();
  for (const hint of scored) {
    const key = hint.canonical_name.toLowerCase();
    const prev = byCanonical.get(key);
    if (!prev || hint.confidence > prev.confidence) {
      byCanonical.set(key, hint);
    }
  }

  const byDomain = new Map<string, VectorTechHint[]>();
  for (const hint of byCanonical.values()) {
    const list = byDomain.get(hint.domain_block) ?? [];
    list.push(hint);
    byDomain.set(hint.domain_block, list);
  }

  const out: VectorTechHint[] = [];
  for (const list of byDomain.values()) {
    list.sort((a, b) => b.confidence - a.confidence);
    out.push(...list.slice(0, maxPerDomain));
  }
  out.sort((a, b) => b.confidence - a.confidence);
  return out;
}

export function getVectorOntologyEntry(canonicalName: string): {
  domain_block: string;
  subtech_of?: string;
  is_baseline: boolean;
  is_root: boolean;
} | null {
  const row = ONTOLOGY_BY_NAME.get(canonicalName.toLowerCase());
  if (!row) return null;
  return {
    domain_block: row.domain_block,
    subtech_of: row.subtech_of,
    is_baseline: row.is_baseline,
    is_root: row.is_root,
  };
}
