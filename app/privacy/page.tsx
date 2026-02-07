import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Privacy Policy - GameSquares.live",
	description: "Privacy policy for GameSquares.live",
};

export default function PrivacyPolicyPage() {
	return (
		<main className="min-h-dvh bg-background px-6 py-12">
			<div className="mx-auto max-w-2xl space-y-8 opacity-0 animate-fade-in-up">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-foreground">
						Privacy Policy
					</h1>
					<Link
						href="/"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						&larr; Home
					</Link>
				</div>

				<p className="text-sm text-muted-foreground">
					Last updated: February 7, 2025
				</p>

				<div className="space-y-6 text-sm leading-relaxed text-foreground/90">
					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Overview
						</h2>
						<p>
							GameSquares.live (&quot;we&quot;, &quot;us&quot;, or
							&quot;the site&quot;) is a free tool for running football
							squares pools with friends. We are committed to keeping your
							experience simple and your data minimal.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Information We Collect
						</h2>
						<ul className="list-disc space-y-1 pl-5">
							<li>
								<strong>Pool runner email:</strong> When you create a pool, you
								provide an email address so we can send your admin link. We use
								this solely to deliver that link.
							</li>
							<li>
								<strong>Player display names and icons:</strong> When players
								join a pool, they enter a display name and choose an icon. These
								are visible to other participants in the pool.
							</li>
							<li>
								<strong>Pool data:</strong> Pool titles, square selections, and
								game scores are stored to operate the service.
							</li>
							<li>
								<strong>Analytics:</strong> We use Vercel Analytics to collect
								anonymous, aggregated usage data (page views, general geography).
								No personally identifiable information is collected by analytics.
							</li>
						</ul>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							What We Do Not Collect
						</h2>
						<ul className="list-disc space-y-1 pl-5">
							<li>We do not require user accounts or passwords.</li>
							<li>
								We do not collect payment information. GameSquares.live does not
								process payments or handle money. Any payouts between pool
								participants are arranged privately outside this site.
							</li>
							<li>
								We do not use cookies for advertising or cross-site tracking.
							</li>
						</ul>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							How We Use Your Information
						</h2>
						<ul className="list-disc space-y-1 pl-5">
							<li>To operate the squares pool service (display grids, track picks, show winners).</li>
							<li>To send the admin link email when a pool is created.</li>
							<li>To improve the site based on anonymous usage patterns.</li>
						</ul>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Data Storage and Security
						</h2>
						<p>
							Pool and game data is stored in Convex, a cloud database. Email
							delivery is handled by Resend. Both services maintain their own
							security and privacy practices. We do not sell or share your data
							with third parties for marketing purposes.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Data Retention
						</h2>
						<p>
							Pool data is retained as long as the pool exists. We may
							periodically remove old or inactive pool data. If you would like
							your pool or email removed, contact us at the address below.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Children&apos;s Privacy
						</h2>
						<p>
							GameSquares.live is not directed at children under 13. We do not
							knowingly collect personal information from children.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Changes to This Policy
						</h2>
						<p>
							We may update this privacy policy from time to time. Changes will
							be posted on this page with an updated date.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Contact
						</h2>
						<p>
							If you have questions about this privacy policy, please open an
							issue on the project&apos;s GitHub repository or contact the site
							administrator.
						</p>
					</section>
				</div>

				<div className="border-t border-border pt-6 text-xs text-muted-foreground">
					<Link href="/terms" className="hover:text-foreground underline">
						Terms of Use
					</Link>
				</div>
			</div>
		</main>
	);
}
