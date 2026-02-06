/**
 * Convex test setup: load all Convex function modules (exclude test files)
 * so convexTest(schema, modules) can run mutations/queries.
 * Lives at project root so Convex deploy does not try to run it.
 */
const allModules = import.meta.glob("./convex/**/*.ts") as Record<
	string,
	() => Promise<unknown>
>;
export const modules = Object.fromEntries(
	Object.entries(allModules).filter(([path]) => !path.endsWith(".test.ts")),
) as Record<string, () => Promise<unknown>>;
