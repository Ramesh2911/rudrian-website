export interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOpenOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayInstance {
  open: () => void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export class RazorpayDismissedError extends Error {
  constructor() {
    super("Payment was cancelled before completion.");
    this.name = "RazorpayDismissedError";
  }
}

function waitForExistingScript(script: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Could not load Razorpay checkout. Please check your network.")),
      { once: true },
    );
    if (window.Razorpay) resolve();
  });
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Payments are only available in the browser."));
  }
  if (window.Razorpay) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) return waitForExistingScript(existing);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else reject(new Error("Razorpay loaded in an unexpected state."));
    };
    script.onerror = () =>
      reject(new Error("Could not load Razorpay checkout. Please check your network."));
    document.body.appendChild(script);
  });
}

export function openRazorpayCheckout(
  options: RazorpayOpenOptions,
): Promise<RazorpayHandlerResponse> {
  if (typeof window === "undefined" || !window.Razorpay) {
    return Promise.reject(new Error("Razorpay checkout is unavailable right now."));
  }

  const Razorpay = window.Razorpay;

  return new Promise((resolve, reject) => {
    const instance = new Razorpay({
      ...options,
      handler: (response: RazorpayHandlerResponse) => resolve(response),
      modal: {
        ondismiss: () => reject(new RazorpayDismissedError()),
      },
    });
    instance.open();
  });
}
