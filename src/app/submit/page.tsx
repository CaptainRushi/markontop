import { Suspense } from "react";
import SubmitForm from "@/components/SubmitForm";

export const metadata = { title: "Submit a placement — MarkOnTop" };

export default function SubmitPage() {
  return (
    <div className="pt-8 sm:pt-10">
      <header className="mb-8 text-center">
        <h1 className="font-display text-[32px] font-black tracking-[-0.02em] text-paper sm:text-[42px]">
          Get on the board
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-paper/40">
          $1.00 entry floor. Deterministic placement — pay more than the current holder (+$1.00 minimum) to take
          their rank.
        </p>
      </header>
      <Suspense>
        <SubmitForm />
      </Suspense>
    </div>
  );
}
