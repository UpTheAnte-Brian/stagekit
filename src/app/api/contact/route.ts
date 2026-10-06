import { NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5_000),
  website: z.string().max(0).optional(),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

export async function POST(request: Request) {
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!recipient || !apiKey || !from) {
    return NextResponse.json({ error: "The contact form is not configured yet. Please call us instead." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide your name, a valid email address, and a message of at least 10 characters." }, { status: 400 });
  }

  if (parsed.data.website) return NextResponse.json({ ok: true });

  const { name, email, message } = parsed.data;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: email,
      subject: `New AJ Home Staging inquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}<br /><strong>Email:</strong> ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
    }),
  });

  if (!response.ok) {
    console.error("Contact email delivery failed", await response.text());
    return NextResponse.json({ error: "We couldn’t send your message just now. Please call us instead." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
