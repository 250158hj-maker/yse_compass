import { Suspense } from "react";
import TeamsListClient from "./TeamsListClient";

export default function TeamsPage() {
  return (
    <Suspense fallback={null}>
      <TeamsListClient />
    </Suspense>
  );
}
