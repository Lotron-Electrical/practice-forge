import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";

const router = Router();

// List resources for a piece/excerpt
router.get("/", async (req, res) => {
  const { linked_type, linked_id } = req.query;
  if (!linked_type || !linked_id)
    return res
      .status(400)
      .json({ error: "linked_type and linked_id required" });
  res.json(
    await queryAll(
      "SELECT * FROM resources WHERE linked_type = $1 AND linked_id = $2 AND user_id = $3 ORDER BY created_at DESC",
      [linked_type, linked_id, req.user.id],
    ),
  );
});

// Create a resource
router.post("/", async (req, res) => {
  const {
    linked_type,
    linked_id,
    resource_type,
    title,
    url,
    source,
    description = "",
    thumbnail_url,
    attribution = "",
  } = req.body;
  if (
    !linked_type ||
    !linked_id ||
    !resource_type ||
    !title ||
    !url ||
    !source
  ) {
    return res.status(400).json({
      error:
        "linked_type, linked_id, resource_type, title, url, source required",
    });
  }
  const id = uuid();
  await execute(
    "INSERT INTO resources (id, user_id, linked_type, linked_id, resource_type, title, url, source, description, thumbnail_url, attribution) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [
      id,
      req.user.id,
      linked_type,
      linked_id,
      resource_type,
      title,
      url,
      source,
      description,
      thumbnail_url || null,
      attribution,
    ],
  );
  res
    .status(201)
    .json(await queryOne("SELECT * FROM resources WHERE id = $1", [id]));
});

// Delete a resource
router.delete("/:id", async (req, res) => {
  if (
    !(await queryOne(
      "SELECT id FROM resources WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    ))
  )
    return res.status(404).json({ error: "Not found" });
  await execute("DELETE FROM resources WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.user.id,
  ]);
  res.json({ deleted: true });
});

// IMSLP search proxy
router.get("/search/imslp", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "q required" });
  try {
    const url = `https://imslp.org/imslpscripts/API.ISCR.php?account=worklist/disclaimer=accepted/sort=lexical/type=2/start=0/retformat=json/${encodeURIComponent(q)}`;
    const response = await fetch(url);
    const data = await response.json();
    // IMSLP returns an object with numeric keys + "metadata" key
    const results = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === "metadata") continue;
      if (val && val.id) {
        results.push({
          title: val.id.replace(/_/g, " "),
          url: `https://imslp.org/wiki/${encodeURIComponent(val.id)}`,
          source: "imslp",
          resource_type: "score",
          description: val.permlink ? `Permalink: ${val.permlink}` : "",
        });
      }
    }
    res.json(results.slice(0, 15));
  } catch (err) {
    res
      .status(502)
      .json({ error: "IMSLP search failed", details: err.message });
  }
});

// Wikipedia search proxy
router.get("/search/wikipedia", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "q required" });
  try {
    // Try summary first
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`;
    const summaryRes = await fetch(summaryUrl);
    if (summaryRes.ok) {
      const summary = await summaryRes.json();
      if (summary.title && summary.extract) {
        return res.json([
          {
            title: summary.title,
            url:
              summary.content_urls?.desktop?.page ||
              `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`,
            source: "wikipedia",
            resource_type: "article",
            description: summary.extract.slice(0, 200),
            thumbnail_url: summary.thumbnail?.source || null,
          },
        ]);
      }
    }
    // Fallback to opensearch
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=10&format=json`;
    const searchRes = await fetch(searchUrl);
    const [, titles, , urls] = await searchRes.json();
    const results = titles.map((t, i) => ({
      title: t,
      url: urls[i],
      source: "wikipedia",
      resource_type: "article",
      description: "",
    }));
    res.json(results);
  } catch (err) {
    res
      .status(502)
      .json({ error: "Wikipedia search failed", details: err.message });
  }
});

// YouTube search proxy
router.get("/search/youtube", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "q required" });
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=10&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      const results = (data.items || []).map((item) => ({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        source: "youtube",
        resource_type: "recording",
        description: item.snippet.channelTitle,
        thumbnail_url: item.snippet.thumbnails?.medium?.url || null,
      }));
      return res.json(results);
    } catch (err) {
      return res
        .status(502)
        .json({ error: "YouTube search failed", details: err.message });
    }
  }
  // No API key — return a constructed search URL
  res.json([
    {
      title: `Search YouTube for "${q}"`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      source: "youtube",
      resource_type: "recording",
      description: "Open YouTube search (no API key configured)",
    },
  ]);
});

// Auto-discover: run all searches in parallel
router.post("/auto-discover", async (req, res) => {
  const { title, composer } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const query = `${title} ${composer || ""}`.trim();
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const [imslp, wikipedia, youtube] = await Promise.all([
      fetch(`${base}/api/resources/search/imslp?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(
        `${base}/api/resources/search/wikipedia?q=${encodeURIComponent(query)}`,
      )
        .then((r) => r.json())
        .catch(() => []),
      fetch(
        `${base}/api/resources/search/youtube?q=${encodeURIComponent(query)}`,
      )
        .then((r) => r.json())
        .catch(() => []),
    ]);
    res.json({ imslp, wikipedia, youtube });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Auto-discover failed", details: err.message });
  }
});

export default router;
