import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CreditCard, HeartHandshake, RefreshCw } from "lucide-react";
import api from "../../services/api";

interface PaymentRecord {
  _id: string;
  delivery: string | { _id: string };
  type: "transport" | "provider_contribution";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "paid" | "failed";
  paidAt?: string;
  beneficiary?: { name?: string };
}

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface Props {
  deliveryId: string;
  method: "self_pickup" | "community_delivery";
  quotedCost?: number;
  providerName?: string;
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function DeliveryPaymentPanel({
  deliveryId,
  method,
  quotedCost = 0,
  providerName = "the provider",
}: Props) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [contribution, setContribution] = useState("100");
  const [loadingType, setLoadingType] = useState<"transport" | "provider_contribution" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchPayments = useCallback(async () => {
    try {
      const response = await api.get("/payments/my");
      const all: PaymentRecord[] = response.data.payments || [];
      setPayments(all.filter((payment) => {
        const id = typeof payment.delivery === "string"
          ? payment.delivery
          : payment.delivery?._id;
        return id === deliveryId;
      }));
    } catch {
      setError("Unable to load payment history.");
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const paidTransport = payments.some(
    (payment) => payment.type === "transport" && payment.status === "paid"
  );
  const paidContributions = payments.filter(
    (payment) => payment.type === "provider_contribution" && payment.status === "paid"
  );
  const contributionTotal = paidContributions.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  const startPayment = async (type: "transport" | "provider_contribution") => {
    setError("");
    setMessage("");
    try {
      const isContribution = type === "provider_contribution";
      const amount = Number(contribution);
      if (isContribution && (!Number.isFinite(amount) || amount < 1 || amount > 10000)) {
        setError("Contribution must be between ₹1 and ₹10,000.");
        return;
      }

      setLoadingType(type);
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setError("Unable to load Razorpay Checkout. Check your internet connection.");
        setLoadingType(null);
        return;
      }

      const response = await api.post("/payments/orders", {
        deliveryId,
        type,
        ...(isContribution ? { amount } : {}),
      });
      const { keyId, order } = response.data;

      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Commonsense",
        description: isContribution
          ? `Contribution for ${providerName}`
          : "Community delivery transportation",
        order_id: order.id,
        theme: { color: "#031f1b" },
        handler: async (paymentResponse) => {
          try {
            await api.post("/payments/verify", paymentResponse);
            setMessage(isContribution
              ? "Contribution payment successful. Thank you!"
              : "Transportation payment successful.");
            await fetchPayments();
          } catch (verificationError: any) {
            setError(
              verificationError?.response?.data?.message ||
              "Payment was submitted but could not be verified. Refresh payment history before retrying."
            );
            await fetchPayments();
          } finally {
            setLoadingType(null);
          }
        },
        modal: {
          ondismiss: () => setLoadingType(null),
        },
      });
      checkout.open();
    } catch (paymentError: any) {
      setError(
        paymentError?.response?.data?.message ||
        "Unable to start payment. Please try again."
      );
      setLoadingType(null);
    }
  };

  return (
    <section className="delivery-payment-panel">
      <div className="delivery-payment-heading">
        <CreditCard size={18} />
        <div>
          <h4>Payments</h4>
          <span>Secure Razorpay test checkout</span>
        </div>
      </div>

      {method === "community_delivery" && quotedCost > 0 && (
        <div className="delivery-payment-row">
          <div>
            <strong>Transportation charge</strong>
            <span>₹{quotedCost.toLocaleString("en-IN")}</span>
          </div>
          {paidTransport ? (
            <span className="payment-paid"><CheckCircle2 size={15} /> Paid</span>
          ) : (
            <button
              type="button"
              className="delivery-pay-btn"
              onClick={() => startPayment("transport")}
              disabled={loadingType !== null}
            >
              {loadingType === "transport" ? "Opening..." : "Pay transport"}
            </button>
          )}
        </div>
      )}

      <div className="delivery-contribution">
        <div>
          <strong><HeartHandshake size={16} /> Support the provider</strong>
          <span>Optional contribution for {providerName}</span>
        </div>
        <div className="delivery-contribution-actions">
          <label className="delivery-contribution-input">
            <span>₹</span>
            <input
              type="number"
              min="1"
              max="10000"
              step="1"
              value={contribution}
              onChange={(event) => setContribution(event.target.value)}
              aria-label="Contribution amount in rupees"
            />
          </label>
          <button
            type="button"
            className="delivery-pay-btn secondary"
            onClick={() => startPayment("provider_contribution")}
            disabled={loadingType !== null}
          >
            {loadingType === "provider_contribution" ? "Opening..." : "Contribute"}
          </button>
        </div>
        {contributionTotal > 0 && (
          <span className="payment-contribution-total">
            Contributions recorded: ₹{(contributionTotal / 100).toLocaleString("en-IN")}
          </span>
        )}
        <small>Contributions are recorded for the provider. Provider payouts are not automated in this prototype.</small>
      </div>

      {message && <p className="delivery-payment-success" role="status">{message}</p>}
      {error && <p className="delivery-payment-error" role="alert">{error}</p>}
      <button type="button" className="delivery-payment-refresh" onClick={fetchPayments}>
        <RefreshCw size={13} /> Refresh payment status
      </button>
    </section>
  );
}
