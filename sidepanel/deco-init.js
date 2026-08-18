// sidepanel/deco-init.js — BlankStare
//
// Manifest V3 forbids inline <script> blocks, so DecoNoir.init() has to be
// called from a file. That is the only reason this exists.

DecoNoir.init({
  // The panel is ~380px wide and full of streaming text. A moving ground
  // behind live output is noise, and it would run for as long as the panel
  // stays open — which is all day, by design.
  ground: 'off',
  grain:  false,

  // The key rims still light as the pointer approaches. This is the part of
  // the system that makes the controls read as machined rather than drawn,
  // and it costs nothing when the pointer is elsewhere.
  glow:   true,

  // Sparks on pointerdown are for a marketing surface, not a reading tool.
  spark:  false,

  // Nothing here scrolls into view as a revealed section; the panel is short
  // and its content arrives by streaming, not by scrolling.
  reveal: false,
});
