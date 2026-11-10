import { Suspense } from "react";
import { Overlay } from "./Overlay";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Overlay />
    </Suspense>
  );
}
