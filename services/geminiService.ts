
import { EmotionalKeyData } from "../types";
import { getLocalInsight } from "../constants/insights";

export const generateEmotionalInsight = async (data: EmotionalKeyData): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getLocalInsight(data.musicalKey));
    }, 300);
  });
};
