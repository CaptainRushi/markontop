import { Suspense } from "react";
import SubmitForm from "@/components/SubmitForm";

export const metadata = { title: "Submit a placement — MarkOnTop" };

export default function SubmitPage() {
  return (
    <div className="pt-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Get on the board</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
          $1.00 entry floor. Deterministic placement: pay more than the current holder
          (+$1.00 minimum) to take their rank.
        </p>
      </header>
      <Suspense>
        <SubmitForm />
      </Suspense>
    </div>
  );
}
