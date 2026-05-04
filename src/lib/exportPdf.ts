import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const A4_W = 210;
const A4_H = 297;
const MARGIN = 10;
const CONTENT_W = A4_W - MARGIN * 2;
const CONTENT_H = A4_H - MARGIN * 2;
const HEADER_H = 12; // mm reserved for page header/footer

export type PdfMode = 'download' | 'share';

export async function exportReportToPdf(element: HTMLElement, filename = 'relatorio', mode: PdfMode = 'download') {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) document.documentElement.classList.remove('dark');
  await new Promise(r => setTimeout(r, 150));

  // Forçar largura fixa de captura — em tablets/celulares a viewport real
  // é menor que 1100px e o html2canvas captura o tamanho EFETIVO do nó no
  // momento. Pra garantir layout idêntico em qualquer dispositivo, montamos
  // um stage offscreen com largura fixa, clonamos o relatório dentro dele,
  // e capturamos a partir do clone. No final removemos o stage.
  const PDF_CAPTURE_WIDTH = 1100;

  const stage = document.createElement('div');
  stage.style.position = 'fixed';
  stage.style.top = '0';
  stage.style.left = '-99999px';
  stage.style.width = `${PDF_CAPTURE_WIDTH}px`;
  stage.style.pointerEvents = 'none';
  stage.style.background = '#ffffff';
  stage.style.zIndex = '-1';

  const cloneRoot = element.cloneNode(true) as HTMLElement;
  cloneRoot.style.width = `${PDF_CAPTURE_WIDTH}px`;
  cloneRoot.style.maxWidth = `${PDF_CAPTURE_WIDTH}px`;
  cloneRoot.style.margin = '0';
  stage.appendChild(cloneRoot);
  document.body.appendChild(stage);

  // Espera 1 frame pra layout/fontes/imagens reflowar com a nova largura
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await new Promise(r => setTimeout(r, 100));

  const sections = cloneRoot.querySelectorAll('[data-pdf-section]');
  const elements = sections.length > 0 ? Array.from(sections) as HTMLElement[] : [cloneRoot];

  const captures: { canvas: HTMLCanvasElement; title: string }[] = [];
  try {
    for (const el of elements) {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: PDF_CAPTURE_WIDTH,
        width: PDF_CAPTURE_WIDTH,
      });
      captures.push({ canvas, title: el.getAttribute('data-pdf-section') || '' });
    }
  } finally {
    document.body.removeChild(stage);
    if (isDark) document.documentElement.classList.add('dark');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  let currentY = MARGIN;
  let pageNum = 0;

  const availableH = () => CONTENT_H - (currentY - MARGIN);

  function addPageIfNeeded(neededH: number) {
    if (currentY > MARGIN && neededH > availableH()) {
      pdf.addPage();
      pageNum++;
      currentY = MARGIN;
    }
  }

  // Threshold: até 1.5x a altura da página, escalamos pra caber em UMA página
  // (mantém o bloco inteiro). Acima disso, fatiamos como fallback.
  const SCALE_LIMIT = 1.5;

  for (const { canvas } of captures) {
    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = CONTENT_W / imgW;
    const totalH = imgH * ratio; // mm

    if (totalH <= availableH()) {
      // Cabe na página atual
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', MARGIN, currentY, CONTENT_W, totalH);
      currentY += totalH + 3;
    } else if (totalH <= CONTENT_H) {
      // Cabe numa página inteira, mas não na atual — vai pra próxima
      addPageIfNeeded(totalH);
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', MARGIN, currentY, CONTENT_W, totalH);
      currentY += totalH + 3;
    } else if (totalH <= CONTENT_H * SCALE_LIMIT) {
      // Pouco maior que uma página: escala pra caber inteiro numa página
      addPageIfNeeded(CONTENT_H);
      const scale = CONTENT_H / totalH;
      const fitW = CONTENT_W * scale;
      const fitH = CONTENT_H;
      const xOffset = MARGIN + (CONTENT_W - fitW) / 2;
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', xOffset, currentY, fitW, fitH);
      currentY += fitH + 3;
    } else {
      // Bloco gigante (>1.5 páginas): força fatiar
      let srcY = 0;
      while (srcY < imgH) {
        const sliceH = Math.min((availableH()) / ratio, imgH - srcY);
        if (sliceH < 20) {
          pdf.addPage();
          pageNum++;
          currentY = MARGIN;
          continue;
        }
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgW;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, imgW, sliceH, 0, 0, imgW, sliceH);

        const destH = sliceH * ratio;
        const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', MARGIN, currentY, CONTENT_W, destH);

        srcY += sliceH;
        currentY += destH;

        if (srcY < imgH) {
          pdf.addPage();
          pageNum++;
          currentY = MARGIN;
        }
      }
      currentY += 3;
    }
  }

  // Add page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Página ${i} de ${totalPages}`, A4_W / 2, A4_H - 5, { align: 'center' });
  }

  const pdfBlob = pdf.output('blob');
  const pdfFile = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });

  if (mode === 'share') {
    if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
      try {
        await navigator.share({ title: filename, files: [pdfFile] });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        // fallback para download em caso de outro erro
      }
    }
  }

  pdf.save(`${filename}.pdf`);
}
