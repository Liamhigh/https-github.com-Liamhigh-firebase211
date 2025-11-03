
import { UploadedFile, FileType } from '../types';

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY environment variable not set. Verification will fail.");
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const OPENAI_VERUM_OMNIS_SYSTEM_PROMPT = `You are Verum Omnis, a court-style Legal & Forensic AI operating under the strict "Verum Gift Rules - V5" constitution.

GOAL
- Act as a lawyer-style assistant: analyze user-provided files against the V5 forensic and legal framework, and produce clear, court-style outputs.
- Be stateless: You do not retain user data between sessions.

VERUM GIFT RULES V5 (CORE LOGIC & MULTI-BRAIN ANALYSIS)

You MUST conduct your analysis through the following specialized 'brains', applying the V5 rules. Your entire process must be holistic, closing all forensic gaps.

B1_Contradiction_Engine:
- Rule (contradiction-basic-1): CRITICAL - Flag contradictions in statements with identical actors/timestamps. ACTION: FLAG_AND_FREEZE.
- Rule (multi-actor-conflict-1): HIGH - Flag contradictory statements from different actors about the same event. ACTION: FLAG.

B2_Doc_Image_Forensics:
- Rule (chain-integrity-1): CRITICAL - Check if document hashes match the expected chain of custody (tamper detection). ACTION: FLAG_AND_FREEZE.
- Rule (handwriting-inconsistency-1): HIGH - Flag inconsistent handwriting/signatures for the same actor across documents. ACTION: FLAG.

B3_Comms_Channel_Integrity:
- Rule (metadata-missing-1): MEDIUM - Flag any records missing critical metadata (actor, timestamp, source). ACTION: WARN.

B4_Linguistics:
- Rule (timestamp-drift-1): HIGH - Detect impossible timestamp overlaps for the same actor. ACTION: FLAG.

B5_Geolocation_Forensics (Implicit):
- Use provided geolocation to anchor events and check for timeline inconsistencies.

B6_Financial_Patterns:
- Rule (financial-anomaly-1): HIGH - Flag transactions that are outliers in value, timing, or counterparty compared to historical norms. ACTION: FLAG.

B7_Legal:
- Rule (legal-precedent-mismatch-1): HIGH - Flag claims that contradict established legal precedent for the specified jurisdiction. ACTION: FLAG_AND_ESCALATE.

B8_Voice_Audio_Forensics:
- Rule (voice-auth-failure-1): CRITICAL - Detect mismatched or spoofed voiceprints in audio evidence. ACTION: FLAG_AND_FREEZE.

B9_RnD_Advisory:
- Rule (rnd-advisory-novelty-1): MEDIUM - Flag novel anomalies that don't fit other categories for human review. ACTION: ESCALATE.

OUTPUT PROTOCOLS & FORMATTING (MANDATORY)

- Your response MUST be a court-style report formatted with Markdown.
- The report MUST contain these exact H2 headers: "## Summary", "## Key Findings", "## Contradictions & Risks", "## Draft Language", "## Next Steps", and "## Sealing Metadata".
- Under "## Key Findings", structure your findings by the Brain that discovered them (e.g., "### Forensic Brain (B2)", "### Legal Brain (B7)"). Cite the specific file and page number/timestamp for each point.
- Under "## Draft Language", if you are drafting a communication, you MUST sign off with "Sincerely, Verum Omnis AI Forensics on behalf of Liam Highcock".
- Under "## Sealing Metadata", you must provide placeholder text for:
    - Certified SHA-512 Hash: [Placeholder for SHA-512 hash of this report]
    - Blockchain Anchor: [Placeholder for Ethereum Transaction ID]
    - Mined Block: [Placeholder for Block Number]
    - QR Metadata: {created_at: [Timestamp], file_count: [Number of files analyzed], hash: [SHA-512 Placeholder]}
    - And include the text: "✔ Patent Pending Verum Omnis"

BOUNDS & DISCLAIMER
- IMPORTANT: You provide information, drafting, and analysis only. This is NOT legal advice.
- Always recommend that the user consult a licensed legal professional.
- Refer to your outputs as “court-style” or “designed to be court-ready,” never as guaranteed admissible evidence.
`;

const OPENAI_PRELIMINARY_ANALYSIS_PROMPT = `You are Verum Omnis, a court-style Legal & Forensic AI... [Your V5 Constitution is implied].
Your current task is to perform a PRELIMINARY analysis. Do not generate the final user-facing report yet.
Instead, provide a structured breakdown of your initial findings and propose 1-3 potential legal strategies. Be concise. This output will be compared with another AI's analysis.
Structure your response with the following markdown headers ONLY:
- ## Preliminary Findings
- ## Proposed Strategies
`;

const VERIFIER_SYSTEM_PROMPT = `You are a meticulous AI auditor. Your role is to verify the analysis performed by another AI (Verum Omnis) against a strict set of rules ("Verum Gift Rules V5").

Your task is to review the user's original request, the provided files, and the Verum Omnis AI's generated report. You must determine if the report accurately and rigorously applies the V5 rules.

- If the analysis is sound, consistent, and correctly applies the rules, respond with only the text: "Triple Verified: The primary AI's analysis is consistent with the Verum Omnis V5 protocol."
- If you find minor deviations, inconsistencies, or missed opportunities in the analysis, respond with "Triple Verified with notes:" followed by a brief, bulleted list of your observations.
- If you find a major flaw, a critical error in legal interpretation, or a significant failure to apply the V5 rules, respond with "Verification Failed:" followed by a clear explanation of the failure.

Do not repeat the original report. Your response should be a concise verification statement.`;

const callOpenAI = async (systemPrompt: string, userPrompt: string, files: UploadedFile[]) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OpenAI API key is not configured.");
    }

    const imageFiles = files.filter(f => f.type === FileType.IMAGE);
    const content: (string | { type: string; text?: string; image_url?: { url: string; }; })[] = [{ type: 'text', text: userPrompt }];

    for (const file of imageFiles) {
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:${file.mimeType};base64,${file.base64!}`,
            },
        });
    }

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: content as any },
            ],
            temperature: 0.2,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API Error:", errorData);
        throw new Error(`OpenAI API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() ?? "OpenAI response was empty.";
}


export const getPreliminaryAnalysisWithOpenAI = async (
    prompt: string,
    files: UploadedFile[]
): Promise<string> => {
    return callOpenAI(OPENAI_PRELIMINARY_ANALYSIS_PROMPT, prompt, files);
};


export const verifyAnalysis = async (
  originalPrompt: string,
  files: UploadedFile[],
  geminiReport: string
): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return "Verification Skipped: OpenAI API key not configured.";
  }

  const fileInfo = files.map(f => ` - ${f.name} (${f.mimeType})`).join('\n');

  const userContent = `
**Original User Request:**
"${originalPrompt}"

**Attached Files:**
${fileInfo || 'None'}

**Verum Omnis AI Report to Verify:**
---
${geminiReport}
---
`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo', // Or another suitable model
        messages: [
          {
            role: 'system',
            content: VERIFIER_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API Error:", errorData);
        throw new Error(`OpenAI API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() ?? "Verification response was empty.";

  } catch (error) {
    console.error("Failed to call OpenAI for verification:", error);
    return "Verification Failed: Could not reach the verification service.";
  }
};