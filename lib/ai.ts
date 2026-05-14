import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
export const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export const retrieveEntries = async (query: string, entries: any[]) => {
  const prompt = `
System: You are a personal memory assistant. The user has a log of personal entries. Given their query and relevant entries, respond conversationally and concisely. Return ONLY valid JSON, no markdown:
{
  "answer": "conversational response, feel like a smart friend not a robot. For expenses always include total. For reading group by book. Keep it to 2-3 lines max.",
  "entry_ids": ["id1", "id2"],
  "type": "summary | list | single | aggregate"
}

Never make up entries not in the context.
If no relevant entries found, say so naturally.

Context entries: ${JSON.stringify(entries)}
User query: ${query}
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : textResponse;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Retrieval error:', error);
    return {
      answer: "I couldn't process your request right now.",
      entry_ids: [],
      type: 'summary'
    };
  }
};
