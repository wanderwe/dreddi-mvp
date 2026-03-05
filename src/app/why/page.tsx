import type { Metadata } from "next";
import Link from "next/link";
import { StaticPageLayout } from "@/components/StaticPageLayout";
import { WhyProgress } from "./WhyProgress";

export const metadata: Metadata = {
  title: "Why Dreddi Exists — Dreddi",
  description:
    "Learn why Dreddi was built and how it turns promises into reputation through real outcomes.",
};

export default function WhyPage() {
  return (
    <StaticPageLayout id="why-top">
      <WhyProgress />

      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">Why Dreddi Exists</h1>
        <p className="text-lg text-slate-300 sm:text-xl">Dreddi knows who delivers.</p>
      </header>

      <div className="mt-14 space-y-14 text-base leading-relaxed text-slate-200">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">The promise problem</h2>
          <p>Every day people make promises.</p>
          <p>Deadlines. Deliverables. Agreements.</p>
          <p>Most of them live in chats, calls, and memory.</p>
          <p>When they are kept — everyone forgets.</p>
          <p>When they are broken — everyone argues.</p>
          <p>But almost never is there a clear record of what actually happened.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Trust without evidence</h2>
          <p>Over time, people stop trusting words.</p>
          <p>
            You hear things like:
            <br />• “Can I rely on them?”
            <br />• “Do they actually deliver?”
            <br />• “Have they done this before?”
          </p>
          <p>But the answers are usually based on opinions, not outcomes.</p>
          <p>Reviews can be biased.</p>
          <p>Stories can be exaggerated.</p>
          <p>Memories can be selective.</p>
          <p>There is rarely an objective trail of promises and results.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">A simple idea</h2>
          <p>Dreddi is built on a very simple principle:</p>
          <p className="font-semibold text-white">Promises should have a record.</p>
          <p>Not to judge people.</p>
          <p>Not to shame anyone.</p>
          <p>But simply to remember what was agreed — and what happened next.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">What Dreddi is not</h2>
          <p>Dreddi is not a rating system.</p>
          <p>It does not collect opinions.</p>
          <p>It does not publish reviews.</p>
          <p>It does not allow anonymous criticism.</p>
          <p>Dreddi does not decide who is good or bad.</p>
          <p>It only records commitments and outcomes.</p>
          <p>Because reputation should not depend on what people say about you.</p>
          <p>It should depend on what actually happened.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Reputation through actions</h2>
          <p>In Dreddi, reputation is not built on reviews.</p>
          <p>It emerges from outcomes.</p>
          <p>Did the promise happen?</p>
          <p>Was the deadline met?</p>
          <p>Was the commitment completed?</p>
          <p>Over time, a pattern appears.</p>
          <p>Not through opinions.</p>
          <p>Through actions.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Why it matters</h2>
          <p>Trust is one of the most valuable things people have.</p>
          <p>But in many situations it depends on vague memories and assumptions.</p>
          <p>
            Dreddi aims to make trust easier by introducing transparent commitments.
          </p>
          <p>A place where promises are visible.</p>
          <p>Deadlines are clear.</p>
          <p>And results are recorded.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Our vision</h2>
          <p>We believe reputation should be earned through actions.</p>
          <p>Not through marketing.</p>
          <p>Not through stories.</p>
          <p>Through what actually happened.</p>
          <p>
            Dreddi is a small step toward a world where promises are clearer and trust is easier.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Where Dreddi can be used</h2>
          <p>Dreddi works anywhere people make commitments.</p>
          <p>Freelancers and clients — confirming deadlines and deliverables.</p>
          <p>Partners and collaborators — recording responsibilities in joint work.</p>
          <p>Teams and small businesses — tracking who committed to what.</p>
          <p>Individuals — keeping personal promises visible and accountable.</p>
          <p>Anywhere a promise matters, a record can help.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Why now</h2>
          <p>More and more of our agreements happen online.</p>
          <p>In chats.</p>
          <p>In calls.</p>
          <p>Across platforms.</p>
          <p>But these commitments rarely leave a reliable trace.</p>
          <p>
            As digital work and remote collaboration grow, the gap between promises and accountability grows as well.
          </p>
          <p>Dreddi is an attempt to close that gap.</p>
        </section>

        <section className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Final note:</p>
          <p>Dreddi does not judge people.</p>
          <p>It simply records what happened.</p>
        </section>
      </div>

      <div className="mt-14">
        <Link
          href="/"
          className="inline-flex rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:translate-y-[-1px] hover:shadow-emerald-400/40"
        >
          Create your first promise
        </Link>
      </div>
    </StaticPageLayout>
  );
}
