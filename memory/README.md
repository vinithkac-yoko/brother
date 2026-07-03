# memory/

Per-client learning directory (Layer 6). **Not implemented in Phase 1.**

The intent (future phase): L1 = short-term, per-conversation learnings that
get promoted to L2 = durable, per-client memory after review, so the agent
gets better at this specific client's quirks (e.g. "this customer always
wants powder coat RAL 9005 unless stated otherwise") over time without
retraining.

Do not build retrieval, promotion, or write paths for this yet — Phase 1
context comes entirely from `get_record` / `search_records` calls against
the live database, not from this directory. When this phase starts, this
README should be replaced with the actual design.
