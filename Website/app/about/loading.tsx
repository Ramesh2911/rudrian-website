import { Skeleton } from "@/components/Spinner";

export default function AboutLoading() {
  return (
    <div>
      <div className="bg-gradient-to-br from-brand via-brand-dark to-[#0b1220] py-16 lg:py-24">
        <div className="container-page">
          <Skeleton className="h-5 w-24 rounded-full bg-white/20" />
          <Skeleton className="mt-5 h-4 w-72 rounded-full bg-white/15" />
          <Skeleton className="mt-3 h-12 w-full max-w-2xl rounded-xl bg-white/15" />
          <Skeleton className="mt-4 h-5 w-full max-w-xl rounded-full bg-white/10" />
          <Skeleton className="mt-8 h-11 w-56 rounded-xl bg-white/20" />
        </div>
      </div>
      <div className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="mt-3 h-9 w-64 rounded-lg" />
            <Skeleton className="mt-4 h-5 w-full rounded-full" />
            <Skeleton className="mt-2.5 h-5 w-5/6 rounded-full" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
