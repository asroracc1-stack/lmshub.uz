export class SpeechSynthesisService {
  private synth: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    }
  }

  public speak(text: string, lang = "uz-UZ") {
    if (!this.synth) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice based on language
    const voices = this.synth.getVoices();
    
    // Determine target lang code (e.g. 'uz' or 'en')
    const shortLang = lang.split("-")[0].toLowerCase();
    
    // Try to find matching voice
    const voice = voices.find((v) => {
      const vLang = v.lang.toLowerCase();
      return vLang.startsWith(shortLang) || vLang.includes(shortLang);
    });

    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    this.synth.speak(utterance);
  }

  public cancel() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const speechSynthesisService = new SpeechSynthesisService();
