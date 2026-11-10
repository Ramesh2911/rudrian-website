import { Skeleton } from "@/components/Spinner";

export default function HomeLoading() {
  return (
    <div className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Skeleton className="mx-auto h-6 w-64 rounded-full" />
        <Skeleton className="mx-auto mt-6 h-14 w-full max-w-xl" />
        <Skeleton className="mx-auto mt-3 h-14 w-3/4" />
        <Skeleton className="mx-auto mt-6 h-6 w-full max-w-lg" />
        <Skeleton className="mx-auto mt-16 h-20 w-full max-w-2xl rounded-2xl" />
      </div>
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
