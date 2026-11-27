const { PaymentError } = require("./errors");

const DELAY_MS = 1500;

const TEST_CARDS = {
  "4242424242424242": { status: "succeeded" },
  "4000000000000002": { status: "declined", message: "Your card was declined." },
  "4000000000009995": { status: "declined", message: "Insufficient funds." },
  "4000000000003220": { status: "requires_action", message: "Confirm the payment in your bank app." },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function passesLuhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const brandOf = (digits) => (digits[0] === "4" ? "Visa" : digits[0] === "5" ? "Mastercard" : "Card");

const resultOf = (p) => ({
  status: p.status,
  message: p.failure_message ?? undefined,
  card_last4: p.card_last4 ?? undefined,
  card_brand: p.card_brand ?? undefined,
  method: p.method ?? undefined,
});

function createMockProvider(repo) {
  async function createPayment({ bookingId, userId, amountCents, platformFeeCents, hostPayoutCents, currency }) {
    return repo.createPayment({
      booking_id: bookingId,
      user_id: userId,
      amount_cents: amountCents,
      platform_fee_cents: platformFeeCents,
      host_payout_cents: hostPayoutCents,
      currency,
    });
  }

  async function confirmPayment({ paymentId, cardNumber, wallet, idempotencyKey, actionConfirmed }) {
    const payment = await repo.getPayment(paymentId);
    if (!payment) throw new PaymentError(404, "Payment not found");

    const approving = actionConfirmed && payment.status === "requires_action";
    if (payment.idempotency_key === idempotencyKey && !approving) return resultOf(payment);

    if (payment.status === "succeeded") throw new PaymentError(409, "This booking is already paid");
    if (payment.status === "refunded") throw new PaymentError(409, "This payment was refunded");
    const other = await repo.getPaymentByKey(idempotencyKey);
    if (other && other.id !== payment.id) throw new PaymentError(409, "This pay attempt belongs to another booking");

    let patch;
    if (approving) {
      if (payment.idempotency_key !== idempotencyKey) throw new PaymentError(409, "Approve the payment from the same attempt");
      patch = { status: "succeeded", failure_message: null };
    } else if (wallet) {
      patch = { status: "succeeded", method: "wallet", card_last4: null, card_brand: null, failure_message: null };
    } else {
      const digits = String(cardNumber ?? "").replace(/[\s-]/g, "");
      if (!/^\d{12,19}$/.test(digits) || !passesLuhn(digits)) throw new PaymentError(400, "Card number is invalid.");
      const outcome = TEST_CARDS[digits] ?? { status: "succeeded" };
      patch = {
        status: outcome.status,
        method: "card",
        card_last4: digits.slice(-4),
        card_brand: brandOf(digits),
        failure_message: outcome.message ?? null,
      };
    }

    await sleep(DELAY_MS);
    return resultOf(await repo.updatePayment(payment.id, { ...patch, idempotency_key: idempotencyKey }));
  }

  async function refundPayment({ paymentId }) {
    const payment = await repo.getPayment(paymentId);
    if (!payment) throw new PaymentError(404, "Payment not found");
    if (payment.status !== "succeeded") throw new PaymentError(409, "Only a successful payment can be refunded");
    return repo.updatePayment(payment.id, { status: "refunded" });
  }

  return { createPayment, confirmPayment, refundPayment };
}

module.exports = { createMockProvider };
