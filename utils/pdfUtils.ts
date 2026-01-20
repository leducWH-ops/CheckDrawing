// This assumes pdfjsLib is loaded globally via CDN in index.html to avoid worker build issues in this environment
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export const convertPdfToImages = async (file: File): Promise<string[]> => {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library not loaded");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 2.0; // High resolution for text clarity
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      images.push(canvas.toDataURL('image/png'));
    }
  }

  return images;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix for Gemini API if needed, 
      // but Gemini SDK usually takes base64 string without prefix or raw bytes.
      // The generateContent inlineData expects base64 string only.
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Helper to strip base64 prefix
export const getBase64Data = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
}

export const drawErrorsOnCanvas = (
  imageUrl: string, 
  errors: any[], 
  language: 'en' | 'vi'
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(imageUrl);

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw markers
      errors.forEach(err => {
        if (!err.box_2d) return;
        const { ymin, xmin, ymax, xmax } = err.box_2d;
        
        // Denormalize coordinates
        const x = (xmin / 1000) * canvas.width;
        const y = (ymin / 1000) * canvas.height;
        const w = ((xmax - xmin) / 1000) * canvas.width;
        const h = ((ymax - ymin) / 1000) * canvas.height;

        // Draw Box
        ctx.strokeStyle = '#ef4444'; // Red-500
        ctx.lineWidth = Math.max(2, canvas.width * 0.003);
        ctx.strokeRect(x, y, w, h);

        // Draw Label Background
        const fontSize = Math.max(12, canvas.width * 0.015);
        ctx.font = `bold ${fontSize}px Arial`;
        const text = `${err.id}`;
        const textMetrics = ctx.measureText(text);
        const padding = fontSize * 0.5;
        const bgW = textMetrics.width + padding * 2;
        const bgH = fontSize + padding;

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y - bgH, bgW, bgH);

        // Draw Label Text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + padding, y - bgH + bgH/2);
      });

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
  });
};