import { useState, useRef, useCallback, useEffect } from 'react';
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
  const baseValueRef = useRef('');

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopListening(), [stopListening]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Reconhecimento de voz não suportado neste navegador');
      return;
    }

    // Congela o valor atual como base (não muda enquanto a voz roda)
    baseValueRef.current = value || '';

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    // Recompute full transcript from event.results every time — evita acumular/duplicar
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        // Espaço só entre resultados finais
        if (event.results[i].isFinal && i < event.results.length - 1) {
          transcript += ' ';
        }
      }
      const base = baseValueRef.current;
      const sep = base && transcript ? ' ' : '';
      onChange((base + sep + transcript).trim());
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Permissão de microfone negada');
      } else if (event.error === 'no-speech') {
        // ignora silenciosamente — usuário pode ter pausado
      } else if (event.error !== 'aborted') {
        toast.error(`Erro de voz: ${event.error}`);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [value, onChange]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
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
