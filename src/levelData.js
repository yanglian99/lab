import { TILE } from './constants.js';

const WIDTH = 160;
const HEIGHT = 13;

const createGrid = () => Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(TILE.EMPTY));

const setGround = (grid, startX, endX, groundY = HEIGHT - 1) => {
  for (let x = startX; x <= endX; x += 1) {
    for (let y = groundY; y < HEIGHT; y += 1) {
      grid[y][x] = TILE.GROUND;
    }
  }
};

const placePipe = (grid, x, topY, height, enterable = false, exit = null) => {
  grid[topY][x] = TILE.PIPE_TOP_LEFT;
  grid[topY][x + 1] = TILE.PIPE_TOP_RIGHT;
  for (let y = topY + 1; y < topY + height; y += 1) {
    grid[y][x] = TILE.PIPE_BODY_LEFT;
    grid[y][x + 1] = TILE.PIPE_BODY_RIGHT;
  }
  return { x, y: topY, width: 2, height, enterable, exit };
};

const placeStaircase = (grid, startX, stepCount) => {
  for (let step = 0; step < stepCount; step += 1) {
    for (let y = 0; y <= step; y += 1) {
      grid[HEIGHT - 1 - y][startX + step] = TILE.STAIR;
    }
  }
};

const overworld = createGrid();
setGround(overworld, 0, 21);
setGround(overworld, 24, 68);
setGround(overworld, 71, 120);
setGround(overworld, 122, 159);

overworld[8][12] = TILE.QUESTION;
overworld[8][13] = TILE.BRICK;
overworld[8][14] = TILE.BRICK;
overworld[8][15] = TILE.BRICK;
overworld[8][21] = TILE.QUESTION;
overworld[8][22] = TILE.BRICK;
overworld[8][23] = TILE.BRICK;
overworld[6][37] = TILE.BRICK;
overworld[6][38] = TILE.QUESTION;
overworld[6][39] = TILE.BRICK;
overworld[8][44] = TILE.BRICK;
overworld[8][45] = TILE.BRICK;
overworld[8][46] = TILE.QUESTION;
overworld[8][47] = TILE.BRICK;

const overworldPipes = [
  placePipe(overworld, 28, 9, 4, false),
  placePipe(overworld, 43, 8, 5, true, { area: 'bonus', x: 5, y: 10 }),
  placePipe(overworld, 63, 7, 6, false),
  placePipe(overworld, 96, 9, 4, false),
  placePipe(overworld, 132, 8, 5, false),
];

placeStaircase(overworld, 146, 7);
for (let y = 2; y < 12; y += 1) {
  overworld[y][154] = TILE.FLAGPOLE;
}
overworld[11][153] = TILE.FLAGPOLE;
overworld[11][156] = TILE.CASTLE;
overworld[10][156] = TILE.CASTLE;
overworld[11][157] = TILE.CASTLE;
overworld[10][157] = TILE.CASTLE;

const bonus = createGrid();
setGround(bonus, 0, 39);
for (let x = 4; x < 30; x += 2) {
  bonus[8][x] = TILE.BRICK;
  bonus[8][x + 1] = TILE.QUESTION;
}
const bonusPipes = [
  placePipe(bonus, 3, 9, 4, false),
  placePipe(bonus, 34, 8, 5, true, { area: 'overworld', x: 137, y: 10 }),
];

export const levelData = {
  overworld: {
    name: 'World 1-1',
    width: WIDTH,
    height: HEIGHT,
    background: 'overworld',
    tiles: overworld,
    pipes: overworldPipes,
    start: { x: 2, y: 10 },
    finishX: 154,
    gaps: [
      { start: 22, end: 23 },
      { start: 69, end: 70 },
      { start: 121, end: 121 },
    ],
    questionBlocks: [
      { x: 12, y: 8, contains: 'mushroom', used: false },
      { x: 21, y: 8, contains: 'coin', used: false },
      { x: 38, y: 6, contains: 'coin', used: false },
      { x: 46, y: 8, contains: 'coin', used: false },
    ],
    hiddenBlocks: [
      { x: 58, y: 8, contains: '1up', discovered: false, used: false },
    ],
    coins: [
      { x: 18, y: 7 },
      { x: 19, y: 7 },
      { x: 34, y: 8 },
      { x: 35, y: 8 },
      { x: 36, y: 8 },
      { x: 74, y: 8 },
      { x: 75, y: 8 },
      { x: 76, y: 8 },
      { x: 88, y: 7 },
      { x: 103, y: 8 },
      { x: 140, y: 8 },
    ],
    enemies: [
      { type: 'goomba', x: 16, y: 10 },
      { type: 'goomba', x: 31, y: 10 },
      { type: 'goomba', x: 54, y: 10 },
      { type: 'goomba', x: 72, y: 10 },
      { type: 'goomba', x: 104, y: 10 },
      { type: 'goomba', x: 142, y: 10 },
    ],
  },
  bonus: {
    name: 'Bonus Room',
    width: 40,
    height: HEIGHT,
    background: 'underground',
    tiles: bonus,
    pipes: bonusPipes,
    start: { x: 5, y: 10 },
    finishX: 36,
    gaps: [],
    questionBlocks: Array.from({ length: 13 }, (_, index) => ({
      x: 5 + index * 2,
      y: 8,
      contains: 'coin',
      used: false,
    })),
    hiddenBlocks: [],
    coins: [
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
      { x: 12, y: 5 },
      { x: 13, y: 5 },
      { x: 14, y: 5 },
      { x: 17, y: 5 },
      { x: 18, y: 5 },
      { x: 19, y: 5 },
      { x: 23, y: 5 },
      { x: 24, y: 5 },
      { x: 25, y: 5 },
      { x: 28, y: 5 },
      { x: 29, y: 5 },
      { x: 30, y: 5 },
    ],
    enemies: [],
  },
};
