/**
 * Manual verification (run once, ~10 min)
 *
 * Prerequisites:
 * - Table vector_embeddings exists
 * - RPC match_vector_embeddings exists (run supabase/migrations/...)
 * - OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: npm run check:manual
 */

if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const { embedPresentation } = await import("../src/presentation/presentationEmbeddingAdapter.js");
const { embedTranscript } = await import("../src/conversations/transcriptEmbeddingAdapter.js");
const { embedText } = await import("../src/integrations/vector/embeddingClient.js");
const { findSimilarContext } = await import("../src/integrations/vector/vectorQuery.js");

const TENANT_ID = "manual-check-tenant";
const ACTOR_TYPE = "user";

async function run() {

  console.log("--- 1. Embed presentation artefact ---");
  const presentationArtefact = {
    sections: [
      { title: "Introductie", paragraphs: [{ text: "Dit is een presentatie over AI en machine learning." }] },
      { title: "Conclusie", paragraphs: [{ text: "We zien dat embeddings nuttig zijn voor context." }] },
    ],
    source_signals: { signal_ids: ["pres-sig-001", "pres-sig-002"] },
  };
  await embedPresentation({
    tenant_id: TENANT_ID,
    actor_type: ACTOR_TYPE,
    actor_ref_id: "pres-1",
    artefact: presentationArtefact,
  });
  console.log("OK: presentation embedded (source_ids:", presentationArtefact.source_signals!.signal_ids, ")");

  console.log("\n--- 2. Embed transcript ---");
  const transcript = {
    blocks: [
      { speaker: "Klant", text: "We zoeken naar een oplossing voor semantische zoekopdrachten." },
      { speaker: "Verkoper", text: "Onze vector-embedding aanpak past daar goed bij." },
    ],
    transcript_signal_ids: ["trans-sig-001", "trans-sig-002"],
  };
  await embedTranscript({
    tenant_id: TENANT_ID,
    actor_type: ACTOR_TYPE,
    actor_ref_id: "trans-1",
    transcript,
  });
  console.log("OK: transcript embedded (source_ids:", transcript.transcript_signal_ids, ")");

  console.log("\n--- 3. findSimilarContext: query over 'embedding en context' ---");
  const queryEmbedding = await embedText("embedding en context voor zoekopdrachten");
  const results = await findSimilarContext(TENANT_ID, queryEmbedding, 5);

  console.log("\n--- 4. Resultaten ---");
  results.forEach((r, i) => {
    console.log(`\n[${i + 1}] distance=${r.distance.toFixed(4)}`);
    console.log(`    source_type: ${r.source_type}`);
    console.log(`    source_ids:  ${JSON.stringify(r.source_ids)}`);
    console.log(`    actor_ref_id: ${r.actor_ref_id}`);
  });

  console.log("\n--- Check ---");
  console.log("- Resultaten logisch? Vergelijk distance: lager = meer vergelijkbaar.");
  console.log("- source_type correct? Moet 'presentation' of 'transcript' zijn.");
  console.log("- source_ids correct? Moet overeenkomen met de signal_ids die we ingestoken hebben.");
  console.log("- Waarom dichtbij? De query 'embedding en context voor zoekopdrachten' overlapt semantisch met beide teksten.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
