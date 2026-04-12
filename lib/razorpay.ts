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
