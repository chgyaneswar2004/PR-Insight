import crypto from 'crypto';

// Get or derive a 32-byte key from MASTER_KEY using SHA-256
const getMasterKey = () => {
  const rawKey = process.env.MASTER_KEY || 'pr-insight-default-master-key-32c-fallback';
  return crypto.createHash('sha256').update(rawKey).digest();
};

/**
 * Encrypt plain text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted string formatted as iv:authTag:encryptedData
 */
export function encrypt(text) {
  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(12); // 12-byte IV is standard for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt cipher text using AES-256-GCM
 * @param {string} encryptedText - Encrypted string formatted as iv:authTag:encryptedData
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encryptedText) {
  try {
    const key = getMasterKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed');
  }
}
