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

  // Find all section-level children marked with data-pdf-section
  const sections = element.querySelectorAll('[data-pdf-section]');
  const elements = sections.length > 0 ? Array.from(sections) as HTMLElement[] : [element];

  // Capture each section separately
  const captures: { canvas: HTMLCanvasElement; title: string }[] = [];
  for (const el of elements) {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
    });
    captures.push({ canvas, title: el.getAttribute('data-pdf-section') || '' });
  }

  if (isDark) document.documentElement.classList.add('dark');

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

  for (const { canvas } of captures) {
    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = CONTENT_W / imgW;
    const totalH = imgH * ratio; // total height in mm

    if (totalH <= availableH()) {
      // Fits in current page
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', MARGIN, currentY, CONTENT_W, totalH);
      currentY += totalH + 3; // 3mm gap between sections
    } else if (totalH <= CONTENT_H) {
      // Fits in a full page but not current - start new page
      addPageIfNeeded(totalH);
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', MARGIN, currentY, CONTENT_W, totalH);
      currentY += totalH + 3;
    } else {
      // Section is taller than one page - slice it
      let srcY = 0;
      while (srcY < imgH) {
        const sliceH = Math.min((availableH()) / ratio, imgH - srcY);
        if (sliceH < 20) {
          // Too little space, go to next page
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
