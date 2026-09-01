import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return razorpayInstance;
}

export async function createOrder(
  amountINR: number,
  bookingId: string
): Promise<{ id: string; amount: number; currency: string }> {
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: amountINR * 100, // paise
    currency: "INR",
    receipt: bookingId,
    // Notes are echoed back on every webhook payload for this order — the
    // webhook uses this to map the payment back to our bookingId without
    // an extra Razorpay API call.
    notes: { bookingId },
  });
  return {
    id: order.id,
    amount: order.amount as number,
    currency: order.currency,
  };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

// Verify a webhook delivery from Razorpay. Compares the header signature
// against an HMAC-SHA256 of the RAW request body (not JSON-parsed) using
// the webhook secret configured in Razorpay dashboard.
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  // Constant-time compare to avoid timing attacks.
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
