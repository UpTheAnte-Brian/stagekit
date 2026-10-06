"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "We couldn’t send your message. Please try again.");
      setStatus("error");
      return;
    }
    event.currentTarget.reset();
    setStatus("sent");
  }

  return <form className="grid gap-4" onSubmit={submit}>
    <label className="grid gap-1 text-sm font-medium">Name<input required className="rounded-xl border border-[#c8ad75]/60 bg-white px-4 py-3 text-[#26332c] outline-none ring-[#c9a662] focus:ring-2" name="name" autoComplete="name" /></label>
    <label className="grid gap-1 text-sm font-medium">Email<input required className="rounded-xl border border-[#c8ad75]/60 bg-white px-4 py-3 text-[#26332c] outline-none ring-[#c9a662] focus:ring-2" name="email" type="email" autoComplete="email" /></label>
    <label className="grid gap-1 text-sm font-medium">How can we help?<textarea required className="min-h-32 rounded-xl border border-[#c8ad75]/60 bg-white px-4 py-3 text-[#26332c] outline-none ring-[#c9a662] focus:ring-2" name="message" /></label>
    <input aria-hidden="true" autoComplete="off" className="hidden" name="website" tabIndex={-1} />
    <button className="w-fit rounded-full bg-[#c9a662] px-6 py-3 text-sm font-semibold text-[#25342b] disabled:cursor-wait disabled:opacity-70" disabled={status === "sending"} type="submit">{status === "sending" ? "Sending…" : "Send message"}</button>
    <p aria-live="polite" className={status === "sent" ? "text-sm text-[#d9e3d8]" : "text-sm text-[#ffd3c4]"}>{status === "sent" ? "Thank you—your message is on its way." : error}</p>
  </form>;
}
