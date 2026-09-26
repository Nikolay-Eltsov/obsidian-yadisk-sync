import { test } from "node:test";
import assert from "node:assert/strict";
import { runPool } from "../src/utils";

test("work handed to the priority lane runs before the rest of the pool", async () => {
	const order: string[] = [];
	const urgent = ["typed"];
	await runPool(
		["a", "b", "c"],
		1,
		async (name) => {
			order.push(name);
			// Turns up once the pool is under way.
			if (name === "a") urgent.push("late");
		},
		undefined,
		() => {
			const next = urgent.shift();
			return next === undefined ? undefined : async () => { order.push(next); };
		},
	);
	assert.deepEqual(order, ["typed", "a", "late", "b", "c"]);
});
