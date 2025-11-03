
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { UploadedFile } from '../types';

if (!process.env.API_KEY) {
  // This is a placeholder check. In a real environment, the key would be set.
  // In this sandboxed environment, we assume it's available.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const SYSTEM_PROMPT_BASE = `You are Verum Omnis, a court-style Legal & Forensic AI operating under the strict "Verum Gift Rules - V5" constitution. Your goal is to act as a lawyer-style assistant, analyze user-provided files against the V5 forensic and legal framework, and produce clear, court-style outputs. You are stateless.

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

BOUNDS & DISCLAIMER
- IMPORTANT: You provide information, drafting, and analysis only. This is NOT legal advice.
- Always recommend that the user consult a licensed legal professional.
- Refer to your outputs as “court-style” or “designed to be court-ready,” never as guaranteed admissible evidence.
`;

const SYSTEM_PROMPT_ANALYST = SYSTEM_PROMPT_BASE + `
OUTPUT PROTOCOLS & FORMATTING (MANDATORY)
- Your response MUST be a court-style report formatted with Markdown.
- The report MUST contain these exact H2 headers: "## Summary", "## Key Findings", "## Contradictions & Risks", "## Draft Language", "## Next Steps", and "## Sealing Metadata".
- Under "## Key Findings", structure your findings by the Brain that discovered them (e.g., "### Forensic Brain (B2)", "### Legal Brain (B7)"). Cite the specific file and page number/timestamp for each point.
- Under "## Sealing Metadata", you must provide placeholder text for:
    - Certified SHA-512 Hash: [Placeholder for SHA-512 hash of this report]
    - Blockchain Anchor: [Placeholder for Ethereum Transaction ID]
    - Mined Block: [Placeholder for Block Number]
    - QR Metadata: {created_at: [Timestamp], file_count: [Number of files analyzed], hash: [SHA-512 Placeholder]}
    - And include the text: "✔ Patent Pending Verum Omnis"
`;

const PRELIMINARY_ANALYSIS_PROMPT = SYSTEM_PROMPT_BASE + `
Your current task is to perform a PRELIMINARY analysis. Do not generate the final user-facing report yet.
Instead, provide a structured breakdown of your initial findings and propose 1-3 potential legal strategies. Be concise. This output will be reviewed by another AI for a second opinion.
Structure your response with the following markdown headers:
- ## Preliminary Findings
- ## Proposed Strategies
`;

const SYNTHESIS_PROMPT = SYSTEM_PROMPT_BASE + `
You have completed your preliminary analysis and have now received a second opinion from another senior AI legal strategist.
Your task is to SYNTHESIZE your initial findings with the consultant's advice to produce the single best, comprehensive, and final court-style report for the user.
Your response must be a single, cohesive voice, not a dialogue between AIs.

OUTPUT PROTOCOLS & FORMATTING (MANDATORY)
- Your response MUST be a court-style report formatted with Markdown.
- The report MUST contain these exact H2 headers: "## Summary", "## Key Findings", "## Contradictions & Risks", "## Draft Language", "## Next Steps", and "## Sealing Metadata".
- Under "## Key Findings", structure your findings by the Brain that discovered them (e.g., "### Forensic Brain (B2)", "### Legal Brain (B7)"). Cite the specific file and page number/timestamp for each point.
- Under "## Sealing Metadata", you must provide placeholder text for:
    - Certified SHA-512 Hash: [Placeholder for SHA-512 hash of this report]
    - Blockchain Anchor: [Placeholder for Ethereum Transaction ID]
    - Mined Block: [Placeholder for Block Number]
    - QR Metadata: {created_at: [Timestamp], file_count: [Number of files analyzed], hash: [SHA-512 Placeholder]}
    - And include the text: "✔ Patent Pending Verum Omnis"
`;

const GEMINI_VERIFIER_SYSTEM_PROMPT = `You are an AI auditor. Your role is to verify the analysis performed by another AI against the "Verum Gift Rules V5".
Review the user's request, files, and the provided report.
- If the analysis is sound and follows the rules, respond with only: "Triple Verified: The primary AI's analysis is consistent with the Verum Omnis V5 protocol."
- If you find minor issues, respond with "Triple Verified with notes:" followed by a brief, bulleted list of observations.
- If you find a major flaw, respond with "Verification Failed:" followed by an explanation.
Your response must be a concise verification statement only.`;


const getFileParts = (files: UploadedFile[]) => {
  return files.map(file => ({
    inlineData: {
      mimeType: file.mimeType,
      // Fix: Use non-null assertion as base64 is guaranteed to exist on files passed here.
      data: file.base64!,
    },
  }));
};

export const getPreliminaryAnalysis = async (prompt: string, files: UploadedFile[], isComplex: boolean, location: { latitude: number; longitude: number } | null): Promise<string> => {
    const modelName = isComplex ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const fileParts = getFileParts(files);
    const locationInfo = location ? `\n\nUser's approximate location for jurisdictional context: Latitude ${location.latitude}, Longitude ${location.longitude}.` : '';
  
    const finalPrompt = `Analyze the following based on my request.\nUser Request: "${prompt}"\n${files.length > 0 ? `Files: ${files.map(f => f.name).join(', ')}` : ''}${locationInfo}`;
  
    const contents = { parts: [{ text: finalPrompt }, ...fileParts] };
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: PRELIMINARY_ANALYSIS_PROMPT,
        ...(isComplex && { thinkingConfig: { thinkingBudget: 32768 } }),
      },
    });
  
    return response.text;
};

export const synthesizeFinalReport = async (prompt: string, files: UploadedFile[], preliminaryAnalysis: string, consultantAdvice: string, isComplex: boolean, location: { latitude: number; longitude: number } | null): Promise<string> => {
    const modelName = isComplex ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const fileParts = getFileParts(files);
    const locationInfo = location ? `\n\nUser's approximate location for jurisdictional context: Latitude ${location.latitude}, Longitude ${location.longitude}.` : '';

    const finalPrompt = `
Original User Request: "${prompt}"
${files.length > 0 ? `Files: ${files.map(f => f.name).join(', ')}` : ''}
${locationInfo}

Your Preliminary Analysis:
---
${preliminaryAnalysis}
---

Consultant AI's Strategic Advice:
---
${consultantAdvice}
---

Synthesize these inputs into the final report.`

    const contents = { parts: [{ text: finalPrompt }, ...fileParts] };
      
    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
            systemInstruction: SYNTHESIS_PROMPT,
            ...(isComplex && { thinkingConfig: { thinkingBudget: 32768 } }),
        },
    });

    return response.text;
};


export const generateSimpleChat = async (prompt: string, location: { latitude: number; longitude: number } | null): Promise<GenerateContentResponse> => {
    const locationInfo = location ? `\n\nUser's approximate location for jurisdictional context: Latitude ${location.latitude}, Longitude ${location.longitude}. Use this to infer the likely legal jurisdiction unless otherwise specified.` : '';
    
    const finalPrompt = `
User Request: "${prompt}"
${locationInfo}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: finalPrompt }] },
        config: {
            systemInstruction: SYSTEM_PROMPT_ANALYST,
        },
    });
    return response;
};

export const verifyAnalysisWithGemini = async (
    originalPrompt: string,
    files: UploadedFile[],
    reportToVerify: string
  ): Promise<string> => {
    const fileParts = getFileParts(files);
    const fileInfo = files.map(f => ` - ${f.name} (${f.mimeType})`).join('\n');
  
    const finalPrompt = `
  **Original User Request:**
  "${originalPrompt}"
  
  **Attached Files:**
  ${fileInfo || 'None'}
  
  **AI Report to Verify:**
  ---
  ${reportToVerify}
  ---
  `;
  
    const contents = { parts: [{ text: finalPrompt }, ...fileParts] };
  
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Use a fast model for verification
      contents: contents,
      config: {
        systemInstruction: GEMINI_VERIFIER_SYSTEM_PROMPT,
      },
    });
  
    return response.text;
  };