# multi-engine-search-drop-claude — design

## Context

`freeSearchGaps` is hardwired to DDG's HTML endpoint; any failure returns null and `runExtraction` falls through to the Claude CLI (`deps.search`), which is being removed. `search_model` exists only for that fallback.

## Goals / Non-Goals

**Goals:**
- Zero paid/local dependencies for gap search; survive any single engine being throttled
- Sequential fallback (user option a): next engine only when the previous produced no fetchable sources

**Non-Goals:**
- No parallel multi-engine merge (option b): engines rank the same DoC/Reddit pages for these queries, so merging fetches duplicate pages and doubles tokens for no coverage gain
- No engine setting in the UI; no API-key search providers (Brave/Serper)

## Decisions

1. **Engine chain: DuckDuckGo → Bing → Mojeek**, all plain-HTML endpoints scrapeable with a UA header and one regex each: DDG (`uddg=` decode, current code), Bing (`<li class="b_algo">` anchor hrefs), Mojeek (result anchors). Declared as a `SEARCH_ENGINES` table `{name, searchUrl(q), extract(html)}` — adding an engine is one entry.
2. **Fallback unit = fetched sources, not URLs**: per engine — search, pick preferred URLs (DoC/Reddit first, cap 2), fetch pages; if ≥1 page fetched, stop and use them. Engines whose URLs all fail to fetch fall through. Engine name goes into the LLM sources header for provenance.
3. **Pipeline simplification**: `PipelineDeps` drops `search`; the remainder-Claude leg in `runExtraction` is deleted (free search result is final; nulls → manual entry). `search_used`/`search_skipped`/`churn_source_note` semantics unchanged.
4. **search_model removed everywhere**: `Settings`/`ProviderSettings`/defaults, db read/write, settings API schema, Settings UI card. Stale `search_model` rows in existing DBs are simply ignored (kv table, no migration needed).
5. **Docs**: READMEs drop the Claude Code requirement/troubleshooting/settings row; gap-search diagram becomes engine chain → LLM → manual.

## Risks / Trade-offs

- [All three engines throttle simultaneously] → same degrade as today: fields blank, notice shown, manual entry
- [Bing/Mojeek markup drift breaks a regex] → that engine yields no URLs and the chain moves on; single-engine breakage is invisible to users
- [Losing Claude's agentic search on obscure offers] → accepted by the user; DoC/Reddit cover the overwhelming majority of US bank bonuses
