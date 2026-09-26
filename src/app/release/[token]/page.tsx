import Link from "next/link";
import { notFound } from "next/navigation";

import { respondToPhotoReleaseAction } from "./actions";
import { getPhotoRelease } from "@/lib/db/photo-releases";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function PhotoReleasePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { token } = await params;
  const search = await searchParams;
  const release = await getPhotoRelease(token);
  if (!release) notFound();
  const complete = first(search.complete);
  const error = first(search.error);
  const expired = new Date(release.expiresAt) < new Date();
  const responseRecorded = complete || release.status === "approved" || release.status === "declined";
  const approved = complete === "approved" || release.status === "approved";
  const channelNames = release.channels.map((channel) => channel === "linkedin" ? "LinkedIn" : channel === "website" ? "our website" : "client proposals").join(", ");

  return <main className="min-h-screen bg-[#f8f6f1] px-5 py-10 text-[#26332c] sm:px-8"><div className="mx-auto max-w-4xl"><Link className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9e7b39]" href="/">AJ Home Staging</Link><h1 className="mt-5 font-serif text-4xl leading-tight">A quick request about your finished home.</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-[#59635c]">{release.recipientName ? `${release.recipientName}, ` : ""}thank you for letting AJ Home Staging be part of {release.jobName}. We would love your permission to share selected final photos through {channelNames}.</p>{responseRecorded ? <section className="mt-8 rounded-3xl border border-[#c8ad75] bg-[#fffdf8] p-7"><h2 className="font-serif text-3xl">Thank you.</h2><p className="mt-3 text-[#59635c]">{approved ? "Your approval has been recorded. We will only use the images you approved for the listed purposes." : "Your preference has been recorded. These images will not be shared."}</p></section> : release.status !== "pending" || expired ? <section className="mt-8 rounded-3xl border border-[#e1d9c9] bg-white p-7"><h2 className="font-serif text-3xl">This request is no longer active.</h2><p className="mt-3 text-[#59635c]">Please contact AJ Home Staging if you have any questions.</p></section> : <form action={respondToPhotoReleaseAction} className="mt-8"><input name="token" type="hidden" value={token} />{error ? <p className="mb-5 rounded-xl bg-[#fff0eb] p-4 text-sm font-medium text-[#9a3f20]">{error}</p> : null}<section className="rounded-3xl border border-[#e1d9c9] bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-serif text-3xl">Choose the images you approve</h2><p className="mt-2 text-sm leading-6 text-[#657067]">Uncheck anything you would prefer we not use. No image will be shared without your selection.</p></div><p className="rounded-full bg-[#f4ead6] px-3 py-1 text-xs font-semibold text-[#76531e]">Review by {new Date(release.expiresAt).toLocaleDateString()}</p></div><div className="mt-7 grid gap-5 sm:grid-cols-2">{release.items.map((item) => <label className="overflow-hidden rounded-2xl border border-[#e1d9c9] bg-[#fffdf8]" key={item.id}><div className="aspect-[4/3] bg-[#d8d1c2]">{item.url ? item.isVideo ? <video className="h-full w-full object-cover" controls preload="metadata" src={item.url} /> : <img alt="Finished room selected for approval" className="h-full w-full object-cover" src={item.url} /> : null}</div><span className="flex items-center gap-3 p-4 text-sm font-semibold"><input defaultChecked name="approved_item_ids" type="checkbox" value={item.id} />Approve this {item.isVideo ? "video" : "photo"}</span></label>)}</div><label className="mt-7 flex items-start gap-3 rounded-xl bg-[#f7f3ea] p-4 text-sm leading-6 text-[#59635c]"><input className="mt-1" required type="checkbox" />I understand that my choices apply only to the images above and the listed channels.</label><div className="mt-6 flex flex-wrap gap-3"><button className="rounded-full bg-[#283a31] px-6 py-3 text-sm font-semibold text-white" name="intent" value="approve">Save my choices</button><button className="rounded-full border border-[#c9b58a] px-6 py-3 text-sm font-semibold text-[#665021]" name="intent" value="decline">I do not approve any images</button></div></section></form>}</div></main>;
}
