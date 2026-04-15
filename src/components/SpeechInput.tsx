import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface SpeechInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  className?: string;
  rows?: number;
}

// Extend Window for webkitSpeechRecognition
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
  resultIndex: number;
}

export function SpeechInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  required = false,
  className = '',
  rows = 3,
}: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Reconhecimento de voz não suportado neste navegador');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = value || '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if ((event.results[i] as any).isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + transcript;
        } else {
          interim += transcript;
        }
      }
      onChange(finalTranscript + (interim ? ' ' + interim : ''));
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Permissão de microfone negada');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [value, onChange]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const inputClassName = `pr-10 text-base ${className}`;

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={inputClassName}
          rows={rows}
        />
      ) : (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={inputClassName}
        />
      )}
      <button
        type="button"
        onClick={toggleListening}
        className={`absolute right-2 ${multiline ? 'top-2' : 'top-1/2 -translate-y-1/2'} p-1.5 rounded-md transition-colors ${
          isListening
            ? 'bg-destructive text-destructive-foreground animate-pulse'
            : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
        }`}
        title={isListening ? 'Parar gravação' : 'Gravar áudio'}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
    </div>
  );
}
