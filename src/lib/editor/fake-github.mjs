// In-memory fake of the GitHub REST endpoints the editor uses. Used by unit tests (Node) and
// injected into the browser for UI tests, so it is plain JS with no imports.
// createFakeGitHub({ owner, repo, base, files: { path: utf8Text }, images: [path] }) -> { fetch, state }

export function createFakeGitHub(seed) {
  const owner = seed.owner || "kinojms";
  const repo = seed.repo || "kinojms.github.io";
  const base = seed.base || "main";
  let n = 0;
  const id = (p) => `${p}${(++n).toString(16).padStart(8, "0")}`;
  const enc = (s) => {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  };
  const state = { blobs: {}, trees: {}, commits: {}, refs: {}, pulls: [], calls: [], failNext: null };

  const putBlob = (b64) => {
    const sha = id("b");
    state.blobs[sha] = b64;
    return sha;
  };
  const entries = {};
  for (const [path, text] of Object.entries(seed.files || {})) entries[path] = putBlob(enc(text));
  for (const path of seed.images || []) entries[path] = putBlob(enc(`image:${path}`));
  const rootTree = id("t");
  state.trees[rootTree] = entries;
  const rootCommit = id("c");
  state.commits[rootCommit] = { tree: rootTree, parents: [], message: "initial" };
  state.refs[base] = rootCommit;

  const json = (status, body) =>
    new Response(body == null ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  /** Commit a change directly (simulates someone editing on GitHub). */
  state.commitDirect = (branch, files) => {
    const head = state.refs[branch];
    const tree = { ...state.trees[state.commits[head].tree] };
    for (const [path, text] of Object.entries(files)) {
      if (text === null) delete tree[path];
      else tree[path] = putBlob(enc(text));
    }
    const t = id("t");
    state.trees[t] = tree;
    const c = id("c");
    state.commits[c] = { tree: t, parents: [head], message: "direct" };
    state.refs[branch] = c;
    return c;
  };
  /** Read a file (utf-8) at a branch head. */
  state.read = (branch, path) => {
    const tree = state.trees[state.commits[state.refs[branch]].tree];
    if (!tree[path]) return undefined;
    const bin = atob(state.blobs[tree[path]]);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  };
  state.has = (branch, path) => !!state.trees[state.commits[state.refs[branch]].tree][path];
  state.mergePull = (number) => {
    const pr = state.pulls.find((p) => p.number === number);
    state.refs[pr.base] = state.refs[pr.head];
    pr.state = "closed";
    delete state.refs[pr.head];
  };

  async function fakeFetch(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method || "GET").toUpperCase();
    const body = init.body ? JSON.parse(init.body) : null;
    state.calls.push(`${method} ${url.pathname}`);
    if (state.failNext) {
      const f = state.failNext;
      state.failNext = null;
      return json(f.status, { message: f.message || "fail" });
    }
    if (!/^Bearer .+/.test((init.headers || {}).Authorization || "")) return json(401, { message: "Bad credentials" });
    if ((init.headers || {}).Authorization === "Bearer bad") return json(401, { message: "Bad credentials" });

    const prefix = `/repos/${owner}/${repo}`;
    let p = url.pathname;
    if (p === "/user") return json(200, { login: owner });
    if (!p.startsWith(prefix)) return json(404, { message: "Not Found" });
    p = p.slice(prefix.length);

    if (p === "" && method === "GET") return json(200, { full_name: `${owner}/${repo}`, permissions: { push: (init.headers || {}).Authorization !== "Bearer readonly" } });

    if (p === "/pulls" && method === "GET") {
      const open = state.pulls.filter((x) => x.state === "open");
      return json(200, open.map((x) => ({
        number: x.number, html_url: x.html_url, created_at: x.created_at, state: x.state,
        head: { ref: x.head, repo: { full_name: `${owner}/${repo}` } }, base: { ref: x.base },
      })));
    }
    let m;
    if ((m = p.match(/^\/pulls\/(\d+)$/)) && method === "GET") {
      const pr = state.pulls.find((x) => x.number === Number(m[1]));
      return pr ? json(200, { number: pr.number, state: pr.state, html_url: pr.html_url }) : json(404, { message: "Not Found" });
    }
    if (p === "/pulls" && method === "POST") {
      if (!state.refs[body.head]) return json(422, { message: "head missing" });
      const number = state.pulls.length + 1;
      const pr = { number, html_url: `https://github.com/${owner}/${repo}/pull/${number}`, head: body.head, base: body.base, title: body.title, body: body.body, state: "open", created_at: new Date(Date.now() + number).toISOString() };
      state.pulls.push(pr);
      return json(201, { number, html_url: pr.html_url });
    }
    if ((m = p.match(/^\/git\/ref\/heads\/(.+)$/)) && method === "GET") {
      const b = decodeURIComponent(m[1]);
      return state.refs[b] ? json(200, { object: { sha: state.refs[b] } }) : json(404, { message: "Not Found" });
    }
    if ((m = p.match(/^\/git\/refs\/heads\/(.+)$/)) && method === "PATCH") {
      const b = decodeURIComponent(m[1]);
      const cur = state.refs[b];
      if (!cur) return json(422, { message: "Reference does not exist" });
      const commit = state.commits[body.sha];
      if (!body.force && !commit.parents.includes(cur)) return json(422, { message: "Update is not a fast forward" });
      state.refs[b] = body.sha;
      return json(200, { object: { sha: body.sha } });
    }
    if (p === "/git/refs" && method === "POST") {
      const b = body.ref.replace(/^refs\/heads\//, "");
      if (state.refs[b]) return json(422, { message: "Reference already exists" });
      state.refs[b] = body.sha;
      return json(201, { ref: body.ref, object: { sha: body.sha } });
    }
    if ((m = p.match(/^\/git\/commits\/(\w+)$/)) && method === "GET") {
      const c = state.commits[m[1]];
      return c ? json(200, { sha: m[1], tree: { sha: c.tree } }) : json(404, { message: "Not Found" });
    }
    if (p === "/git/commits" && method === "POST") {
      const c = id("c");
      state.commits[c] = { tree: body.tree, parents: body.parents, message: body.message };
      return json(201, { sha: c });
    }
    if ((m = p.match(/^\/git\/trees\/(\w+)$/)) && method === "GET") {
      const t = state.trees[m[1]];
      return json(200, { sha: m[1], truncated: false, tree: Object.entries(t).map(([path, sha]) => ({ path, type: "blob", sha })) });
    }
    if (p === "/git/trees" && method === "POST") {
      const tree = { ...(state.trees[body.base_tree] || {}) };
      for (const e of body.tree) {
        if (e.sha === null) delete tree[e.path];
        else tree[e.path] = e.sha;
      }
      const t = id("t");
      state.trees[t] = tree;
      return json(201, { sha: t });
    }
    if ((m = p.match(/^\/git\/blobs\/(\w+)$/)) && method === "GET") return json(200, { content: state.blobs[m[1]], encoding: "base64" });
    if (p === "/git/blobs" && method === "POST") {
      const b64 = body.encoding === "base64" ? body.content : enc(body.content);
      return json(201, { sha: putBlob(b64) });
    }
    return json(404, { message: `Fake GitHub: unhandled ${method} ${p}` });
  }

  return { fetch: fakeFetch, state };
}
