import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-page text-muted">
        <Compass className="h-7 w-7" />
      </span>
      <p className="text-4xl font-semibold tracking-tight text-ink">404</p>
      <h1 className="mt-2 text-lg font-semibold text-ink">Page not found</h1>
      <p className="mt-1 text-sm text-body">The page you are looking for does not exist or was moved.</p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Back to dashboard</Button>
      </Link>
    </Card>
  );
}
