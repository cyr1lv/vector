export type PresentationSection = {
  title?: string;
  paragraphs?: { text?: string }[];
};

export type PresentationArtefact = {
  sections?: PresentationSection[];
  source_signals?: { signal_ids?: string[] };
};
