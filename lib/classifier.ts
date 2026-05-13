import { model } from './ai';

export interface ClassifiedResult {
  category: 'expense' | 'reading' | 'idea' | 'travel' | 'shopping' | 'health' | 'misc';
  entity: string | null;
  entity_type: 'book' | 'place' | 'project' | 'person' | 'brand' | null;
  amount: number | null;
  currency: 'INR' | null;
  summary: string;
}

export const classifyEntry = async (text: string): Promise<ClassifiedResult> => {
  const prompt = `
System: You are a personal log classifier. Given a user's raw text entry, extract the following and return ONLY valid JSON, no explanation, no markdown:
{
  "category": "expense | reading | idea | travel | shopping | health | misc",
  "entity": "the specific entity this belongs to or null",
  "entity_type": "book | place | project | person | brand | null",
  "amount": numeric amount if expense or null,
  "currency": "INR or null",
  "summary": "one line clean summary of the entry"
}

Rules:
- entity should be a proper noun when possible
- for expenses, entity is the subcategory (Food, Transport, etc)
- if nothing fits, category is misc and entity is null

User text: "${text}"
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();

    // Extract JSON from markdown if present, otherwise use the whole text
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : textResponse;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Classification error:', error);
    return {
      category: 'misc',
      entity: null,
      entity_type: null,
      amount: null,
      currency: null,
      summary: text,
    };
  }
};
