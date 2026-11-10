import { Capacitor, registerPlugin } from '@capacitor/core';
import { cleanSmsPhone, buildSmsUri } from '../utils/smsUtils';

export interface SmsLaunchResult {
  success: boolean;
  mode: 'native_mms' | 'native_sms' | 'native_fallback' | 'web_uri';
  recipientCount: number;
  mmsAttempted?: boolean;
  message?: string;
}

export interface SmsCampaignNativePlugin {
  canSendSms(): Promise<{ available: boolean }>;
  openSms(options: {
    recipients: string[];
    message: string;
    imageUrl?: string;
    separator?: string;
  }): Promise<{
    success: boolean;
    mode: string;
    recipientCount: number;
    mmsAttempted?: boolean;
  }>;
}

// Register Capacitor Native Plugin for Android
const SmsCampaign = registerPlugin<SmsCampaignNativePlugin>('SmsCampaign');

/**
 * Checks if native SMS intent is available
 */
export async function isNativeSmsAvailable(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await SmsCampaign.canSendSms();
      return Boolean(res.available);
    } catch {
      return false;
    }
  }
  return true; // Web browser supports sms: protocol links
}

/**
 * Launches the device's default SMS/Messages composer with prefilled recipients and message.
 * Supports Android Native Intent (ACTION_SENDTO / MMS) with seamless fallback to web SMS links.
 */
export async function launchSmsComposer(options: {
  recipients: string[];
  message: string;
  imageUrl?: string;
  separator?: ',' | ';';
}): Promise<SmsLaunchResult> {
  const { recipients, message, imageUrl, separator = ',' } = options;

  const cleanedNumbers = recipients.map(cleanSmsPhone).filter(Boolean);

  if (cleanedNumbers.length === 0) {
    throw new Error('No valid recipient phone numbers provided.');
  }

  // 1. If running as a Native Capacitor App on Android
  if (Capacitor.isNativePlatform()) {
    try {
      const nativeResult = await SmsCampaign.openSms({
        recipients: cleanedNumbers,
        message,
        imageUrl: imageUrl || '',
        separator,
      });

      return {
        success: true,
        mode: nativeResult.mode === 'mms' ? 'native_mms' : 'native_sms',
        recipientCount: nativeResult.recipientCount,
        mmsAttempted: nativeResult.mmsAttempted,
      };
    } catch (nativeErr: any) {
      console.warn('[Native SMS Plugin Error - falling back to Web SMS URI]', nativeErr);
      // Fall through to Web SMS URI if native intent failed
    }
  }

  // 2. Web / PWA / Fallback handling via standard SMS URI scheme
  try {
    const smsUri = buildSmsUri(cleanedNumbers, message, separator);

    // Create a temporary link element and click it
    const link = document.createElement('a');
    link.href = smsUri;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return {
      success: true,
      mode: 'web_uri',
      recipientCount: cleanedNumbers.length,
      mmsAttempted: false,
    };
  } catch (err: any) {
    throw new Error(err?.message || 'Could not launch default messaging application.');
  }
}

/**
 * Formats and copies recipient phone numbers to clipboard for easy manual pasting into the "To:" field
 */
export async function copyRecipientNumbers(
  phoneNumbers: string[],
  separator: ',' | ';' = ','
): Promise<string> {
  const cleaned = phoneNumbers.map(cleanSmsPhone).filter(Boolean);
  const text = cleaned.join(separator === ',' ? ', ' : '; ');
  await navigator.clipboard.writeText(text);
  return text;
}
