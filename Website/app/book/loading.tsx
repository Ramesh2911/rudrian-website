import { Skeleton } from "@/components/Spinner";

export default function BookLoading() {
  return (
    <div className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <Skeleton className="mx-auto h-4 w-28 rounded-full" />
        <Skeleton className="mx-auto mt-3 h-10 w-80" />
        <Skeleton className="mx-auto mt-3 h-5 w-full max-w-md" />
      </div>
      <div className="mx-auto mt-10 max-w-3xl">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="mt-8 h-[420px] rounded-2xl" />
      </div>
    </div>
  );
}
