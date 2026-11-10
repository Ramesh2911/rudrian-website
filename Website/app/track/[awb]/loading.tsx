import { Skeleton } from "@/components/Spinner";

export default function TrackingLoading() {
  return (
    <div className="container-page py-12 lg:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-10 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <Skeleton className="mt-8 h-24 w-full rounded-2xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
