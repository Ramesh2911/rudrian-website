import { Skeleton } from "@/components/Spinner";

export default function TrackLoading() {
  return (
    <div className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Skeleton className="mx-auto h-4 w-24 rounded-full" />
        <Skeleton className="mx-auto mt-4 h-10 w-72" />
        <Skeleton className="mx-auto mt-4 h-5 w-full max-w-md" />
        <Skeleton className="mx-auto mt-10 h-20 w-full rounded-2xl" />
      </div>
      <div className="mx-auto mt-14 max-w-2xl">
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
