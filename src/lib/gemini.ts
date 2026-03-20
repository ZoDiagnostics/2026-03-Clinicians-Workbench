/**
 * Gemini AI Integration for ZoCW Copilot features.
 *
 * Uses the Gemini API via REST endpoint for clinical text generation.
 * In production, this should be proxied through a Cloud Function for security.
 * For demo/development, calls the API directly with an environment variable key.
 *
 * BRD Reference: ZCW-BRD-0297 — Copilot Auto-Draft
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3, // Low temperature for clinical accuracy
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response text from Gemini');
  }

  return text.trim();
}

/**
 * Generate a clinical impression from findings data.
 * BRD ZCW-BRD-0297 — Copilot Auto-Draft
 */
export async function generateClinicalImpression(
  findingsSummary: string,
  studyType: string,
  patientContext?: string
): Promise<string> {
  const prompt = `You are a clinical gastroenterology AI assistant helping a clinician write a capsule endoscopy report.

Study Type: ${studyType.replace(/_/g, ' ')}
${patientContext ? `Patient Context: ${patientContext}` : ''}

Findings:
${findingsSummary || 'No significant findings recorded.'}

Generate a concise clinical impression (2-4 sentences) summarizing the findings. Use professional medical language appropriate for a clinical endoscopy report. Focus on:
1. Overall assessment of the capsule endoscopy
2. Significance of any findings
3. Correlation with the clinical indication

Do NOT include recommendations — those will be generated separately.
Write ONLY the impression text, no headers or labels.`;

  return callGemini(prompt);
}

/**
 * Generate clinical recommendations from findings and impression.
 * BRD ZCW-BRD-0297 — Copilot Auto-Draft
 */
export async function generateRecommendations(
  findingsSummary: string,
  impression: string,
  studyType: string
): Promise<string> {
  const prompt = `You are a clinical gastroenterology AI assistant helping a clinician write recommendations for a capsule endoscopy report.

Study Type: ${studyType.replace(/_/g, ' ')}

Findings:
${findingsSummary || 'No significant findings recorded.'}

Clinical Impression:
${impression || 'Normal capsule endoscopy.'}

Generate concise clinical recommendations (2-4 bullet points). Include:
1. Follow-up timing (e.g., "Repeat capsule endoscopy in 12 months")
2. Any referrals needed (e.g., "Referral for colonoscopic polypectomy")
3. Medication or dietary guidance if relevant
4. Surveillance recommendations

Use professional medical language. Write ONLY the recommendations, no headers or labels. Use line breaks between items, not markdown bullets.`;

  return callGemini(prompt);
}

/**
 * Answer a clinical question about patient/procedure data.
 * For the AI Q&A feature.
 */
export async function askClinicalQuestion(
  question: string,
  context: string
): Promise<string> {
  const prompt = `You are a clinical AI assistant for the Zo Clinicians Workbench, a capsule endoscopy clinical workflow platform.

Available Context:
${context}

User Question: ${question}

Provide a helpful, accurate answer based on the available context. If the question cannot be answered from the provided context, say so clearly. Keep responses concise and clinically relevant.`;

  return callGemini(prompt);
}

/**
 * Check if the Gemini API is configured and reachable.
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
