// utils/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Every call to an external API lives here.
// Keeping them together makes it easy to debug, update, or swap services.
// ─────────────────────────────────────────────────────────────────────────────


// ══════════════════════════════════════════════════════════════════════════════
// GROQ — AI explanations
// ══════════════════════════════════════════════════════════════════════════════

// System prompt is now built by sidepanel.js based on language, reading level, and user context.

/**
 * Stream an explanation from Groq.
 *
 * Instead of waiting for the whole answer (which can take seconds), streaming
 * shows words appearing one by one — much more satisfying to watch.
 *
 * @param {string} text        — The developer text to explain
 * @param {string} apiKey      — User's Groq API key
 * @param {string} model       — Groq model ID
 * @param {Function} onChunk   — Called with each new piece of text as it arrives
 * @param {Function} onDone    — Called with the full text when complete
 * @param {Function} onError   — Called with an Error if something goes wrong
 */
async function explainWithGroq(text, apiKey, model, systemPrompt, userPrompt, onChunk, onDone, onError) {
  // systemPrompt and userPrompt are now passed in so callers can customise them
  // (reading level, language, "go deeper", "rephrase", full-page summary, etc.)
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
        stream: true,   // ← words trickle in rather than arriving all at once
      }),
    });

    if (!response.ok) {
      // Try to read the error message from Groq's response body
      let errMsg = `Groq API error (HTTP ${response.status})`;
      try {
        const errData = await response.json();
        errMsg = errData?.error?.message || errMsg;
      } catch (_) {}

      // Friendly messages for common errors
      if (response.status === 401) errMsg = 'Invalid Groq API key. Please check Settings.';
      if (response.status === 429) errMsg = 'Groq rate limit reached. Wait a moment and try again.';

      throw new Error(errMsg);
    }

    // Read the streamed response line by line
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Each chunk may contain multiple "data: {...}" lines
      const raw   = decoder.decode(value, { stream: true });
      const lines = raw.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;

        try {
          const json  = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onChunk(delta, fullText);
          }
        } catch (_) {
          // Ignore malformed chunks — they happen occasionally
        }
      }
    }

    onDone(fullText);

  } catch (err) {
    onError(err);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// YOUTUBE — search for tutorial videos
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Search YouTube for beginner-friendly videos on a term.
 *
 * Uses the YouTube Data API v3. Each call costs 100 quota units.
 * The free tier gives 10,000 units/day → 100 searches/day.
 *
 * @param {string} query    — The term to search for
 * @param {string} apiKey   — User's YouTube Data API v3 key
 * @returns {Promise<Array>} Array of video result objects
 */
async function searchYouTube(query, apiKey) {
  const safeQuery  = encodeURIComponent(`${query} explained simply`);
  const url = `https://www.googleapis.com/youtube/v3/search`
            + `?part=snippet`
            + `&q=${safeQuery}`
            + `&type=video`
            + `&maxResults=4`
            + `&videoDuration=medium`   // Skip very short clips and very long lectures
            + `&relevanceLanguage=en`
            + `&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `YouTube API error (${response.status})`;
    if (response.status === 403) throw new Error('YouTube API key invalid or quota exceeded.');
    throw new Error(msg);
  }

  const data = await response.json();
  return (data.items || []).map(item => ({
    videoId:     item.id.videoId,
    title:       item.snippet.title,
    channelName: item.snippet.channelTitle,
    thumbnail:   item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    publishedAt: item.snippet.publishedAt,
  }));
}


// ══════════════════════════════════════════════════════════════════════════════
// WEB SEARCH — SearXNG (private, user-hosted) or DuckDuckGo fallback
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Search the web. Uses SearXNG if the user has set an instance URL,
 * otherwise opens a DuckDuckGo tab (no API key needed).
 *
 * @param {string} query       — Search query
 * @param {string} searxngUrl  — User's SearXNG instance URL (may be empty)
 * @returns {Promise<Array|null>} Array of results, or null if opening a tab instead
 */
async function searchWeb(query, searxngUrl) {
  if (searxngUrl && searxngUrl.trim()) {
    try {
      return await searchSearXNG(query, searxngUrl.trim());
    } catch (err) {
      // SearXNG failed (likely CORS not enabled, wrong URL, or instance is down).
      // Fall through silently to the DuckDuckGo fallback below.
      console.warn('[BlankStare] SearXNG failed, falling back to DuckDuckGo:', err.message);
      return null;
    }
  }
  // No SearXNG configured — return null so the UI shows a DuckDuckGo link
  return null;
}

/**
 * Call a SearXNG instance's JSON API.
 *
 * IMPORTANT: Your SearXNG instance must have CORS enabled for extension requests.
 * In your SearXNG settings.yml, add:
 *   server:
 *     cors_cors_allowed_origins: "*"
 *
 * @param {string} query      — The search query
 * @param {string} baseUrl    — e.g. "https://search.yourdomain.com"
 * @returns {Promise<Array>}
 */
async function searchSearXNG(query, baseUrl) {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const url = `${cleanBase}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`SearXNG error (${response.status}). Check that your instance is running and CORS is enabled.`);
  }

  const data = await response.json();
  return (data.results || []).slice(0, 6).map(r => ({
    title:   r.title   || 'Untitled',
    url:     r.url,
    snippet: r.content || '',
    engine:  r.engine  || 'searxng',
  }));
}

/**
 * Build a DuckDuckGo search URL to open in a new tab (no API, no CORS issues).
 * @param {string} query
 * @returns {string} URL
 */
function duckDuckGoUrl(query) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(query + ' explained developer')}`;
}


// ══════════════════════════════════════════════════════════════════════════════
// RESOURCE LINKS — no API needed, just URL construction
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate links to popular dev-reference sites for a given search term.
 * These open in a new tab — no API calls, no rate limits, always free.
 *
 * @param {string} selectedText — The text the user selected
 * @returns {{ mdn: string, w3s: string, devdocs: string }}
 */
function buildResourceLinks(selectedText) {
  const q = encodeURIComponent(selectedText.trim());
  return {
    mdn:     `https://developer.mozilla.org/en-US/search?q=${q}`,
    w3s:     `https://www.w3schools.com/search/search_result.asp?search=${q}`,
    devdocs: `https://devdocs.io/#q=${q}`,
  };
}
