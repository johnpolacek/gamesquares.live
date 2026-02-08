import { Resend } from "resend";

function getResend(): Resend | null {
	const key = process.env.RESEND_API_KEY;
	if (!key) return null;
	return new Resend(key);
}

export type SendAdminLoginEmailParams = {
	to: string;
	adminLoginLink: string;
	poolLink: string;
	viewLink: string;
};

export async function sendAdminLoginEmail({
	to,
	adminLoginLink,
	poolLink,
	viewLink,
}: SendAdminLoginEmailParams): Promise<{ ok: boolean; error?: string }> {
	const resend = getResend();
	const isDev = process.env.NODE_ENV === "development";
	if (!resend || isDev) {
		// Mock: log email content so you can copy the admin link during dev/tests
		const text = [
			"Your pool is ready!",
			"",
			"Admin link (use this to manage your pool):",
			adminLoginLink,
			"",
			"Share this link with players to join:",
			poolLink,
			"",
			"View link (put this on a big screen for live updates):",
			viewLink,
		].join("\n");
		console.log("[mock email] To:", to);
		console.log("[mock email] Content:\n", text);
		return { ok: true };
	}

	const from =
		process.env.RESEND_FROM_EMAIL ?? "GameSquares <onboarding@resend.dev>";

	const text = [
		"Your pool is ready!",
		"",
		"Admin link (use this to manage your pool):",
		adminLoginLink,
		"",
		"Share this link with players to join:",
		poolLink,
		"",
		"View link (put this on a big screen for live updates):",
		viewLink,
		"",
		"Save your admin link — you'll need it to lock the board and assign numbers.",
	].join("\n");

	const { error } = await resend.emails.send({
		from,
		to: [to],
		subject: "Your GameSquares admin link",
		text,
	});

	if (error) {
		return { ok: false, error: error.message };
	}
	return { ok: true };
}
