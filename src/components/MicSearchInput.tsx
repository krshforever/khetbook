import { useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useVoice } from "@/hooks/use-voice";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  inputMode?: "text" | "tel" | "decimal" | "numeric" | "search";
}

/** Text input with a mic button on the right that dictates into the field. */
export function MicSearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
  inputMode = "search",
}: Props) {
  const { state } = useStore();
  const voice = useVoice(state.settings.voiceLang);
  const lastTranscript = useRef("");

  useEffect(() => {
    if (!voice.listening && voice.transcript && voice.transcript !== lastTranscript.current) {
      lastTranscript.current = voice.transcript;
      onChange(voice.transcript);
    }
  }, [voice.listening, voice.transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        className="font-hindi h-14 pr-14 text-lg"
      />
      {voice.supported && (
        <button
          type="button"
          onClick={voice.listening ? voice.stop : voice.start}
          aria-label="आवाज़ से खोजें"
          className={cn(
            "absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-md active:scale-95",
            voice.listening && "pulse-mic",
          )}
        >
          {voice.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
