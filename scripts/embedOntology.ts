import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type OntologyTable = "tech_ontology" | "task_ontology" | "certification_ontology";

async function hasColumn(table: OntologyTable, column: string) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  if (error.code === "42703") return false;
  throw error;
}

async function getIdColumn(table: OntologyTable) {
  const candidates = ["id", "task_id", "uuid", "canonical_name"];
  for (const candidate of candidates) {
    if (await hasColumn(table, candidate)) return candidate;
  }
  throw new Error(`No supported id column found for ${table}`);
}

async function embedTable(table: OntologyTable) {
  const idColumn = await getIdColumn(table);
  const hasAliases = await hasColumn(table, "aliases");
  const hasDomainBlock = await hasColumn(table, "domain_block");
  const hasSubtechOf = await hasColumn(table, "subtech_of");
  const hasVendor = await hasColumn(table, "vendor");
  const hasLevel = await hasColumn(table, "level");
  const selectColumns =
    table === "tech_ontology"
      ? `${idColumn}, canonical_name, aliases, domain_block, subtech_of`
      : table === "certification_ontology"
        ? `${idColumn}, canonical_code, canonical_name, vendor, domain_block, level, aliases`
        : `${idColumn}, canonical_name`;
  const { data, error } = await supabase.from(table).select(selectColumns).is("embedding", null);

  if (error) throw error;
  if (!data || data.length === 0) return;

  for (const row of data) {
    const typedRow = row as Record<string, unknown> & {
      canonical_code?: string | null;
      canonical_name: string;
      vendor?: string | null;
      level?: string | null;
      aliases?: string[] | null;
      domain_block?: string | null;
      subtech_of?: string | null;
    };
    const aliases = hasAliases ? ((typedRow.aliases as string[] | null) ?? []) : [];
    const text =
      table === "certification_ontology"
        ? `${typedRow.canonical_code ?? typedRow.canonical_name}. ${typedRow.canonical_name}. Vendor: ${hasVendor ? ((typedRow.vendor as string | null) ?? "none") : "none"}. Domain: ${hasDomainBlock ? ((typedRow.domain_block as string | null) ?? "none") : "none"}. Level: ${hasLevel ? ((typedRow.level as string | null) ?? "none") : "none"}. Aliases: ${aliases.join(", ")}`
        : `${typedRow.canonical_name}. Aliases: ${aliases.join(", ")}. Domain: ${hasDomainBlock ? ((typedRow.domain_block as string | null) ?? "none") : "none"}. Parent: ${hasSubtechOf ? ((typedRow.subtech_of as string | null) ?? "none") : "none"}`;

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    await supabase
      .from(table)
      .update({ embedding: embedding.data[0].embedding })
      .eq(idColumn, typedRow[idColumn] as string);
  }
}

async function run() {
  await embedTable("tech_ontology");
  await embedTable("task_ontology");
  await embedTable("certification_ontology");
  console.log("Ontology embedding complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
