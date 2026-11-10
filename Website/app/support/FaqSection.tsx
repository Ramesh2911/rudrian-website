import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { faqs } from "./faqs";

/** Server-rendered FAQ block (native <details> — no client JS, crawlable content). */
export function FaqSection() {
  return (
    <section id="faqs" aria-labelledby="faq-heading" className="border-t border-line bg-card py-16 lg:py-20">
      <div className="container-page max-w-3xl">
        <Reveal>
          <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-brand">
            FAQs
          </p>
          <h2
            id="faq-heading"
            className="mt-3 text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
          >
            Frequently asked questions
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="group card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-bold text-ink transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-body">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
