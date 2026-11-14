import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processarFilaEmails } from "./functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processarFilaEmails],
});
