import { Game } from './game.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';

const canvas = document.getElementById('game');
const input = new Input();
const game = new Game(input);
const renderer = new Renderer(canvas);

let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  game.update(dt);
  renderer.render(game);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
