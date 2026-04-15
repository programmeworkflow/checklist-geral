import { useRef, useState, useCallback } from 'react';
import { read, utils, writeFile } from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileSpreadsheet, X, Download } from 'lucide-react';
import { toast } from 'sonner';

interface ColumnDef {
  header: string; // expected column name
  label: string;  // display label
  required?: boolean;
}

interface GenericExcelImportProps {
  title: string;
  columns: ColumnDef[];
  onImport: (rows: Record<string, string>[]) => { created: number; skipped: number };
}

interface ParsedRow {
  row: number;
  data: Record<string, string>;
  error?: string;
}

export function GenericExcelImport({ title, columns, onImport }: GenericExcelImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = useCallback(() => {
    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet([columns.map(c => c.header)]);
    // Set column widths
    ws['!cols'] = columns.map(() => ({ wch: 25 }));
    utils.book_append_sheet(wb, ws, 'Modelo');
    const safeName = title.replace(/[^a-zA-Z0-9À-ú ]/g, '').replace(/\s+/g, '_');
    writeFile(wb, `modelo_${safeName}.xlsx`);
    toast.success('Modelo baixado');
  }, [columns, title]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) {
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

        if (data.length === 0) {
          toast.error('Planilha vazia.');
          return;
        }

        // Validate headers
        const headers = (data[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
        const expectedHeaders = columns.map(c => c.header.toLowerCase());
        const missingHeaders = columns.filter((c, i) => !headers.includes(expectedHeaders[i]));

        if (missingHeaders.length > 0) {
          toast.error(`Colunas obrigatórias não encontradas: ${missingHeaders.map(c => c.header).join(', ')}. Verifique o formato da planilha.`);
          e.target.value = '';
          return;
        }

        // Map column indices
        const colIndices = expectedHeaders.map(h => headers.indexOf(h));

        const rows: ParsedRow[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.every((cell: any) => !cell)) continue;

          const rowData: Record<string, string> = {};
          let error: string | undefined;

          columns.forEach((col, ci) => {
            const val = String(row?.[colIndices[ci]] || '').trim();
            rowData[col.header] = val;
            if (col.required && !val) {
              error = `${col.label} vazio na linha ${i + 1}`;
            }
          });

          rows.push({ row: i + 1, data: rowData, error });
        }

        if (rows.length === 0) {
          toast.error('Nenhum dado válido encontrado.');
          return;
        }
        setPreview(rows);
      } catch {
        toast.error('Erro ao ler o arquivo.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const doImport = () => {
    if (!preview) return;
    setImporting(true);
    const validRows = preview.filter(r => !r.error);
    const result = onImport(validRows.map(r => r.data));
    const errors = preview.filter(r => r.error);
    setImporting(false);
    setPreview(null);
    toast.success(
      `Importação concluída: ${result.created} registro(s) criado(s).` +
      (result.skipped > 0 ? ` ${result.skipped} duplicado(s) ignorado(s).` : '') +
      (errors.length > 0 ? ` ${errors.length} linha(s) com erro.` : '')
    );
  };

  const errors = preview?.filter(r => r.error) || [];
  const valid = preview?.filter(r => !r.error) || [];

  return (
    <Card className="p-4 space-y-4 border-dashed border-2 border-muted-foreground/30">
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

      {!preview ? (
        <div className="text-center space-y-3">
          <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{title}</p>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 inline-block text-left">
            <p className="font-semibold mb-1">Formato da planilha:</p>
            {columns.map((c, i) => (
              <p key={c.header}>Coluna {i + 1}: {c.label}</p>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => fileRef.current?.click()} className="min-h-[44px]">
              <Upload className="h-4 w-4 mr-2" /> Selecionar planilha
            </Button>
            <Button variant="outline" onClick={downloadTemplate} className="min-h-[44px]">
              <Download className="h-4 w-4 mr-2" /> Baixar modelo
            </Button>
          </div>
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
                  {columns.map(c => (
                    <th key={c.header} className="px-2 py-1.5 text-left">{c.label}</th>
                  ))}
                  <th className="px-2 py-1.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className={r.error ? 'bg-destructive/10' : ''}>
                    <td className="px-2 py-1">{r.row}</td>
                    {columns.map(c => (
                      <td key={c.header} className="px-2 py-1">{r.data[c.header] || '—'}</td>
                    ))}
                    <td className="px-2 py-1">
                      {r.error ? <span className="text-destructive">{r.error}</span> : '✓'}
                    </td>
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
