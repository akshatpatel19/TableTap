/**
 * Generate a unique 6-character code for URLs
 */
export const generateUniqueCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Generate a unique slug from cafe name with random suffix
 * Example: "Cafe Delice" -> "cafe-delice-a1b2c3"
 */
export const generateUniqueSlug = (cafeName: string): string => {
  const baseSlug = cafeName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  const uniqueCode = generateUniqueCode();
  return `${baseSlug}-${uniqueCode}`;
};
