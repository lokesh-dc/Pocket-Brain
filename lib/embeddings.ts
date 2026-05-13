import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);

export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    // Switched to gemini-embedding-2. 
    // This model returns 3072 dimensions in this API version.
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });
    const result = await model.embedContent(text);
    const values = result.embedding.values;
    
    if (!values || values.length === 0) {
      console.error('Embedding generation returned empty values');
      return null;
    }
    
    console.log(`Generated embedding with ${values.length} dimensions`);
    return values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
};
