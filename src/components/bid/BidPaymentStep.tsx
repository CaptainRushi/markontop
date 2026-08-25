"use client";

import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

export default function BidPaymentStep({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) {
      onError("Payment form not ready. Try again.");
      return;
    }
    setBusy(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/my-rank?checkout=success`,
      },
    });
    if (error) {
      onError(error.message ?? "Payment failed. Your rank hasn't changed.");
      setBusy(false);
    } else {
      onSuccess();
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        onClick={() => void handlePay()}
        disabled={!stripe || busy}
        className="flex w-full items-center justify-center gap-2 bg-track px-4 py-3 text-sm font-bold text-paper hover:bg-track/90 disabled:opacity-40"
      >
        {busy ? "Processing…" : "Pay & place bid"}
      </button>
      <p className="text-center font-data text-[11px] leading-relaxed text-track/30">
        Placement confirmed only after payment succeeds. No refunds.
      </p>
    </div>
  );
}
