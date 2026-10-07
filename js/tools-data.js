/* One list drives the home page grid, search, and "more tools" links.
   To add a tool: add a line here, create tools/<slug>.html and js/tools/<slug>.js. */
window.CATEGORIES = {
  text: "Text",
  security: "Security",
  creator: "Creator",
  image: "Images",
  developer: "Developer"
};
window.TOOLS = [
  { slug: "word-counter", icon: "<path d='M4 7V4h16v3'/><path d='M9 20h6'/><path d='M12 4v16'/>", name: "Word counter", cat: "text", desc: "Count words, characters, sentences and reading time as you type." },
  { slug: "case-converter", icon: "<path d='M3 18l5-12 5 12'/><path d='M5 14h6'/><path d='M16 18v-5a2.5 2.5 0 0 1 5 0v5'/><path d='M16 15.5h5'/>", name: "Case converter", cat: "text", desc: "Switch text between upper, lower, title, sentence, camel, snake and kebab case." },
  { slug: "password-generator", icon: "<rect x='4' y='11' width='16' height='10' rx='2'/><path d='M8 11V7a4 4 0 0 1 8 0v4'/>", name: "Password generator", cat: "security", desc: "Make strong random passwords with a strength check. Nothing is stored." },
  { slug: "youtube-thumbnail", icon: "<rect x='3' y='4' width='18' height='16' rx='2'/><circle cx='9' cy='10' r='1.6'/><path d='M21 16l-5-5-9 9'/>", name: "YouTube thumbnail grabber", cat: "creator", desc: "Paste a video link and open its thumbnail in every available size." },
  { slug: "youtube-tags", icon: "<path d='M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z'/><circle cx='7' cy='7' r='1'/>", name: "YouTube tag cleaner", cat: "creator", desc: "Clean up tags, remove duplicates and stay inside the 500 character limit." },
  { slug: "giveaway-picker", icon: "<path d='M20 12v10H4V12'/><rect x='2' y='7' width='20' height='5'/><path d='M12 22V7'/><path d='M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z'/><path d='M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'/>", name: "Giveaway winner picker", cat: "creator", desc: "Paste entries and draw fair random winners." },
  { slug: "image-compressor", icon: "<path d='M8 3v3a2 2 0 0 1-2 2H3'/><path d='M21 8h-3a2 2 0 0 1-2-2V3'/><path d='M3 16h3a2 2 0 0 1 2 2v3'/><path d='M16 21v-3a2 2 0 0 1 2-2h3'/>", name: "Image compressor", cat: "image", desc: "Shrink JPG, PNG and WebP images on your device. Nothing is uploaded." },
  { slug: "json-formatter", icon: "<path d='M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1'/><path d='M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1'/>", name: "JSON formatter", cat: "developer", desc: "Format, minify and check JSON, with the error location when it is invalid." },
  { slug: "base64", icon: "<path d='M16 18l6-6-6-6'/><path d='M8 6l-6 6 6 6'/>", name: "Base64 encoder", cat: "developer", desc: "Encode or decode text as Base64, with proper UTF-8 and URL-safe options." }
];

/* Small icons used by the layout (feather-style, 24px, drawn with currentColor) */
window.UI_ICONS = {
  search: "<circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/>",
  moon: "<path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/>",
  sun: "<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>",
  shield: "<path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>",
  zap: "<path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/>",
  gift: "<path d='M20 12v10H4V12'/><rect x='2' y='7' width='20' height='5'/><path d='M12 22V7'/>",
  arrow: "<path d='M5 12h14'/><path d='M13 6l6 6-6 6'/>"
};
window.svg = function (inner, cls) {
  return "<svg class='" + (cls || "") + "' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>" + inner + "</svg>";
};
