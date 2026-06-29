import { api } from "@/lib/axios";

export const speakingService = {
  startSession: async (topic: string, level: string = "Intermediate (B2)", language: string = "English") => {
    const response = await api.post("/ai-speaking/session/start", { topic, level, language });
    return response.data;
  },

  sendChatMessage: async (message: string, sessionId: string, language: string = "English") => {
    const response = await api.post("/ai-speaking/chat", { message, sessionId, language });
    return response.data;
  },

  endSession: async (sessionId: string) => {
    const response = await api.post("/ai-speaking/session/end", { sessionId });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get("/ai-speaking/history");
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get("/ai-speaking/statistics");
    return response.data;
  }
};
