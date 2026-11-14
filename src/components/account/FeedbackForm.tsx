"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitFeedback, type FeedbackState } from "@/lib/feedback-actions";

type Labels = { placeholder: string; send: string; sending: string; sent: string; errors: Record<NonNullable<FeedbackState["error"]>, string> };

export function FeedbackForm({ labels }: { labels: Labels }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="mt-3 space-y-3">
      <textarea
        name="body"
        required
        minLength={3}
        maxLength={2000}
        rows={4}
        placeholder={labels.placeholder}
        className="w-full rounded border border-white/20 bg-neutral-900 px-3 py-2 outline-none focus:border-red-500"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-500 disabled:opacity-60">
          {pending ? labels.sending : labels.send}
        </button>
        {state.ok && !pending && <p role="status" className="text-sm text-green-400">✓ {labels.sent}</p>}
        {state.error && !pending && <p role="alert" className="text-sm text-red-400">{labels.errors[state.error]}</p>}
      </div>
    </form>
  );
}
