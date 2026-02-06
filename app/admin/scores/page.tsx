"use client";

import { useState } from "react";
import Link from "next/link";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export default function GlobalScoresAdminPage() {
	const [secret, setSecret] = useState("");
	const [name, setName] = useState("Global Game");
	const [quarters, setQuarters] = useState<
		Record<string, { rowTeamScore: number; colTeamScore: number }>
	>(() =>
		Object.fromEntries(
			QUARTERS.map((q) => [q, { rowTeamScore: 0, colTeamScore: 0 }]),
		),
	);
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
		"idle",
	);
	const [message, setMessage] = useState("");

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setStatus("loading");
		setMessage("");
		try {
			const res = await fetch("/api/admin/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					secret,
					name: name.trim() || "Global Game",
					quarters: QUARTERS.map((label) => ({
						label,
						rowTeamScore: Number(quarters[label]?.rowTeamScore ?? 0),
						colTeamScore: Number(quarters[label]?.colTeamScore ?? 0),
					})),
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setStatus("error");
				setMessage(data.error ?? "Request failed");
				return;
			}
			setStatus("success");
			setMessage("Scores updated.");
		} catch (err) {
			setStatus("error");
			setMessage(err instanceof Error ? err.message : "Request failed");
		}
	}

	return (
		<main className="min-h-dvh bg-background px-6 py-12">
			<div className="mx-auto max-w-md space-y-8">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Global Game Scores</h1>
					<Link
						href="/"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						← Home
					</Link>
				</div>
				<p className="text-muted-foreground text-sm">
					Set quarter scores for the global game. Enter the passcode you
					configured in Convex (e.g. a number or phrase).
				</p>
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label
							htmlFor="name"
							className="mb-1 block text-sm font-medium text-foreground"
						>
							Game name
						</label>
						<input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="passcode"
							className="mb-1 block text-sm font-medium text-foreground"
						>
							Passcode
						</label>
						<input
							id="passcode"
							type="password"
							placeholder="e.g. 12345"
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							required
							autoComplete="off"
						/>
					</div>
					<div className="space-y-4">
						<span className="text-sm font-medium text-foreground">
							Quarters
						</span>
						<div className="grid gap-4 rounded-md border border-border p-4">
							{QUARTERS.map((q) => (
								<div key={q} className="flex items-center gap-3">
									<span className="w-8 text-sm text-muted-foreground">{q}</span>
									<div className="flex gap-2">
										<div>
											<label
												htmlFor={`${q}-row`}
												className="sr-only"
											>
												Row team score
											</label>
											<input
												id={`${q}-row`}
												type="number"
												min={0}
												value={quarters[q]?.rowTeamScore ?? 0}
												onChange={(e) =>
													setQuarters((prev) => ({
														...prev,
														[q]: {
															...prev[q],
															rowTeamScore: parseInt(e.target.value, 10) || 0,
														},
													}))
												}
												className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
											/>
										</div>
										<div>
											<label
												htmlFor={`${q}-col`}
												className="sr-only"
											>
												Col team score
											</label>
											<input
												id={`${q}-col`}
												type="number"
												min={0}
												value={quarters[q]?.colTeamScore ?? 0}
												onChange={(e) =>
													setQuarters((prev) => ({
														...prev,
														[q]: {
															...prev[q],
															colTeamScore: parseInt(e.target.value, 10) || 0,
														},
													}))
												}
												className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
											/>
										</div>
									</div>
								</div>
							))}
						</div>
						<p className="text-xs text-muted-foreground">
							Row = first team (e.g. row numbers), Col = second team (e.g. column
							numbers).
						</p>
					</div>
					{message && (
						<p
							className={
								status === "error"
									? "text-sm text-destructive"
									: "text-sm text-muted-foreground"
							}
						>
							{message}
						</p>
					)}
					<button
						type="submit"
						disabled={status === "loading"}
						className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{status === "loading" ? "Saving…" : "Save scores"}
					</button>
				</form>
			</div>
		</main>
	);
}
