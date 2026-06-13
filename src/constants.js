export const TILE_SIZE = 48;
export const GRAVITY = 2400;
export const VIEWPORT_WIDTH = 960;
export const VIEWPORT_HEIGHT = 540;
export const LEVEL_TIME = 400;

export const TILE = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QUESTION: 3,
  USED: 4,
  PIPE_TOP_LEFT: 5,
  PIPE_TOP_RIGHT: 6,
  PIPE_BODY_LEFT: 7,
  PIPE_BODY_RIGHT: 8,
  FLAGPOLE: 9,
  CASTLE: 10,
  STAIR: 11,
  HIDDEN_1UP: 12,
};

export const COLORS = {
  sky: '#5c94fc',
  ground: '#c84c0c',
  dirt: '#8f3f00',
  brick: '#b45f06',
  question: '#f7c948',
  pipe: '#16a34a',
  pipeDark: '#15803d',
  flag: '#ffffff',
  castle: '#7c3f00',
  stair: '#a8550f',
  hidden: '#90cdf4',
  hud: '#ffffff',
};

export const PLAYER = {
  small: { width: 30, height: 42 },
  big: { width: 30, height: 78 },
  runAcceleration: 1800,
  airAcceleration: 900,
  maxRunSpeed: 320,
  friction: 1600,
  jumpVelocity: -820,
  maxFallSpeed: 1200,
};

export const ENEMY = {
  goomba: {
    width: 34,
    height: 34,
    speed: 85,
  },
};

export const ITEM = {
  mushroom: {
    width: 32,
    height: 32,
    speed: 90,
  },
};
