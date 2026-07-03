import { z } from "zod";
import { messageChannelSchema, messageDraftKindSchema } from "../enums";

// The LLM composes the actual message text (tone/wording is its job, guided
// by the followups skill) — this schema just persists what it wrote. Never
// sends anything; see CLAUDE.md tool 6.
export const createMessageDraftSchema = z.object({
  kind: messageDraftKindSchema,
  channel: messageChannelSchema,
  relatedEntity: z.string().min(1),
  relatedEntityId: z.string().min(1),
  body: z.string().min(1),
  generatedBy: z.string().min(1),
});
export type CreateMessageDraftInput = z.input<typeof createMessageDraftSchema>;
