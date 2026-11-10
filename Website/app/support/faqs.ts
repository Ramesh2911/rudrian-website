export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: "How much does shipping with Rudrian cost?",
    answer:
      "Charges depend on weight, distance and service level. Enter your pickup and delivery details on the booking page to see an upfront quote before you confirm — the same figure appears on your final invoice.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Express parcels reach most metro corridors in 1–2 days, while surface shipments take 3–5 days. Your exact ETA shows on the quote and on the live tracking page.",
  },
  {
    question: "How do I track my parcel?",
    answer:
      "Enter your AWB number (it looks like SLX261031000002) on the Track page. You'll see hub-level scans, a live ETA and delivery status — no sign-in needed.",
  },
  {
    question: "When do I receive COD remittances?",
    answer:
      "Cash on Delivery amounts are transferred to your registered bank account within 48 hours of delivery, with a reconciliation statement for every shipment.",
  },
  {
    question: "What happens if my parcel is damaged or lost?",
    answer:
      "Raise a support ticket with photos within 48 hours of delivery. Claims are reviewed and settled within 7 working days, and every shipment is insured up to ₹5,000 at no extra cost.",
  },
  {
    question: "How do I schedule a pickup?",
    answer:
      "Book a shipment and choose a slot — a Rudrian rider is usually assigned within 2 hours of booking during working hours, scans the label at your door and shares the AWB instantly.",
  },
  {
    question: "Which pin codes do you cover?",
    answer:
      "Rudrian delivers to 19,000+ pin codes across India. Enter your pin codes on the booking page to see serviceability and charges upfront.",
  },
  {
    question: "Can I send returns and reverse pickups?",
    answer:
      "Yes — select Reverse Logistics while booking. Returns are picked up from the buyer and you get instant restock notifications as soon as the parcel reaches your warehouse.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "Not yet. Rudrian currently ships across India; international delivery isn't available at this time.",
  },
];
