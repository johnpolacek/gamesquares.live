import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "How to Play Super Bowl Squares - GameSquares.live",
	description:
		"Learn how Super Bowl Squares works: the 10x10 grid, how numbers are assigned, and how winners are determined each quarter.",
};

export default function HowToPlayPage() {
	return (
		<main className="min-h-dvh bg-background px-6 py-12">
			<div className="mx-auto max-w-2xl space-y-8 opacity-0 animate-fade-in-up">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-foreground">
						How to Play Super Bowl Squares
					</h1>
					<Link
						href="/"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						&larr; Home
					</Link>
				</div>

				<div className="space-y-6 text-sm leading-relaxed text-foreground/90">
					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							What are Super Bowl Squares?
						</h2>
						<p>
							Super Bowl Squares (also called &quot;football squares&quot; or
							&quot;the grid&quot;) is one of the most popular ways to follow the
							big game with friends, family, or coworkers. It&apos;s simple,
							fun, and completely luck-based &mdash; no football knowledge
							required.
						</p>
						<p>
							The game uses a <strong>10&times;10 grid</strong> with 100
							squares. One team is assigned to the columns (top) and the other
							to the rows (side). Each row and column is labeled with a digit
							from <strong>0&ndash;9</strong>, giving every square a unique pair
							of numbers.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							How to Play
						</h2>
						<ol className="list-decimal space-y-2 pl-5">
							<li>
								<strong>Claim your squares.</strong> Players pick squares on
								the grid. Each pool has a limit on how many squares one person
								can claim (often 5).
							</li>
							<li>
								<strong>Numbers are assigned.</strong> After the board is full,
								the pool admin randomly assigns the digits 0&ndash;9 to each
								row and each column. This keeps things fair &mdash; nobody
								knows which numbers they&apos;ll get when they pick.
							</li>
							<li>
								<strong>Watch the game.</strong> At the end of each quarter,
								check the score. The last digit of each team&apos;s score
								points to the winning square.
							</li>
							<li>
								<strong>Win!</strong> If your name is on the winning square,
								you win that quarter.
							</li>
						</ol>
					</section>

					<section className="space-y-3">
						<h2 className="text-base font-semibold text-foreground">
							How Winners Are Decided
						</h2>
						<p>
							At the end of each quarter (Q1, Q2, Q3, and the Final), take the{" "}
							<strong>last digit</strong> of each team&apos;s score. Find
							where the row digit and column digit intersect on the grid
							&mdash; that square wins.
						</p>
						<div className="rounded-lg border border-border bg-card p-4 space-y-3">
							<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Example
							</p>
							<p>
								Say the halftime score is{" "}
								<strong>Chiefs 17, Eagles 23</strong>.
							</p>
							<ul className="list-disc space-y-1 pl-5">
								<li>
									Chiefs score: 1<strong>7</strong> &rarr; last digit is{" "}
									<strong>7</strong>
								</li>
								<li>
									Eagles score: 2<strong>3</strong> &rarr; last digit is{" "}
									<strong>3</strong>
								</li>
							</ul>
							<p>
								The winning square is at <strong>row 7, column 3</strong> (or
								vice versa, depending on which team is assigned to rows vs.
								columns). Whoever claimed that square wins Q2.
							</p>
						</div>
						<p>
							There are <strong>four chances to win</strong> &mdash; one per
							quarter. Some pools also pay out for the final score.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Which Numbers Are Best?
						</h2>
						<p>
							Since football scores tend to end in certain digits more often
							(0, 7, 3, 4), those numbers historically win more frequently.
							But because numbers are randomly assigned, every square has an
							equal chance of getting a great combo. That&apos;s the fun of it.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							About GameSquares.live
						</h2>
						<p>
							GameSquares.live makes it easy to run a Super Bowl Squares pool
							online. Create a pool in seconds &mdash; no account needed. Share
							the link with your group, and everyone can pick their squares from
							their phone. Scores update live so you can follow along in
							real time.
						</p>
					</section>
				</div>

				<div className="border-t border-border pt-6 text-xs text-muted-foreground">
					<Link href="/" className="hover:text-foreground underline">
						Back to GameSquares.live
					</Link>
				</div>
			</div>
		</main>
	);
}
