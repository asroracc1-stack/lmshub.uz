export interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
    length: number;
  };
}

export interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export interface SpeechRecognitionOptions {
  lang?: string;
  onResult: (transcript: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
  onStart: () => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public start({ lang = "uz-UZ", onResult, onError, onEnd, onStart }: SpeechRecognitionOptions) {
    if (!this.recognition) {
      onError("Speech Recognition not supported in this browser.");
      return;
    }

    this.recognition.lang = lang;

    this.recognition.onstart = () => {
      onStart();
    };

    this.recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      onError(event.error);
    };

    this.recognition.onend = () => {
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      // If already started, ignore or stop first
      if (e.name === "InvalidStateError") {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 100);
      } else {
        onError(e.message || "Failed to start recognition");
      }
    }
  }

  public stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
