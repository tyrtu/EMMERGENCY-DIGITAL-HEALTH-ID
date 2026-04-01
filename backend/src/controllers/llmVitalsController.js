import Groq from "groq-sdk";
import medicalAssistantSystemPrompt from "../prompts/medicalAssistantSystemPrompt.js";

/**
 * POST /api/llm-vitals
 * Body: { vitals: { ... }, profile: { ... }, medical: { ... } }
 * Returns: { advice: string, anomalies: Array<{ vital: string, value: any, flag: string }> }
 */
export const llmVitals = async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY not set" });
    const { vitals, profile, medical } = req.body;
    if (!vitals) return res.status(400).json({ error: "Missing vitals" });

    const groq = new Groq({ apiKey });
    const userPrompt = `Analyze the following patient vitals and medical data.\n1) List any abnormal or concerning vital signs (with flag: high/low/critical/normal).\n2) Give a short, patient-friendly explanation for each flagged vital.\n3) Provide actionable, patient-appropriate advice.\nBe clear, concise, and use layman's terms.\n\nVitals: ${JSON.stringify(vitals)}\nProfile: ${JSON.stringify(profile)}\nMedical: ${JSON.stringify(medical)}`;
    let result = "";
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: medicalAssistantSystemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 512,
      stream: true,
    });
    for await (const chunk of stream) {
      result += chunk.choices?.[0]?.delta?.content || "";
    }
    return res.json({ advice: result });
  } catch (e) {
    // Removed API log for production cleanliness
    return res.status(500).json({ error: e.message || "LLM error" });
  }
};
