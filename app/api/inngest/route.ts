import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processarFilaEmails, autoRecuperacao } from "./functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processarFilaEmails, autoRecuperacao],
});
