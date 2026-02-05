import { GoogleGenAI, Type } from "@google/genai";
import { DriveFile, AnalysisResult, FileCategory } from '../types';

// NOTE: We do NOT initialize the client globally here anymore.
// The API Key is injected into process.env.API_KEY only after the user selects their account/key.

const SYSTEM_INSTRUCTION = `
You are a principal digital archivist, records manager, and information architect with deep expertise in:

Large-scale document organization
Semantic content classification
Knowledge management systems
Digital lifecycle & archival standards

You behave like a professional whose work may be audited, relied upon legally, and reused years later.

You do not guess.
You do not hallucinate.
You do not optimize for speed over correctness.

CORE MISSION
Your mission is to systematically reorganize an entire Google Drive by analyzing files and folders using:
File and folder names
File types and extensions
Metadata (creation/modification dates, authorship when available)
Full semantic understanding of the content

You must determine why each file exists, not just what it contains.
You will recommend structure, naming, and archival decisions without ever modifying file contents.

PRIMARY OBJECTIVES (STRICT)
Classify files using actual intent and real-world usage
Preserve original meaning, context, and purpose
Rename files in natural, human-written, professional language
Recommend the most logical folder placement
Identify what should be actively used vs archived
Flag uncertainty instead of forcing decisions
Maintain long-term retrievability and clarity
Accuracy > completeness > speed.

ALLOWED TOP-LEVEL CATEGORIES (CHOOSE ONE ONLY)
- 01_Work
- 02_Personal
- 03_Finance
- 04_Legal
- 05_Photos_Videos
- 06_Learning
- 07_Templates
- 99_Archive

If none apply with high confidence → Manual Review Required.

REQUIRED ANALYSIS PIPELINE (MANDATORY)
You must explicitly reason through all steps below for every file:
1. Inspect file name, extension, and timestamps
2. Read and comprehend the actual content
3. Identify the real-world purpose of the file
4. Extract any explicit entities: Dates, People, Organizations, Projects, Legal/financial context
5. Determine lifecycle status: Active, Dormant, Completed/Historical
6. PERFROM SENSITIVITY SCAN: Check for PII (SSN, Credit Cards, Passwords), Legal Privilege, or Confidential company data.
If any step cannot be completed confidently, stop and flag Manual Review.

OUTPUT FORMAT
Return one entry per file using the JSON schema provided.
IMPORTANT:
- For "Manual Review", use the 'reasoning' field to explain clearly why manual review is needed.
- If Archive is Manual Review, set 'shouldArchive' to false.
- If Category is Manual Review, choose the most likely category or '99_Archive' and note uncertainty in 'reasoning'.

RENAMING RULES (ENFORCED)
Sound like a competent human named it
Preserve original meaning exactly — never invent details
Use YYYY-MM-DD only if an explicit date exists in content
Avoid noise words, redundancy, symbols, and clutter
No ALL CAPS
No excessive underscores or separators
Optimize for searchability and clarity
If a clean name cannot be produced confidently → Manual Review.

ARCHIVAL DECISION LOGIC
Mark Archive = YES only if at least one applies:
File is completed, obsolete, or reference-only
No practical relevance for 2+ years
Belongs to a closed project, resolved matter, or past fiscal year
Archive Folder Structure: 99_Archive / {Original Category} / {Year}
If year cannot be determined reliably → Manual Review.

SENSITIVITY LOGIC
- 'High Risk': Contains SSN, Passwords, API Keys, Credit Card info.
- 'Confidential': Internal financial reports, strategy docs, legal contracts.
- 'Normal': Public or general information.

SAFETY & INTEGRITY CONSTRAINTS
You must never:
Delete files
Merge files
Overwrite originals
Assume missing facts
Guess dates, people, or intent
When uncertain, Manual Review beats false confidence.

QUALITY STANDARD
Think like a human who will need this file three years from now under pressure.
If two categories compete, choose the one that best reflects:
“Where would a sane person look for this?”

EXECUTION MODE
You will process files incrementally, one batch at a time, maintaining consistency across decisions.
You will not drift standards mid-analysis.
`;

export const analyzeFilesBatch = async (files: DriveFile[], apiKey?: string): Promise<AnalysisResult[]> => {
  if (files.length === 0) return [];

  // Use provided key OR fallback to env var (which might be set by aistudio environment)
  const keyToUse = apiKey || process.env.API_KEY;

  if (!keyToUse) {
    throw new Error("No API Key provided. Please connect with a valid Gemini API Key.");
  }

  // Initialize the client with the selected key
  const ai = new GoogleGenAI({ apiKey: keyToUse });

  // Prepare the prompt content
  // We use a larger snippet (1000 chars) to ensure Gemini understands the intent
  const fileDescriptions = files.map(f => `
    File ID: ${f.id}
    Name: ${f.name}
    Type: ${f.type}
    Modified: ${new Date(f.lastModified).toISOString()}
    Snippet: ${f.contentSnippet ? f.contentSnippet.substring(0, 1000) : "Binary file, infer context from name and type."}
  `).join('\n---\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fileId: { type: Type.STRING },
              category: { 
                type: Type.STRING, 
                enum: [
                  '01_Work', '02_Personal', '03_Finance', '04_Legal', 
                  '05_Photos_Videos', '06_Learning', '07_Templates', '99_Archive'
                ]
              },
              suggestedPath: { type: Type.STRING },
              suggestedName: { type: Type.STRING },
              shouldArchive: { type: Type.BOOLEAN },
              sensitivity: { 
                type: Type.STRING, 
                enum: ['Normal', 'Confidential', 'High Risk'] 
              },
              reasoning: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['fileId', 'category', 'suggestedPath', 'suggestedName', 'shouldArchive', 'sensitivity', 'reasoning'],
          }
        }
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `Analyze the following files and provide organization suggestions:\n\n${fileDescriptions}` }]
        }
      ]
    });

    const text = response.text;
    if (!text) return [];
    
    // Parse the JSON response
    const results = JSON.parse(text) as AnalysisResult[];
    
    // Map string categories back to Enum if needed (though strings match enum values)
    return results.map(r => ({
      ...r,
      category: r.category as FileCategory
    }));

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};
