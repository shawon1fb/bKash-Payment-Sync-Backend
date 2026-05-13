import { parseBkashSms } from './sms-parser.util';

const VALID_SMS =
  'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6. Fee Tk 15.00. Balance Tk 5,000.00. 12/05/26 2:30 PM';

describe('parseBkashSms', () => {
  it('parses valid cashout SMS', () => {
    const result = parseBkashSms(VALID_SMS);
    expect(result).not.toBeNull();
    expect(result!.transactionId).toBe('A2B3C4D5E6');
    expect(result!.amount).toBe(1500);
    expect(result!.senderPhone).toBe('01711223344');
    expect(result!.transactionTime).toBeInstanceOf(Date);
    expect(isNaN(result!.transactionTime.getTime())).toBe(false);
  });

  it('extracts TrxID as uppercase', () => {
    const sms = VALID_SMS.replace('A2B3C4D5E6', 'a2b3c4d5e6');
    const result = parseBkashSms(sms);
    expect(result!.transactionId).toBe('A2B3C4D5E6');
  });

  it('returns null when TrxID missing', () => {
    const sms = VALID_SMS.replace('TrxID A2B3C4D5E6.', '');
    expect(parseBkashSms(sms)).toBeNull();
  });

  it('returns null when amount missing', () => {
    const sms = 'Cash Out from 01711223344 successful. TrxID A2B3C4D5E6. 12/05/26 2:30 PM';
    expect(parseBkashSms(sms)).toBeNull();
  });

  it('returns null when date/time missing', () => {
    const sms = 'Cash Out Tk 1,500.00 from 01711223344 successful. TrxID A2B3C4D5E6.';
    expect(parseBkashSms(sms)).toBeNull();
  });

  it('sets senderPhone to null when from-number absent', () => {
    const sms = 'Cash Out Tk 500.00 successful. TrxID X1Y2Z3. 01/05/26 10:00 AM';
    const result = parseBkashSms(sms);
    expect(result).not.toBeNull();
    expect(result!.senderPhone).toBeNull();
  });

  it('parses comma-formatted amounts correctly', () => {
    const sms = 'Cash Out Tk 12,345.67 from 01899887766 successful. TrxID BIGAMT01. 05/05/26 9:15 AM';
    const result = parseBkashSms(sms);
    expect(result!.amount).toBeCloseTo(12345.67);
  });

  it('returns null for empty string', () => {
    expect(parseBkashSms('')).toBeNull();
  });

  it('returns null for random text', () => {
    expect(parseBkashSms('hello world this is not a bkash sms')).toBeNull();
  });

  it('parses 4-digit year dates', () => {
    const sms = 'Cash Out Tk 200.00 from 01711223344 successful. TrxID YRTEST01. 01/06/2026 8:00 AM';
    const result = parseBkashSms(sms);
    expect(result).not.toBeNull();
    expect(result!.transactionTime.getFullYear()).toBe(2026);
  });
});
