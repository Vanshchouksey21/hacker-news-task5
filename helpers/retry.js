
const TRANSIENT_ERROR_PATTERNS = [
  /net::ERR_/i,
  /\bECONNRESET\b/i,
  /\bECONNREFUSED\b/i,
  /\bETIMEDOUT\b/i,
  /\bEAI_AGAIN\b/i,
  /socket hang up/i,
  /network error/i,
  /fetch failed/i,
];

function isTransientError(error) {
  const message = String(error?.message ?? error);

  return (
    error?.name === 'TimeoutError' ||
    TRANSIENT_ERROR_PATTERNS.some(pattern => pattern.test(message))
  );
}

export async function retryTransient(
  operation,
  { attempts = 3, delayMs = 1000, label = 'Network operation' } = {}
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const canRetry =
        isTransientError(error) && attempt < attempts;

      if (!canRetry) {
        throw error;
      }

      console.warn(
        `[Retry] ${label}: attempt ${attempt}/${attempts} failed. Retrying...`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
