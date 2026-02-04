export type TranscriptBlock = {
  speaker?: string;
  text?: string;
};

export type TranscriptInput = {
  blocks: TranscriptBlock[];
  transcript_signal_ids: string[];
};
