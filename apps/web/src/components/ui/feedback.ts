export type FeedbackTone = 'error' | 'success';

export interface Feedback {
  tone: FeedbackTone;
  message: string;
}

export function deriveFeedback(error: string, success: string): Feedback | null {
  if (error) {
    return { tone: 'error', message: error };
  }
  if (success) {
    return { tone: 'success', message: success };
  }
  return null;
}
