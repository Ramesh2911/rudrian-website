import { Skeleton } from "@/components/Spinner";

export default function SupportLoading() {
  return (
    <div className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Skeleton className="mx-auto h-4 w-24 rounded-full" />
        <Skeleton className="mx-auto mt-3 h-10 w-64" />
        <Skeleton className="mx-auto mt-3 h-5 w-full max-w-md" />
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
        <Skeleton className="h-[560px] rounded-2xl" />
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
