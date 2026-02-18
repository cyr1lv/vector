import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedTable(table: "tech_ontology" | "task_ontology") {
  const { data, error } = await supabase
    .from(table)
    .select("id, canonical_name, aliases, description")
    .is("embedding", null);

  if (error) throw error;
  if (!data || data.length === 0) return;

  for (const row of data) {
    const text = [row.canonical_name, ...(row.aliases ?? []), row.description ?? ""].join(" | ");

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    await supabase
      .from(table)
      .update({ embedding: embedding.data[0].embedding })
      .eq("id", row.id);
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
