export interface ParsedSms {
  transactionId: string;
  amount: number;
  transactionTime: Date;
}

/**
 * bKash Cashout SMS format:
 * "Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM"
 */
export function parseBkashSms(raw: string): ParsedSms | null {
  const txnMatch = raw.match(/TrxID\s+([A-Z0-9]+)/i);
  if (!txnMatch) return null;

  const amountMatch = raw.match(/Tk\s+([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;

  const timeMatch = raw.match(
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
  );
  if (!timeMatch) return null;

  const transactionId = txnMatch[1].toUpperCase();
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  const transactionTime = parseDateTime(timeMatch[1], timeMatch[2]);

  if (isNaN(amount) || !transactionTime) return null;

  return { transactionId, amount, transactionTime };
}

function parseDateTime(datePart: string, timePart: string): Date | null {
  try {
    const [d, m, y] = datePart.split('/').map(Number);
    const fullYear = y < 100 ? 2000 + y : y;
    const timeClean = timePart.trim();
    const dateStr = `${fullYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${timeClean}`;
    const dt = new Date(dateStr);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}
