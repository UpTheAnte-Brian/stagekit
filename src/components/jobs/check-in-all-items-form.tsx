"use client";

import { useFormStatus } from "react-dom";

type CheckInAllItemsFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  itemCount: number;
  jobId: string;
};

function SubmitButton({ itemCount }: { itemCount: number }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center justify-center rounded-xl border border-[#b95f34] bg-[#fffaf4] px-4 py-2.5 text-sm font-semibold text-[#a7502d] transition hover:bg-[#fceddf] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Checking In…" : `Check In All (${itemCount})`}
    </button>
  );
}

export function CheckInAllItemsForm({ action, itemCount, jobId }: CheckInAllItemsFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Check in all ${itemCount} item${itemCount === 1 ? "" : "s"} currently checked out to this project?`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="job_id" type="hidden" value={jobId} />
      <SubmitButton itemCount={itemCount} />
    </form>
  );
}
