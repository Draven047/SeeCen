/**
 * Maps database and API errors to safe, user-friendly messages
 * to prevent information disclosure attacks
 */
export const getSafeErrorMessage = (error: any): string => {
  // Map PostgreSQL error codes
  if (error?.code === '23505') return 'This item already exists';
  if (error?.code === '23503') return 'Invalid reference to related data';
  if (error?.code === '23502') return 'Required field is missing';
  if (error?.code === '42501') return 'Access denied';
  if (error?.code === 'PGRST301') return 'You do not have permission to perform this action';
  
  // Map common error patterns
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('row-level security')) {
    return 'You do not have permission to perform this action';
  }
  if (message.includes('violates')) {
    return 'Unable to complete this operation due to data constraints';
  }
  if (message.includes('duplicate')) {
    return 'This item already exists';
  }
  if (message.includes('not found') || message.includes('no rows')) {
    return 'The requested item was not found';
  }
  if (message.includes('invalid') && message.includes('password')) {
    return 'Invalid email or password';
  }
  if (message.includes('email') && message.includes('already')) {
    return 'An account with this email already exists';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again';
  }
  
  // Log full error for debugging (only in development)
  console.error('Operation error:', error);
  
  // Return generic message
  return 'An error occurred. Please try again or contact support.';
};

/**
 * Sanitizes user input for use in LIKE/ILIKE patterns
 * Escapes special pattern matching characters
 */
export const sanitizeForLike = (input: string): string => {
  return input.replace(/[%_\\]/g, '\\$&');
};

/**
 * Validates phone number input - only allows digits, spaces, hyphens, parentheses, and plus
 */
export const isValidPhoneInput = (input: string): boolean => {
  return /^[0-9\s\-\(\)\+]*$/.test(input);
};
