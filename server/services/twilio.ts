import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

let twilioClient: Twilio.Twilio | null = null;

function getClient(): Twilio.Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
    }
    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

export function isConfigured(): boolean {
  return !!(accountSid && authToken && whatsappNumber);
}

export function getWhatsAppNumber(): string {
  if (!whatsappNumber) {
    throw new Error("TWILIO_WHATSAPP_NUMBER not configured");
  }
  return whatsappNumber;
}

export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("55") && normalized.length >= 12) {
    return `+${normalized}`;
  }
  if (normalized.length >= 10 && normalized.length <= 11) {
    return `+55${normalized}`;
  }
  return `+${normalized}`;
}

export function extractPhoneFromWhatsApp(from: string): string {
  return from.replace("whatsapp:", "");
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const client = getClient();
    const fromNumber = getWhatsAppNumber();
    
    const normalizedTo = normalizePhone(to);
    
    const message = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${normalizedTo}`,
      body,
    });
    
    return { success: true, sid: message.sid };
  } catch (error: any) {
    console.error("Twilio send error:", error.message);
    return { success: false, error: error.message };
  }
}
