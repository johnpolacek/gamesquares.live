"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, Play, Pause } from "lucide-react";
import gsap from "gsap";
import { SCENE_META } from "@/components/demo/demo-data";
import {
	SceneCreate,
	SceneShare,
	SceneJoin,
	ScenePick,
	SceneStart,
	SceneQ1,
	SceneFinal,
} from "@/components/demo/demo-scenes";

const SCENE_COMPONENTS = [
	SceneCreate,
	SceneShare,
	SceneJoin,
	ScenePick,
	SceneStart,
	SceneQ1,
	SceneFinal,
];

const TOTAL = SCENE_META.length;
const AUTO_PLAY_INTERVAL = 5000; // 5s per scene

export default function DemoPage() {
	const [current, setCurrent] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);
	const animating = useRef(false);
	const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ── Animate scene entrance ──────────────────────────────────────────
	const animateIn = useCallback((index: number) => {
		const el = sceneRefs.current[index];
		if (!el) return;

		const tl = gsap.timeline();

		// Prepare - set initial state
		gsap.set(el, { opacity: 1, visibility: "visible" });

		// Get animatable children
		const sceneEls = el.querySelectorAll(".scene-el");
		const playerChips = el.querySelectorAll(".player-chip");
		const numCells = el.querySelectorAll(".num-cell");
		const chatBubbles = el.querySelectorAll(".chat-bubble, .chat-reply");
		const quarterRows = el.querySelectorAll(".quarter-row");
		const gridCells = el.querySelectorAll(".grid-cell");

		// Reset children
		gsap.set(sceneEls, { opacity: 0, y: 20 });
		if (playerChips.length) gsap.set(playerChips, { opacity: 0, scale: 0.5 });
		if (numCells.length) gsap.set(numCells, { opacity: 0, scale: 0, rotation: -90 });
		if (chatBubbles.length) gsap.set(chatBubbles, { opacity: 0, x: 30 });
		if (quarterRows.length) gsap.set(quarterRows, { opacity: 0, x: -20 });

		// Animate scene elements in with stagger
		tl.to(sceneEls, {
			opacity: 1,
			y: 0,
			duration: 0.5,
			stagger: 0.1,
			ease: "power2.out",
		});

		// Scene-specific animations
		if (playerChips.length) {
			tl.to(
				playerChips,
				{
					opacity: 1,
					scale: 1,
					duration: 0.3,
					stagger: 0.06,
					ease: "back.out(1.4)",
				},
				"-=0.2",
			);
		}

		if (numCells.length) {
			tl.to(
				numCells,
				{
					opacity: 1,
					scale: 1,
					rotation: 0,
					duration: 0.3,
					stagger: 0.04,
					ease: "back.out(1.7)",
				},
				"-=0.3",
			);
		}

		if (chatBubbles.length) {
			tl.to(
				chatBubbles,
				{
					opacity: 1,
					x: 0,
					duration: 0.4,
					stagger: 0.15,
					ease: "power2.out",
				},
				"-=0.3",
			);
		}

		if (quarterRows.length) {
			tl.to(
				quarterRows,
				{
					opacity: 1,
					x: 0,
					duration: 0.3,
					stagger: 0.08,
					ease: "power2.out",
				},
				"-=0.3",
			);
		}

		// Grid cells fade in for certain scenes
		if (gridCells.length && index >= 3) {
			gsap.set(gridCells, { opacity: 0 });
			tl.to(
				gridCells,
				{
					opacity: 1,
					duration: 0.02,
					stagger: { amount: 0.8, from: "random" },
					ease: "none",
				},
				"-=0.6",
			);
		}

		// Scene-specific extras
		if (index === 0) {
			// Create scene: pulse the button
			const btn = el.querySelector(".create-btn");
			if (btn) {
				tl.to(btn, { scale: 1.03, duration: 0.4, ease: "power1.inOut", yoyo: true, repeat: 1 }, "-=0.2");
			}
		}

		if (index === 5) {
			// Q1: pulse the score numbers
			const scores = el.querySelectorAll(".score-num");
			if (scores.length) {
				tl.from(scores, { scale: 0.5, duration: 0.5, ease: "back.out(2)", stagger: 0.1 }, "-=0.4");
			}
			const winner = el.querySelector(".winner-name");
			if (winner) {
				tl.from(winner, { opacity: 0, scale: 0.8, duration: 0.4, ease: "back.out(1.5)" }, "-=0.1");
			}
		}

		if (index === 6) {
			// Final: bigger score reveal + CTA
			const scores = el.querySelectorAll(".score-num");
			if (scores.length) {
				tl.from(scores, { scale: 0.3, duration: 0.6, ease: "back.out(2.5)", stagger: 0.12 }, "-=0.5");
			}
			const cta = el.querySelector(".cta-btn");
			if (cta) {
				tl.from(cta, { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" }, "-=0.1");
				tl.to(cta, { scale: 1.03, duration: 0.5, ease: "power1.inOut", yoyo: true, repeat: 1 }, "+=0.2");
			}
		}

		return tl;
	}, []);

	// ── Animate scene exit ──────────────────────────────────────────────
	const animateOut = useCallback((index: number, direction: "left" | "right") => {
		const el = sceneRefs.current[index];
		if (!el) return gsap.timeline();

		const xTo = direction === "left" ? -60 : 60;

		return gsap.timeline().to(el, {
			opacity: 0,
			x: xTo,
			duration: 0.35,
			ease: "power2.in",
			onComplete: () => {
				gsap.set(el, { visibility: "hidden", x: 0 });
			},
		});
	}, []);

	// ── Go to scene ─────────────────────────────────────────────────────
	const goTo = useCallback(
		(target: number) => {
			if (target === current || target < 0 || target >= TOTAL || animating.current) return;
			animating.current = true;

			const direction = target > current ? "left" : "right";

			// Prepare next scene
			const nextEl = sceneRefs.current[target];
			if (nextEl) {
				gsap.set(nextEl, {
					visibility: "visible",
					opacity: 0,
					x: direction === "left" ? 60 : -60,
				});
			}

			// Animate out current, then in next
			const outTl = animateOut(current, direction);
			outTl.eventCallback("onComplete", () => {
				if (nextEl) {
					gsap.to(nextEl, {
						x: 0,
						opacity: 1,
						duration: 0.35,
						ease: "power2.out",
						onComplete: () => {
							animateIn(target);
							setCurrent(target);
							animating.current = false;
						},
					});
				} else {
					animating.current = false;
				}
			});
		},
		[current, animateOut, animateIn],
	);

	const next = useCallback(() => {
		if (current < TOTAL - 1) goTo(current + 1);
	}, [current, goTo]);

	const prev = useCallback(() => {
		if (current > 0) goTo(current - 1);
	}, [current, goTo]);

	// ── Initial mount: show first scene ─────────────────────────────────
	useEffect(() => {
		// Hide all scenes except the first
		for (let i = 0; i < TOTAL; i++) {
			const el = sceneRefs.current[i];
			if (el) {
				gsap.set(el, {
					visibility: i === 0 ? "visible" : "hidden",
					opacity: i === 0 ? 1 : 0,
				});
			}
		}
		// Animate first scene in
		animateIn(0);
	}, [animateIn]);

	// ── Keyboard navigation ─────────────────────────────────────────────
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" || e.key === " ") {
				e.preventDefault();
				next();
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				prev();
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [next, prev]);

	// ── Auto-play ───────────────────────────────────────────────────────
	useEffect(() => {
		if (isPlaying) {
			autoPlayTimer.current = setTimeout(() => {
				if (current < TOTAL - 1) {
					next();
				} else {
					setIsPlaying(false);
				}
			}, AUTO_PLAY_INTERVAL);
		}
		return () => {
			if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
		};
	}, [isPlaying, current, next]);

	return (
		<div ref={containerRef} className="relative h-dvh w-full overflow-hidden bg-background">
			{/* ── Top bar ──────────────────────────────────────────────────── */}
			<div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6 bg-background/80 backdrop-blur-sm">
				<Link
					href="/"
					className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
				>
					<ChevronLeft className="w-4 h-4" />
					<span className="hidden sm:inline">Back</span>
				</Link>
				<div className="flex items-center gap-1.5">
					<svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="text-primary" aria-hidden="true">
						<rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.9" />
						<rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
						<rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
						<rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
					</svg>
					<span className="font-mono text-sm font-bold text-foreground">GameSquares</span>
				</div>
				<div className="w-14" /> {/* Spacer for centering */}
			</div>

			{/* ── Scene viewport ───────────────────────────────────────────── */}
			<div className="relative h-full w-full">
				{SCENE_COMPONENTS.map((Scene, i) => (
					<Scene
						key={SCENE_META[i].id}
						ref={(el: HTMLDivElement | null) => {
							sceneRefs.current[i] = el;
						}}
					/>
				))}
			</div>

			{/* ── Bottom navigation ────────────────────────────────────────── */}
			<div className="absolute bottom-0 left-0 right-0 z-30 pb-4 pt-3 px-4 sm:px-6 bg-linear-to-t from-background via-background/95 to-transparent">
				{/* Timeline dots */}
				<div className="flex items-center justify-center gap-1 mb-3">
					{SCENE_META.map((s, i) => (
						<button
							key={s.id}
							type="button"
							onClick={() => goTo(i)}
							className="group flex flex-col items-center gap-1"
							aria-label={`Go to ${s.title}`}
						>
							<span
								className={`text-[9px] font-semibold uppercase tracking-wider transition-colors sm:text-[10px] ${
									i === current ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"
								}`}
							>
								{s.label}
							</span>
							<span
								className={`block h-2 rounded-full transition-all duration-300 ${
									i === current
										? "w-6 bg-primary"
										: i < current
											? "w-2 bg-primary/40"
											: "w-2 bg-border"
								}`}
							/>
						</button>
					))}
				</div>

				{/* Nav buttons */}
				<div className="flex items-center justify-center gap-3">
					<button
						type="button"
						onClick={prev}
						disabled={current === 0}
						className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-card-foreground ring-1 ring-border transition-all hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
						aria-label="Previous scene"
					>
						<ArrowLeft className="w-4 h-4" />
					</button>

					<button
						type="button"
						onClick={() => setIsPlaying(!isPlaying)}
						className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95"
						aria-label={isPlaying ? "Pause" : "Play"}
					>
						{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
					</button>

					<button
						type="button"
						onClick={next}
						disabled={current === TOTAL - 1}
						className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-card-foreground ring-1 ring-border transition-all hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
						aria-label="Next scene"
					>
						<ArrowRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
