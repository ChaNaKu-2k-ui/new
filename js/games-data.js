/* One list drives the Games page and the game count on the home page.
   To add a game: add a line here, create games/<slug>.html and js/games/<slug>.js. */
window.GAMES = [
  { slug: "snake", icon: "<path d='M3 17h4v-4h4V9h4V5h6'/>", name: "Snake game", tag: "Arcade", desc: "Classic snake on a retro LCD screen. Steer with arrows, WASD or a swipe." },
  { slug: "memory-match", icon: "<rect x='5' y='3' width='14' height='18' rx='2.5'/><path d='M10 9a2 2 0 1 1 2.6 1.9c-.4.2-.6.6-.6 1V13'/><path d='M12 16.5h.01'/>", name: "Memory match", tag: "Puzzle", desc: "Flip the cards and find every pair in as few moves as you can." },
  { slug: "2048", icon: "<rect x='3' y='3' width='8' height='8' rx='2'/><rect x='13' y='3' width='8' height='8' rx='2'/><rect x='3' y='13' width='8' height='8' rx='2'/><rect x='13' y='13' width='8' height='8' rx='2'/>", name: "2048", tag: "Puzzle", desc: "Slide and merge number tiles until you reach 2048." },
  { slug: "tic-tac-toe", icon: "<path d='M9 3v18M15 3v18M3 9h18M3 15h18'/>", name: "Tic-tac-toe", tag: "Board", desc: "Play against the computer, on easy or hard." },
  { slug: "cricket", icon: "<path d='M3 21l9-9'/><path d='M12.2 6.2l3.6-3.6a1 1 0 0 1 1.4 0l4.2 4.2a1 1 0 0 1 0 1.4L18 11.4'/><path d='M6 15l-3 6 6-3'/>", name: "Tap cricket", tag: "Sports", desc: "Watch the ball and tap at the right moment to score sixes and fours." }
];
