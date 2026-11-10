import { Skeleton } from "@/components/Spinner";

export default function ContactLoading() {
  return (
    <div className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Skeleton className="mx-auto h-4 w-20 rounded-full" />
        <Skeleton className="mx-auto mt-3 h-10 w-80" />
        <Skeleton className="mx-auto mt-3 h-5 w-full max-w-lg" />
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
      <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-5">
        <Skeleton className="h-[480px] rounded-2xl lg:col-span-3" />
        <Skeleton className="h-[480px] rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
