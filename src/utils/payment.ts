/**
 * Format a credit card number with spaces every 4 digits
 */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substr(0, 19); // 16 digits + 3 spaces
}

/**
 * Format expiry date as MM/YY
 */
export function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 2) {
    const month = digits.substr(0, 2);
    const year = digits.substr(2, 2);
    
    // Validate month
    if (parseInt(month) > 12) {
      return '12/' + year;
    }
    if (month === '00') {
      return '01/' + year;
    }
    
    return month + (digits.length > 2 ? '/' + year : '');
  }
  return digits;
}

/**
 * Validate a credit card number using the Luhn algorithm
 */
export function validateCardNumber(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  
  let sum = 0;
  let isEven = false;
  
  // Loop through values starting from the rightmost digit
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Get credit card type based on number
 */
export function getCardType(number: string): string {
  const digits = number.replace(/\D/g, '');
  
  // Visa
  if (/^4/.test(digits)) {
    return 'visa';
  }
  
  // Mastercard
  if (/^5[1-5]/.test(digits)) {
    return 'mastercard';
  }
  
  // American Express
  if (/^3[47]/.test(digits)) {
    return 'amex';
  }
  
  // Discover
  if (/^6(?:011|5)/.test(digits)) {
    return 'discover';
  }
  
  return 'unknown';
}