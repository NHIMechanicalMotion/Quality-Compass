import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

export async function exportDrawingAsPng(
  canvasOrSvgElement: SVGElement | HTMLCanvasElement,
  filename: string
): Promise<void> {
  if (canvasOrSvgElement instanceof HTMLCanvasElement) {
    canvasOrSvgElement.toBlob((blob) => {
      if (blob) saveAs(blob, filename);
    });
    return;
  }

  const svgData = new XMLSerializer().serializeToString(canvasOrSvgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobURL = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasOrSvgElement.clientWidth * 2 || 2400;
    canvas.height = canvasOrSvgElement.clientHeight * 2 || 1600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, filename);
        URL.revokeObjectURL(blobURL);
      });
    }
  };
  image.src = blobURL;
}

export async function exportDrawingAsPdf(
  canvasOrSvgElement: SVGElement | HTMLCanvasElement,
  drawingTitle: string,
  partNumber: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
  });

  const svgData = new XMLSerializer().serializeToString(canvasOrSvgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const blobURL = URL.createObjectURL(svgBlob);

  const image = new Image();
  await new Promise<void>((resolve) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 10, 10, 400, 267);
        pdf.setProperties({ title: `${drawingTitle} - ${partNumber}` });
        pdf.save(`${partNumber}_Ballooned_Inspection_Drawing.pdf`);
      }
      URL.revokeObjectURL(blobURL);
      resolve();
    };
    image.src = blobURL;
  });
}
