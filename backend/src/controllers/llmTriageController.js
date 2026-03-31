// backend/src/controllers/llmTriageController.js
import Groq from "groq-sdk";

/**
 * POST /api/llm-triage
 * Body: { patientData: { ... } }
 * Returns: { triage: string }
 */
export const llmTriage = async (req, res) => {
  console.log('[LLM] Loaded API Key:', process.env.GROQ_API_KEY);
  console.log('[LLM] /api/llm-triage called', req.body);
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not set" });
    const { patientData } = req.body;
    if (!patientData) return res.status(400).json({ error: "Missing patientData" });

    const groq = new Groq({ apiKey });
    const prompt = `You are a medical triage assistant. Analyze the following patient data and provide:\n1) Triage level (Critical, Caution, or Normal)\n2) Short explanation\n3) Actionable recommendations\nBe concise and clear for medics in the field.\n\nPatient data: ${JSON.stringify(patientData)}`;
    let result = "";
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "user", content: prompt },
      ],
      max_tokens: 512,
      stream: true,
    });
    for await (const chunk of stream) {
      result += chunk.choices?.[0]?.delta?.content || "";
    }
    return res.json({ triage: result });
  } catch (e) {
    console.error("[LLM] Error:", e);
    return res.status(500).json({ error: e.message || "LLM error" });
  }
};
