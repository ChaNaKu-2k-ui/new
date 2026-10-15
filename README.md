# ChaNaKu

Free browser tools for creators and gamers. Plain HTML, CSS and JavaScript, so there is no build step.
Cloudflare Pages: build command empty, output directory `/`.

## සරලව edit කරන හැටි

| කරන්න ඕන දේ | edit කරන file එක |
|---|---|
| Menu එකේ links / footer | `js/layout.js` |
| Colours සහ fonts | `css/site.css` (උඩම `:root` කොටස) |
| Home page එකේ tools list එක | `js/tools-data.js` |
| Social links | `socials.html` |
| Partner / referral links | `partners.html` |

## අලුත් tool එකක් add කරන හැටි

1. `js/tools-data.js` එකට අලුත් line එකක් දාන්න (`slug`, `name`, `cat`, `desc`).
2. `tools/word-counter.html` copy කරලා `tools/<slug>.html` කරන්න. Title, description, canonical link, ඇතුළේ තියෙන tool එකේ HTML සහ අන්තිමේ `<script src="../js/tools/<slug>.js">` වෙනස් කරන්න.
3. `js/tools/<slug>.js` ලියන්න. `CNK.copy`, `CNK.status`, `CNK.randInt` වගේ helpers `js/layout.js` එකේ තියෙනවා.
4. `sitemap.xml` එකට URL එක (`.html` නැතුව) add කරන්න.

## අලුත් game එකක් add කරන හැටි

1. `js/games-data.js` එකට අලුත් line එකක් දාන්න (`slug`, `name`, `tag`, `desc`, `icon`).
2. `games/snake.html` copy කරලා `games/<slug>.html` කරන්න. Title, canonical link, script path (`js/games/<slug>.js`) වෙනස් කරන්න.
3. `js/games/<slug>.js` ලියන්න.
4. `sitemap.xml` එකට URL එක add කරන්න.

## Cloudflare files

- `_headers`: security headers සහ caching. අලුත් external site එකකින් script/image load කරනවා නම් මෙතන CSP එකත් update කරන්න.
- `_redirects`: පරණ `/referrals` link එක `/partners` එකට යවනවා.
- `404.html`: Cloudflare Pages විසින් automatically පාවිච්චි කරනවා.
