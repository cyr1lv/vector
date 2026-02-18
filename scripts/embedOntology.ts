import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function hasColumn(table: "tech_ontology" | "task_ontology", column: string) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (!error) return true;
  if (error.code === "42703") return false;
  throw error;
}

async function getIdColumn(table: "tech_ontology" | "task_ontology") {
  const candidates = ["id", "task_id", "uuid", "canonical_name"];
  for (const candidate of candidates) {
    if (await hasColumn(table, candidate)) return candidate;
  }
  throw new Error(`No supported id column found for ${table}`);
}

async function embedTable(table: "tech_ontology" | "task_ontology") {
  const idColumn = await getIdColumn(table);
  const hasAliases = await hasColumn(table, "aliases");
  const hasDomainBlock = await hasColumn(table, "domain_block");
  const hasSubtechOf = await hasColumn(table, "subtech_of");
  const selectColumns =
    table === "tech_ontology"
      ? `${idColumn}, canonical_name, aliases, domain_block, subtech_of`
      : `${idColumn}, canonical_name`;
  const { data, error } = await supabase.from(table).select(selectColumns).is("embedding", null);

  if (error) throw error;
  if (!data || data.length === 0) return;

  for (const row of data) {
    const typedRow = row as Record<string, unknown> & {
      canonical_name: string;
      aliases?: string[] | null;
      domain_block?: string | null;
      subtech_of?: string | null;
    };
    const aliases = hasAliases ? ((typedRow.aliases as string[] | null) ?? []) : [];
    const domainBlock = hasDomainBlock ? ((typedRow.domain_block as string | null) ?? "none") : "none";
    const subtechOf = hasSubtechOf ? ((typedRow.subtech_of as string | null) ?? "none") : "none";
    const text = `${typedRow.canonical_name}. Aliases: ${aliases.join(", ")}. Domain: ${domainBlock}. Parent: ${subtechOf}`;

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
  console.log("Ontology embedding complete");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
