import { Star } from "lucide-react";
import { initialsOf } from "@/lib/utils";

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  company: string;
}

const avatarGradients = [
  "from-[#12B2AA] to-[#7BC043]",
  "from-[#22D3EE] to-[#0E8F8A]",
  "from-[#0E8F8A] to-[#12B2AA]",
];

export function TestimonialCard({ quote, name, role, company }: TestimonialCardProps) {
  const gradient = avatarGradients[name.length % avatarGradients.length] ?? avatarGradients[0]!;
  return (
    <figure className="card card-hover flex h-full flex-col p-6">
      <div className="flex items-center gap-1 text-warning" aria-label="Rated 5 out of 5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-body">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
        <span
          aria-hidden="true"
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white`}
        >
          {initialsOf(name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-ink">{name}</span>
          <span className="block truncate text-xs text-muted">
            {role}, {company}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
