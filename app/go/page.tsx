"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { addPoolToHistory } from "@/lib/pool-history";

function GoPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get("token");
	const [error, setError] = useState<string | null>(null);
	const [isValidating, setIsValidating] = useState(true);

	useEffect(() => {
		async function validate() {
			if (!token) {
				setError("No token provided. Please use the link from your email.");
				setIsValidating(false);
				return;
			}

			try {
				const response = await fetch("/api/auth/validate-token", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token }),
				});

				const result = await response.json();

				if (result.success) {
					// Upgrade pool history entry to admin role now that email is verified
					if (result.slug) {
						const now = Date.now();
						addPoolToHistory({
							slug: result.slug,
							title: result.title || result.slug,
							role: "admin",
							joinedAt: now,
							verifiedAt: now,
						});
					}
					// Redirect to admin page (cookie is already set by API)
					router.replace(result.redirectUrl);
				} else {
					setError(result.error);
					setIsValidating(false);
				}
			} catch (err) {
				console.error("Token validation error:", err);
				setError("Something went wrong. Please try again.");
				setIsValidating(false);
			}
		}

		validate();
	}, [token, router]);

	if (isValidating) {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background">
				<div className="flex flex-col items-center gap-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
					<p className="text-muted-foreground">Validating your admin link...</p>
				</div>
			</main>
		);
	}

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background">
			<div className="flex flex-col items-center gap-6 text-center max-w-md">
				<div className="rounded-full bg-destructive/10 p-4">
					<svg
						className="h-8 w-8 text-destructive"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h1 className="text-2xl font-bold">Link Problem</h1>
				<p className="text-muted-foreground">{error}</p>
				<a
					href="/"
					className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Go to Homepage
				</a>
			</div>
		</main>
	);
}

export default function GoPage() {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				</main>
			}
		>
			<GoPageContent />
		</Suspense>
	);
}
