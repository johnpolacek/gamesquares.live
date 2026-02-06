import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Fetch NFL scores from ESPN every 2 minutes (e.g. on game day)
crons.interval(
	"fetch nfl scores",
	{ minutes: 2 },
	api.nflScores.fetchAndUpdateScores,
);

export default crons;
