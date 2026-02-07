"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export function Providers({ children }: { children: React.ReactNode }) {
	let content = <>{children}</>;

	if (recaptchaSiteKey) {
		content = (
			<GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
				{content}
			</GoogleReCaptchaProvider>
		);
	}

	if (convex) {
		content = <ConvexProvider client={convex}>{content}</ConvexProvider>;
	}

	return content;
}
