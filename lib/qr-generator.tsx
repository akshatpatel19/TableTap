/**
 * QR Code Generator for Table URLs
 * Generates QR codes for cafe tables pointing to the menu page
 */

export const generateTableQRUrl = (cafeSlug: string, tableId: number): string => {
  const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'tabletap.com';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${cafeSlug}.${domain}/menu?table=${tableId}`;
};

/**
 * Generate QR code using external service
 * You can use any QR code generation service like:
 * - QR Server (free)
 * - QR Code Generator
 * - GoQR
 */
export const generateQRCodeImage = (tableUrl: string, size: number = 300): string => {
  // Using QR Server (free service)
  const encodedUrl = encodeURIComponent(tableUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
};

/**
 * Generate all QR codes for a cafe
 */
export const generateCafeQRCodes = (cafeSlug: string, numberOfTables: number) => {
  return Array.from({ length: numberOfTables }, (_, index) => {
    const tableId = index + 1;
    const tableUrl = generateTableQRUrl(cafeSlug, tableId);
    const qrImageUrl = generateQRCodeImage(tableUrl);
    
    return {
      tableId,
      tableUrl,
      qrImageUrl,
    };
  });
};

/**
 * Helper to download QR code
 */
export const downloadQRCode = (tableId: number, imageUrl: string) => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `table-${tableId}-qr-code.png`;
  link.click();
};

/**
 * Generate a printable QR code sheet for all tables
 * Returns HTML that can be printed
 */
export const generatePrintableQRSheet = (cafeSlug: string, cafeName: string, numberOfTables: number): string => {
  const qrCodes = generateCafeQRCodes(cafeSlug, numberOfTables);
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${cafeName} - QR Codes</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #333;
        }
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        .qr-card {
          border: 1px solid #ddd;
          padding: 20px;
          text-align: center;
          page-break-inside: avoid;
          border-radius: 8px;
        }
        .qr-card h3 {
          margin-top: 0;
          color: #333;
        }
        .qr-card img {
          width: 200px;
          height: 200px;
          margin: 20px 0;
        }
        .qr-card p {
          margin: 10px 0;
          font-size: 12px;
          color: #666;
        }
        @media print {
          body {
            margin: 0;
          }
          .qr-card {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${cafeName}</h1>
        <p>Table QR Codes for Menu Ordering</p>
        <p>Print and place one QR code at each table</p>
      </div>
      <div class="qr-grid">
  `;

  qrCodes.forEach((qr) => {
    html += `
      <div class="qr-card">
        <h3>Table ${qr.tableId}</h3>
        <img src="${qr.qrImageUrl}" alt="Table ${qr.tableId} QR Code" />
        <p>Scan to order</p>
      </div>
    `;
  });

  html += `
      </div>
    </body>
    </html>
  `;

  return html;
};
