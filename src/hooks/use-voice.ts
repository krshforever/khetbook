import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;

function getCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoice(lang: "hi-IN" | "en-IN") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getCtor() !== null);
  }, []);

  const start = useCallback(async () => {
    const Ctor = getCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    try {
      // Explicitly trigger the WebView permission dialog for the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the microhone stream so the Web Speech API recognition can bind to it
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.error("Microphone permission error:", err);
      toast.error("माइक्रोफ़ोन अनुमति आवश्यक है! (Microphone permission is required)");
      setListening(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalTranscript += r[0].transcript + " ";
        } else {
          interimTranscript += r[0].transcript;
        }
      }
      setTranscript((finalTranscript + interimTranscript).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setListening(false);
    };
    recRef.current = rec;
    setTranscript("");
    setListening(true);
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }, [lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => setTranscript(""), []);

  return { listening, transcript, supported, start, stop, reset };
}
