"use client";

/**
 * Renders a player "graphic" (emoji or Lucide icon) for squares and picker.
 * Stored value: emoji character (e.g. "🏈") or "lucide:IconName" (e.g. "lucide:Trophy").
 */

import {
	Trophy,
	Star,
	Flame,
	Zap,
	Target,
	Crown,
	Heart,
	Gem,
	Music,
	Gamepad2,
	Sparkles,
	Award,
	Shield,
	Swords,
	PartyPopper,
	Lightbulb,
	Bird,
	Fish,
	Cat,
	Dog,
	Palette,
	Apple,
	Beer,
	Bike,
	Bot,
	Bug,
	Cake,
	Camera,
	Car,
	Castle,
	Cherry,
	Clover,
	Cloud,
	CloudRain,
	Coffee,
	Cookie,
	Diamond,
	Dices,
	Drum,
	Flower,
	Footprints,
	Ghost,
	Gift,
	Grape,
	Guitar,
	Key,
	Lamp,
	Laugh,
	Leaf,
	Medal,
	Mic,
	Moon,
	Mountain,
	Music2,
	Pizza,
	Plane,
	Rabbit,
	Radio,
	Rainbow,
	Rocket,
	Ship,
	Skull,
	Smile,
	Snowflake,
	Sparkle,
	Sun,
	Tent,
	TreePine,
	Turtle,
	Wand,
	Wine,
	type LucideIcon,
} from "lucide-react";

const LUCIDE_PREFIX = "lucide:";

const LUCIDE_MAP: Record<string, LucideIcon> = {
	Trophy,
	Star,
	Flame,
	Zap,
	Target,
	Crown,
	Heart,
	Gem,
	Music,
	Gamepad2,
	Sparkles,
	Award,
	Shield,
	Swords,
	PartyPopper,
	Lightbulb,
	Bird,
	Fish,
	Cat,
	Dog,
	Palette,
	Apple,
	Beer,
	Bike,
	Bot,
	Bug,
	Cake,
	Camera,
	Car,
	Castle,
	Cherry,
	Clover,
	Cloud,
	CloudRain,
	Coffee,
	Cookie,
	Diamond,
	Dices,
	Drum,
	Flower,
	Footprints,
	Ghost,
	Gift,
	Grape,
	Guitar,
	Key,
	Lamp,
	Laugh,
	Leaf,
	Medal,
	Mic,
	Moon,
	Mountain,
	Music2,
	Pizza,
	Plane,
	Rabbit,
	Radio,
	Rainbow,
	Rocket,
	Ship,
	Skull,
	Smile,
	Snowflake,
	Sparkle,
	Sun,
	Tent,
	TreePine,
	Turtle,
	Wand,
	Wine,
};

function isLucideId(value: string): value is `lucide:${string}` {
	return value.startsWith(LUCIDE_PREFIX);
}

function getLucideIcon(value: string): LucideIcon | null {
	if (!isLucideId(value)) return null;
	const name = value.slice(LUCIDE_PREFIX.length);
	return LUCIDE_MAP[name] ?? null;
}

type GraphicIconProps = {
	graphic: string;
	className?: string;
	size?: number;
	strokeWidth?: number;
};

export function GraphicIcon({
	graphic,
	className = "",
	size = 14,
	strokeWidth = 2.5,
}: GraphicIconProps) {
	const LucideComponent = getLucideIcon(graphic);

	if (LucideComponent) {
		return (
			<span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
				<LucideComponent size={size} strokeWidth={strokeWidth} />
			</span>
		);
	}

	// Emoji
	return <span className={className}>{graphic}</span>;
}

export { LUCIDE_PREFIX, LUCIDE_MAP, getLucideIcon, isLucideId };
