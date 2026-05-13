import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY!);
export const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export const classifyText = async (text: string) => {
  // To be implemented
};

export const extractEntities = async (text: string) => {
  // To be implemented
};
