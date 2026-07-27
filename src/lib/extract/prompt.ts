import { SENTINEL } from "@/lib/coach/types";

/**
 * The extraction prompt tells DeepSeek to find subjects, units, and dates
 * in a CBSE/ICSE syllabus PDF and return structured data.
 */
export function extractionPrompt(text: string): string {
  return `You are a curriculum parser for Indian school board syllabi (CBSE, ICSE, state boards). 

Given the text of a syllabus document below, extract:
1. The board name if mentioned (CBSE, ICSE, etc.)
2. The student's grade/class (e.g. "Class 10")
3. Every subject listed
4. For each subject, its units/chapters/topics
5. Exam dates if present (any date explicitly next to a subject or at the top of the document)

Return the data as a JSON object with this exact structure:

{
  "board": string or null,
  "grade": string or null,
  "subjects": [
    {
      "name": "Physics",
      "discipline": "Science",
      "examDate": "YYYY-MM-DD" or null if not found,
      "topics": [
        { "name": "Electricity" },
        { "name": "Magnetic Effects" }
      ]
    }
  ]
}

Rules:
- Assign each subject to its discipline (Science, Mathematics, Social Science, English, Language, etc.)
- CBSE Class 10 Science is typically split into Physics, Chemistry, Biology — extract them as separate subjects
- If exam dates are listed in Indian format (DD/MM/YYYY, DD-MMM-YYYY, DD Month YYYY), convert to YYYY-MM-DD
- If a subject has no named units, create a single topic with the subject's name
- Do not invent topics. Only include what's actually in the text
- Do not include mark allocations or page numbers

After the JSON, output on its own line exactly:
${SENTINEL}DONE

Syllabus text:
${text.slice(0, 60_000)}`;
}
