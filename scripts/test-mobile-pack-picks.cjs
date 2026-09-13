const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../apps/mobile/src/lib/jobs.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function setup({ requestedItem = "item-a", pickJob = "project", failUpdate = false, failDelete = false } = {}) {
  const state = {
    request: { id: "request", job_id: "project", requested_item_id: requestedItem },
    pick: { id: "pick", job_id: pickJob, item_id: "item-a", pack_request_id: "request" },
  };
  const client = {
    from(table) {
      let operation = "select";
      let payload;
      const filters = [];
      const query = {
        select() { return query; },
        update(value) { operation = "update"; payload = value; return query; },
        delete() { operation = "delete"; return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        maybeSingle() { return query; },
        then(resolve, reject) {
          const row = table === "job_pick_items" ? state.pick : state.request;
          const matches = row && filters.every(([key, value]) => row[key] === value);
          let result = { data: null, error: null };
          if (matches) {
            if ((operation === "update" && failUpdate) || (operation === "delete" && failDelete)) {
              result.error = { message: "write failed" };
            } else if (operation === "update") {
              Object.assign(row, payload);
            } else if (operation === "delete") {
              state.pick = null;
            } else {
              result.data = { ...row };
            }
          }
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => name === "./supabase" ? { getSupabaseClient: () => client } : {},
  });
  return { state, remove: () => exports.deleteJobPickItem("pick", "project") };
}

test("removing the original pick clears its selection", async () => {
  const { state, remove } = setup();
  await remove();
  assert.equal(state.pick, null);
  assert.equal(state.request.requested_item_id, null);
});

test("removing an alternate leaves a different original selection intact", async () => {
  const { state, remove } = setup({ requestedItem: "item-b" });
  await remove();
  assert.equal(state.pick, null);
  assert.equal(state.request.requested_item_id, "item-b");
});

test("removal cannot mutate a pick from another project", async () => {
  const { state, remove } = setup({ pickJob: "other-project" });
  await remove();
  assert.ok(state.pick);
  assert.equal(state.request.requested_item_id, "item-a");
});

test("failed selection cleanup keeps the pick for retry", async () => {
  const { state, remove } = setup({ failUpdate: true });
  await assert.rejects(remove(), /write failed/);
  assert.ok(state.pick);
  assert.equal(state.request.requested_item_id, "item-a");
});

test("failed deletion retains the pick, and repeat removal is safe", async () => {
  const failed = setup({ failDelete: true });
  await assert.rejects(failed.remove(), /write failed/);
  assert.ok(failed.state.pick);
  const success = setup({ requestedItem: null });
  await success.remove();
  await success.remove();
  assert.equal(success.state.pick, null);
});
