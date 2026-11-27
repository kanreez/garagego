const { createMockProvider } = require("./mock");
const { PaymentError } = require("./errors");

const PROVIDERS = { mock: createMockProvider };

function createPaymentProvider(repo) {
  const name = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  const make = PROVIDERS[name];
  if (!make) throw new Error(`Unknown PAYMENT_PROVIDER "${name}". Use one of: ${Object.keys(PROVIDERS).join(", ")}`);
  const impl = make(repo);

  const inFlight = new Map();
  function confirmPayment(opts) {
    const key = opts.idempotencyKey;
    if (inFlight.has(key)) return inFlight.get(key);
    const attempt = impl.confirmPayment(opts).finally(() => inFlight.delete(key));
    inFlight.set(key, attempt);
    return attempt;
  }

  return { name, createPayment: impl.createPayment, confirmPayment, refundPayment: impl.refundPayment };
}

module.exports = { createPaymentProvider, PaymentError };
