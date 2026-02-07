import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Terms of Use - GameSquares.live",
	description: "Terms of use for GameSquares.live",
};

export default function TermsOfUsePage() {
	return (
		<main className="min-h-dvh bg-background px-6 py-12">
			<div className="mx-auto max-w-2xl space-y-8">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold text-foreground">Terms of Use</h1>
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
							Acceptance of Terms
						</h2>
						<p>
							By accessing or using GameSquares.live (&quot;the site&quot;),
							you agree to these Terms of Use. If you do not agree, please do
							not use the site.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Description of Service
						</h2>
						<p>
							GameSquares.live is a free tool that lets you create and
							participate in football squares pools. The site provides a digital
							grid where participants can claim squares, and winners are
							determined by game scores. The site is provided for entertainment
							purposes only.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							No Gambling or Wagering
						</h2>
						<p>
							GameSquares.live does not facilitate, process, or manage any
							financial transactions, wagers, bets, or prizes. The site is a
							score-tracking and grid-management tool only. Any arrangements
							between pool participants regarding money or prizes are made
							entirely outside this site and are the sole responsibility of those
							participants. We are not a party to any such arrangements.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							User Responsibilities
						</h2>
						<ul className="list-disc space-y-1 pl-5">
							<li>
								You are responsible for ensuring that your use of the site
								complies with all applicable local, state, and federal laws.
							</li>
							<li>
								Pool runners are responsible for managing their pools, including
								sharing links and coordinating with participants.
							</li>
							<li>
								You agree not to use the site for any unlawful purpose or in a
								way that could damage, disable, or impair the service.
							</li>
							<li>
								You agree not to attempt to gain unauthorized access to any part
								of the site or its systems.
							</li>
						</ul>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							No Accounts
						</h2>
						<p>
							The site does not require user accounts or passwords. Pool runners
							receive admin access via a magic link sent to their email. Players
							join pools by entering a display name. You are responsible for
							keeping your admin link secure.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Intellectual Property
						</h2>
						<p>
							The site and its original content, features, and functionality are
							owned by GameSquares.live. NFL, Super Bowl, and team names are
							trademarks of their respective owners and are used here only for
							identification purposes.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Disclaimer of Warranties
						</h2>
						<p>
							The site is provided &quot;as is&quot; and &quot;as
							available&quot; without warranties of any kind, either express or
							implied. We do not guarantee that the site will be uninterrupted,
							error-free, or secure. Game scores may be entered manually or
							fetched from third-party sources and may not always be accurate or
							up to date.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Limitation of Liability
						</h2>
						<p>
							To the fullest extent permitted by law, GameSquares.live and its
							operators shall not be liable for any indirect, incidental,
							special, or consequential damages arising from your use of the
							site. This includes, but is not limited to, any losses related to
							incorrect scores, missed squares, site downtime, or arrangements
							made between pool participants.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Availability
						</h2>
						<p>
							We reserve the right to modify, suspend, or discontinue the site
							at any time without notice. We are not liable for any modification,
							suspension, or discontinuation of the service.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Changes to These Terms
						</h2>
						<p>
							We may update these Terms of Use from time to time. Changes will
							be posted on this page with an updated date. Continued use of the
							site after changes constitutes acceptance of the new terms.
						</p>
					</section>

					<section className="space-y-2">
						<h2 className="text-base font-semibold text-foreground">
							Contact
						</h2>
						<p>
							If you have questions about these terms, please open an issue on
							the project&apos;s GitHub repository or contact the site
							administrator.
						</p>
					</section>
				</div>

				<div className="border-t border-border pt-6 text-xs text-muted-foreground">
					<Link href="/privacy" className="hover:text-foreground underline">
						Privacy Policy
					</Link>
				</div>
			</div>
		</main>
	);
}
