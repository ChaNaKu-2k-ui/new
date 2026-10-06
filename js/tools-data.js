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
  { slug: "word-counter", name: "Word counter", cat: "text", desc: "Count words, characters, sentences and reading time as you type." },
  { slug: "case-converter", name: "Case converter", cat: "text", desc: "Switch text between upper, lower, title, sentence, camel, snake and kebab case." },
  { slug: "password-generator", name: "Password generator", cat: "security", desc: "Make strong random passwords with a strength check. Nothing is stored." },
  { slug: "youtube-thumbnail", name: "YouTube thumbnail grabber", cat: "creator", desc: "Paste a video link and open its thumbnail in every available size." },
  { slug: "youtube-tags", name: "YouTube tag cleaner", cat: "creator", desc: "Clean up tags, remove duplicates and stay inside the 500 character limit." },
  { slug: "giveaway-picker", name: "Giveaway winner picker", cat: "creator", desc: "Paste entries and draw fair random winners." },
  { slug: "image-compressor", name: "Image compressor", cat: "image", desc: "Shrink JPG, PNG and WebP images on your device. Nothing is uploaded." },
  { slug: "json-formatter", name: "JSON formatter", cat: "developer", desc: "Format, minify and check JSON, with the error location when it is invalid." },
  { slug: "base64", name: "Base64 encoder", cat: "developer", desc: "Encode or decode text as Base64, with proper UTF-8 and URL-safe options." }
];
