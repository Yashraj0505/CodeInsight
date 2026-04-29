// Chat Service
// Handle chat business logic

import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });

export const processMessage = async (question, context) => {
  // TODO: Implement message processing with Groq API
  return { answer: 'Mock response to: ' + question };
};

export const saveConversation = (userId, messages) => {
  // TODO: Implement conversation saving logic
  return { saved: true };
};
