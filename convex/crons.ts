import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Fetch NFL scores from ESPN every minute on game day
// DISABLED: Super Bowl is over. Uncomment next year to re-enable automatic score updates.
// crons.interval(
// 	"fetch nfl scores",
// 	{ minutes: 1 },
// 	api.nflScores.fetchAndUpdateScores,
// );

export default crons;
