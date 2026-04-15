import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export async function exportReportToPdf(element: HTMLElement, filename = 'relatorio') {
  // Temporarily force light mode styles for PDF
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) document.documentElement.classList.remove('dark');

  // Give the DOM a tick to repaint
  await new Promise(r => setTimeout(r, 100));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 800,
  });

  // Restore dark mode
  if (isDark) document.documentElement.classList.add('dark');

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdfWidth = 210; // A4 mm
  const pdfHeight = 297;
  const margin = 10;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = pdfHeight - margin * 2;

  const ratio = contentWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let yOffset = 0;
  let page = 0;

  while (yOffset < scaledHeight) {
    if (page > 0) pdf.addPage();

    const sourceY = (yOffset / ratio);
    const sourceHeight = Math.min(contentHeight / ratio, imgHeight - sourceY);
    const destHeight = sourceHeight * ratio;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = sourceHeight;
    const ctx = pageCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, destHeight);

    yOffset += contentHeight;
    page++;
  }

  const pdfBlob = pdf.output('blob');
  const pdfFile = new File([pdfBlob], `${filename}.pdf`, { type: 'application/pdf' });

  // Try Web Share API (works on mobile for WhatsApp etc)
  if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: filename,
        files: [pdfFile],
      });
      return;
    } catch (err) {
      // User cancelled or share failed, fall back to download
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // Fallback: download the file
  pdf.save(`${filename}.pdf`);
}
