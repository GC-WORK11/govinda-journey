# V6-WORLD (perf + loading) — status

Bridge decks merge to one mesh after the reveal (~18→~4 calls/bridge); lazy obstacle+diorama chunks preload three islands out on top of the sticky near-mount; island stride tightened 16→14 m (~14% less dead walking); sun shadow map 512; `__journey.v5.stats()` reports calls/tris/dpr/frame-ms for the release check. Commit 57cbd61 (plus finale far/dome + caption fixes in 7909873/0be8c14/cc45a8b, ?at pin in 7d02453).
