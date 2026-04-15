import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Trash2, Upload } from 'lucide-react';

interface AudioRecorderProps {
  value?: string; // base64 audio data URL
  onChange: (value: string) => void;
  onClear: () => void;
}

export function AudioRecorder({ value, onChange, onClear }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) onChange(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setRecording(true);
    } catch {
      // Permission denied or not supported
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />

      {!value ? (
        <>
          {recording ? (
            <Button type="button" size="sm" variant="destructive" onClick={stopRecording} className="h-8 text-xs">
              <Square className="h-3 w-3 mr-1" /> Parar
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={startRecording} className="h-8 text-xs">
              <Mic className="h-3 w-3 mr-1" /> Gravar
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-8 text-xs">
            <Upload className="h-3 w-3 mr-1" /> Enviar
          </Button>
        </>
      ) : (
        <>
          <audio src={value} controls className="h-8 max-w-[200px]" />
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </>
      )}

      {recording && (
        <span className="text-xs text-destructive animate-pulse">● Gravando...</span>
      )}
    </div>
  );
}
