import Link from "next/link";

import { BoundaryAdmin } from "@/components/admin/boundary-admin";

export default function BoundaryAdminPage() {
  return (
    <main className="min-h-dvh overflow-auto bg-background px-5 py-8 text-foreground sm:px-10">
      <div className="mx-auto grid max-w-5xl gap-8">
        <div>
          <Link href="/" className="focus-ring text-sm font-semibold text-water hover:underline">
            Back to Mapper
          </Link>
          <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-terrain">Boundary workshop</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Prepare OSM outlines for exports.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Fetch an administrative boundary once, simplify it into a portable SVG path, then copy or save it for bundled assets and project imports.
          </p>
        </div>
        <BoundaryAdmin />
      </div>
    </main>
  );
}
