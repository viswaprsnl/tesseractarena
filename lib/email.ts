import { Resend } from "resend";
import { NOTIFY_RECIPIENTS } from "@/lib/contact";
import { gstOn, withGST, GST_PERCENT } from "@/lib/booking-config";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

interface BookingEmailData {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  date: string;
  time: string;
  partySize: number;
  packageType: string;
  amount: number;
  gamePreference: string;
  paymentMethod: string;
}

function advanceFor(data: BookingEmailData): number {
  return Math.min(500 * data.partySize, data.amount);
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<{ data: unknown; error: unknown }> {
  const paymentText =
    data.paymentMethod === "razorpay"
      ? "Paid Online"
      : "Pay at Center (on arrival)";

  return await getResend().emails.send({
    from: "Tesseract Arena <bookings@tesseractarena.com>",
    to: data.customerEmail,
    subject: `Booking Confirmed - ${data.bookingId} | Tesseract Arena`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #ffffff; padding: 40px 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C3BFF; font-size: 24px; margin: 0;">TESSERACT ARENA</h1>
          <p style="color: #888; font-size: 12px; letter-spacing: 2px;">PREMIUM VR EXPERIENCE</p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: #6C3BFF; color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px;">
            ✓ Booking Confirmed
          </div>
        </div>

        <h2 style="text-align: center; font-size: 20px; margin-bottom: 5px;">Hey ${data.customerName}!</h2>
        <p style="text-align: center; color: #aaa; font-size: 14px; margin-bottom: 30px;">
          Your VR session is booked. Get ready to step into another world!
        </p>

        <div style="background: #1a1a2e; border: 1px solid #333; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
          <div style="text-align: center; margin-bottom: 15px;">
            <span style="color: #888; font-size: 11px; letter-spacing: 1px;">BOOKING ID</span><br/>
            <span style="color: #6C3BFF; font-size: 22px; font-weight: bold; letter-spacing: 3px;">${data.bookingId}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Date</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; border-bottom: 1px solid #333;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Time</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; border-bottom: 1px solid #333;">${data.time}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Players</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; border-bottom: 1px solid #333;">${data.partySize}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Package</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; text-transform: capitalize; border-bottom: 1px solid #333;">${data.packageType}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Game</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; border-bottom: 1px solid #333;">${data.gamePreference}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Payment</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; border-bottom: 1px solid #333;">${paymentText}</td>
            </tr>
            ${(() => {
              // Mirror the breakdown the BookingSummary + Razorpay use.
              // `data.amount` is the ex-GST session cost (that's what the
              // sheet records). We derive GST and the gross totals here
              // so the customer, Razorpay, and the admin notification
              // all tie together on the same numbers.
              const base = data.amount;
              const gst = gstOn(base);
              const grossTotal = withGST(base);
              const advanceBase = advanceFor(data); // ex-GST advance
              const advanceGross = withGST(advanceBase); // what Razorpay actually charges
              const balanceGross = grossTotal - advanceGross; // what the customer owes at venue
              return `
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">Session cost (excl. GST)</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; border-bottom: 1px solid #333;">₹${base.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; border-bottom: 1px solid #333;">GST @ ${GST_PERCENT}%</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; border-bottom: 1px solid #333;">+ ₹${gst.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #ccc; font-size: 14px; font-weight: bold; border-bottom: 1px solid #333;">Total (incl. GST)</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px; font-weight: bold; border-bottom: 1px solid #333;">₹${grossTotal.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px; font-weight: bold; border-bottom: 1px solid #333;">${data.paymentMethod === "razorpay" ? "Advance paid (incl. GST)" : "Advance due (incl. GST)"}</td>
              <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold; color: #6C3BFF; border-bottom: 1px solid #333;">₹${advanceGross.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Balance at center (incl. GST)</td>
              <td style="padding: 10px 0; text-align: right; font-size: 14px;">₹${balanceGross.toLocaleString("en-IN")}</td>
            </tr>`;
            })()}
          </table>
        </div>

        <div style="background: #1a1a2e; border: 1px solid #333; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
          <h3 style="font-size: 14px; margin: 0 0 10px 0; color: #6C3BFF;">📍 Location</h3>
          <p style="margin: 0; font-size: 13px; color: #ccc; line-height: 1.6;">
            Preston Prime Mall<br/>
            Lumbini Avenue, Gachibowli<br/>
            Hyderabad 500032
          </p>
          <p style="margin: 10px 0 0 0; font-size: 13px;">
            📞 +91 99081 16444<br/>
            ✉️ admin@tesseractarena.com
          </p>
        </div>

        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333;">
          <p style="color: #888; font-size: 12px; margin: 0;">
            Wear comfortable clothing and closed-toe shoes.<br/>
            Arrive 10 minutes early for setup.
          </p>
          <div style="margin: 20px 0;">
            <a href="https://tesseractarena.com/waiver?booking=${data.bookingId}&email=${encodeURIComponent(data.customerEmail)}" style="display: inline-block; background: #6C3BFF; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold;">
              ✍️ Sign Waiver Form
            </a>
            <p style="color: #888; font-size: 11px; margin-top: 8px;">
              Complete the safety waiver before your visit (required)
            </p>
          </div>
          <p style="margin-top: 10px;">
            <a href="https://tesseractarena.com/book/cancel?id=${data.bookingId}&date=${data.date}&time=${encodeURIComponent(data.time)}" style="color: #888; font-size: 11px; text-decoration: underline;">
              Need to cancel? Click here
            </a>
          </p>
          <p style="color: #555; font-size: 11px; margin-top: 10px;">
            © ${new Date().getFullYear()} Tesseract Arena. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendOwnerNotification(data: BookingEmailData): Promise<{ data: unknown; error: unknown }> {
  return await getResend().emails.send({
    from: "Tesseract Arena <bookings@tesseractarena.com>",
    to: NOTIFY_RECIPIENTS,
    subject: `New Booking: ${data.bookingId} - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>New Booking Received</h2>
        <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Time:</strong> ${data.time}</p>
        <p><strong>Players:</strong> ${data.partySize}</p>
        <p><strong>Package:</strong> ${data.packageType}</p>
        <p><strong>Game:</strong> ${data.gamePreference}</p>
        ${(() => {
          // Same breakdown the customer sees — base ex-GST, GST line,
          // gross total, advance (what Razorpay collected or will
          // collect on arrival), and the balance still to collect at
          // the counter. All amounts here match the customer email so
          // the counter never has to reconcile two different stories.
          const base = data.amount;
          const gst = gstOn(base);
          const grossTotal = withGST(base);
          const advanceBase = advanceFor(data);
          const advanceGross = withGST(advanceBase);
          const balanceGross = grossTotal - advanceGross;
          const advanceLabel = data.paymentMethod === "razorpay"
            ? "Advance paid online (incl. GST)"
            : "Advance due at arrival (incl. GST)";
          return `
        <p><strong>Session cost (excl. GST):</strong> ₹${base.toLocaleString("en-IN")}</p>
        <p><strong>GST @ ${GST_PERCENT}%:</strong> ₹${gst.toLocaleString("en-IN")}</p>
        <p><strong>Total (incl. GST):</strong> ₹${grossTotal.toLocaleString("en-IN")}</p>
        <p><strong>${advanceLabel}:</strong> ₹${advanceGross.toLocaleString("en-IN")}</p>
        <p><strong>Balance to collect at venue (incl. GST):</strong> ₹${balanceGross.toLocaleString("en-IN")}</p>`;
        })()}
        <p><strong>Payment method:</strong> ${data.paymentMethod === "razorpay" ? "Paid Online" : "Pay at Center"}</p>
      </div>
    `,
  });
}

interface CancellationEmailData {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  date: string;
  time: string;
}

export async function sendCancellationEmail(data: CancellationEmailData): Promise<{ data: unknown; error: unknown }> {
  return await getResend().emails.send({
    from: "Tesseract Arena <bookings@tesseractarena.com>",
    to: data.customerEmail,
    subject: `Booking Cancelled - ${data.bookingId} | Tesseract Arena`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #ffffff; padding: 40px 30px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6C3BFF; font-size: 24px; margin: 0;">TESSERACT ARENA</h1>
        </div>
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background: #dc2626; color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px;">
            ✕ Booking Cancelled
          </div>
        </div>
        <h2 style="text-align: center; font-size: 20px; margin-bottom: 5px;">Hey ${data.customerName},</h2>
        <p style="text-align: center; color: #aaa; font-size: 14px; margin-bottom: 30px;">
          Your booking <strong style="color: #6C3BFF;">${data.bookingId}</strong> for ${data.date} at ${data.time} has been cancelled.
        </p>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="https://tesseractarena.com/book" style="display: inline-block; background: #6C3BFF; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Book a New Session
          </a>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #333;">
          <p style="color: #555; font-size: 11px;">
            © ${new Date().getFullYear()} Tesseract Arena. All rights reserved.
          </p>
        </div>
      </div>
    `,
  });
}
