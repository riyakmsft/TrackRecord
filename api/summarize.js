const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    Accomplishments: { type: "array", items: { type: "string" } },
    Challenges: { type: "array", items: { type: "string" } },
    Collaboration: { type: "array", items: { type: "string" } },
    Growth: { type: "array", items: { type: "string" } },
    Impact: { type: "array", items: { type: "string" } },
  },
  required: ["Accomplishments", "Challenges", "Collaboration", "Growth", "Impact"],
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  const reflections = request.body?.reflections;
  if (!Array.isArray(reflections) || reflections.length === 0 || reflections.length > 52) {
    response.status(400).json({ error: "Provide between one and 52 reflections" });
    return;
  }

  const reflectionText = reflections.map((reflection) => ({
    week: String(reflection.week || "Unknown week"),
    answers: Array.isArray(reflection.answers) ? reflection.answers : [],
  }));

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "You summarize weekly work reflections. Combine repeated ideas, keep meaningful names and outcomes, and produce no more than four concise bullets per category. Do not invent details.",
          },
          {
            role: "user",
            content: `Group these reflections into the requested categories. Question order is: projects/tasks, what went well, challenges, what would change, collaboration, new skills. Use projects/tasks for Accomplishments, challenges for Challenges, collaboration for Collaboration, what would change plus new skills for Growth, and what went well for Impact.\n\n${JSON.stringify(reflectionText)}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "trackrecord_summary",
            strict: true,
            schema: summarySchema,
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      response.status(502).json({ error: "The summarization service returned an error" });
      return;
    }

    const result = await aiResponse.json();
    const outputText = result.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("Missing structured output");

    response.status(200).json({ summary: JSON.parse(outputText) });
  } catch {
    response.status(502).json({ error: "Unable to generate summary" });
  }
}
