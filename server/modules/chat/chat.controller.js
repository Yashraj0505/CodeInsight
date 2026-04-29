// Chat Controller
// Handle chat-related requests

export const sendMessage = (req, res) => {
  res.json({ message: 'Send message endpoint' });
};

export const getConversation = (req, res) => {
  res.json({ message: 'Get conversation endpoint' });
};
