import { useRef, useState } from 'react';
import { read, utils } from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { sectorsStore, functionsStore } from '@/lib/storage';

interface ExcelImportProps {
  companyId: string;
  companyName: string;
  onComplete: () => void;
}

interface ParsedRow {
  row: number;
  setor: string;
  cargo: string;
  error?: string;
}

export function ExcelImport({ companyId, companyName, onComplete }: ExcelImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Formato inválido. Envie um arquivo .xlsx');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = read(evt.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[][] = utils.sheet_to_json(ws, { header: 1 });

        const rows: ParsedRow[] = [];
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const setor = String(row?.[0] || '').trim();
          const cargo = String(row?.[1] || '').trim();

          if (!setor && !cargo) continue;
          // Skip header row
          if (i === 0 && (setor.toLowerCase() === 'setor' || cargo.toLowerCase() === 'cargo')) continue;

          const error = !setor ? 'Setor vazio' : !cargo ? 'Cargo vazio' : undefined;
          rows.push({ row: i + 1, setor, cargo, error });
        }

        if (rows.length === 0) {
          toast.error('Planilha vazia ou sem dados válidos.');
          return;
        }
        setPreview(rows);
      } catch {
        toast.error('Erro ao ler o arquivo. Verifique o formato.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const doImport = async () => {
    if (!preview) return;
    setImporting(true);

    try {
      const validRows = preview.filter(r => !r.error);
      const existingSectors = await sectorsStore.getAll();
      const existingFunctions = await functionsStore.getAll();

      let sectorsCreated = 0;
      let functionsCreated = 0;
      const sectorMap = new Map<string, string>();

      // Map existing sectors for this company
      existingSectors
        .filter(s => s.companyId === companyId)
        .forEach(s => sectorMap.set(s.name.toLowerCase(), s.id));

      for (const r of validRows) {
        // Get or create sector
        let sectorId = sectorMap.get(r.setor.toLowerCase());
        if (!sectorId) {
          const newSector = await sectorsStore.add({ name: r.setor, companyId } as any);
          sectorId = newSector.id;
          sectorMap.set(r.setor.toLowerCase(), sectorId);
          sectorsCreated++;
        }

        // Check duplicate function
        const exists = existingFunctions.some(
          f => f.sectorId === sectorId && f.name.toLowerCase() === r.cargo.toLowerCase()
        );
        if (!exists) {
          await functionsStore.add({ name: r.cargo, sectorId } as any);
          functionsCreated++;
        }
      }

      const errors = preview.filter(r => r.error);
      setPreview(null);

      toast.success(
        `Importação concluída: ${sectorsCreated} setor(es) e ${functionsCreated} cargo(s) criados.` +
        (errors.length > 0 ? ` ${errors.length} linha(s) ignorada(s).` : '')
      );
      onComplete();
    } catch (err) {
      toast.error('Erro ao importar. Tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const errors = preview?.filter(r => r.error) || [];
  const valid = preview?.filter(r => !r.error) || [];

  return (
    <Card className="p-4 space-y-4 border-dashed border-2 border-muted-foreground/30">
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />

      {!preview ? (
        <div className="text-center space-y-3">
          <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Importar setores e cargos para <strong className="text-foreground">{companyName}</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Planilha .xlsx · Coluna A: Setor · Coluna B: Cargo
          </p>
          <Button onClick={() => fileRef.current?.click()} className="min-h-[44px]">
            <Upload className="h-4 w-4 mr-2" /> Selecionar planilha
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Pré-visualização</h4>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreview(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>✅ {valid.length} linha(s) válida(s)</p>
            {errors.length > 0 && <p className="text-destructive">⚠ {errors.length} linha(s) com erro</p>}
          </div>

          <div className="max-h-48 overflow-y-auto border border-border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left">Linha</th>
                  <th className="px-2 py-1.5 text-left">Setor</th>
                  <th className="px-2 py-1.5 text-left">Cargo</th>
                  <th className="px-2 py-1.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className={r.error ? 'bg-destructive/10' : ''}>
                    <td className="px-2 py-1">{r.row}</td>
                    <td className="px-2 py-1">{r.setor || '—'}</td>
                    <td className="px-2 py-1">{r.cargo || '—'}</td>
                    <td className="px-2 py-1">{r.error ? <span className="text-destructive">{r.error}</span> : '✓'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={doImport} disabled={valid.length === 0 || importing} className="min-h-[44px] w-full sm:w-auto">
              {importing ? 'Importando...' : `Importar ${valid.length} registro(s)`}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)} className="min-h-[44px] w-full sm:w-auto">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
