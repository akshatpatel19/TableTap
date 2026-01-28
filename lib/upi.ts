/**
 * UPI Payment Integration Utilities
 * Handles UPI ID formatting and payment redirect logic
 */

export interface UPIPaymentParams {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionRef: string;
  description: string;
}

/**
 * Generate UPI deep link for payment
 * Format: upi://pay?pa=<upiId>&pn=<payeeName>&am=<amount>&tn=<description>&tr=<transactionRef>
 */
export const generateUPILink = (params: UPIPaymentParams): string => {
  const { upiId, payeeName, amount, transactionRef, description } = params;

  // Validate UPI ID format
  if (!isValidUPIId(upiId)) {
    throw new Error('Invalid UPI ID format');
  }

  const encodedPayeeName = encodeURIComponent(payeeName);
  const encodedDescription = encodeURIComponent(description);
  const encodedRef = encodeURIComponent(transactionRef);

  return `upi://pay?pa=${upiId}&pn=${encodedPayeeName}&am=${amount}&tn=${encodedDescription}&tr=${encodedRef}`;
};

/**
 * Validate UPI ID format
 * Valid formats: username@bankname or mobile@upi
 */
export const isValidUPIId = (upiId: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
  return upiRegex.test(upiId);
};

/**
 * Redirect to UPI payment app
 */
export const redirectToUPI = (upiLink: string): void => {
  window.location.href = upiLink;
};

/**
 * Generate QR code using external service (QR Server)
 * Returns QR code image data URL
 */
export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const encodedData = encodeURIComponent(data);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`;
    
    // Fetch the QR code image and convert to base64
    const response = await fetch(qrUrl);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[v0] QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Format amount for UPI (must be in INR, 2 decimal places)
 */
export const formatAmountForUPI = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};
