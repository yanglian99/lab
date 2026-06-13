const SIZE = 8;
const TERRAIN = ["grass", "grass", "grass", "forest", "forest", "mountain", "water"];
const boardEl = document.getElementById("board");
const turnInfoEl = document.getElementById("turnInfo");
const tileInfoEl = document.getElementById("tileInfo");
const logEl = document.getElementById("log");
const endTurnBtn = document.getElementById("endTurnBtn");
const moveBtn = document.getElementById("moveBtn");
const settleBtn = document.getElementById("settleBtn");
const harvestBtn = document.getElementById("harvestBtn");

const state = {
  turn: 1,
  currentPlayer: "player",
  selected: null,
  stars: { player: 6, enemy: 6 },
  score: { player: 0, enemy: 0 },
  board: [],
  log: [],
};

function rand(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function createBoard() {
  const grid = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const terrain = rand(TERRAIN);
      grid.push({
        x,
        y,
        terrain,
        visible: false,
        village: Math.random() > 0.9,
        resource: terrain === "forest" ? "wood" : terrain === "grass" && Math.random() > 0.55 ? "crop" : null,
        cityOwner: null,
        cityLevel: 0,
        unit: null,
      });
    }
  }
  const playerStart = getTile(grid, 1, 1);
  const enemyStart = getTile(grid, SIZE - 2, SIZE - 2);
  playerStart.cityOwner = "player";
  playerStart.cityLevel = 1;
  playerStart.village = false;
  playerStart.unit = createUnit("player");
  enemyStart.cityOwner = "enemy";
  enemyStart.cityLevel = 1;
  enemyStart.village = false;
  enemyStart.unit = createUnit("enemy");
  revealAround(grid, playerStart.x, playerStart.y, 2);
  revealAround(grid, enemyStart.x, enemyStart.y, 1, true);
  state.score.player += 5;
  state.score.enemy += 5;
  return grid;
}

function createUnit(owner) {
  return { owner, hp: 10, moves: 1, attack: owner === "player" ? 4 : 3 };
}

function getTile(grid, x, y) {
  return grid.find((tile) => tile.x === x && tile.y === y);
}

function neighbors(x, y) {
  return [
    [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x + 1, y - 1], [x - 1, y + 1],
  ].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE);
}

function revealAround(grid, x, y, radius, enemyVision = false) {
  grid.forEach((tile) => {
    const distance = Math.abs(tile.x - x) + Math.abs(tile.y - y);
    if (distance <= radius && !enemyVision) tile.visible = true;
  });
}

function pushLog(message) {
  state.log.unshift(`Turn ${state.turn}: ${message}`);
  state.log = state.log.slice(0, 12);
}

function reachableTiles(fromTile) {
  if (!fromTile?.unit || fromTile.unit.owner !== state.currentPlayer || fromTile.unit.moves < 1) return [];
  return neighbors(fromTile.x, fromTile.y)
    .map(([x, y]) => getTile(state.board, x, y))
    .filter((tile) => tile.terrain !== "water");
}

function scoreIncome(owner) {
  return state.board.reduce((sum, tile) => sum + (tile.cityOwner === owner ? tile.cityLevel + 1 : 0), 0);
}

function render() {
  boardEl.innerHTML = "";
  const selectedTile = state.selected ? getTile(state.board, state.selected.x, state.selected.y) : null;
  const reachables = reachableTiles(selectedTile);

  state.board.forEach((tile) => {
    const div = document.createElement("button");
    div.className = ["hex", tile.visible ? tile.terrain : "hidden"].join(" ");
    if (selectedTile === tile) div.classList.add("selected");
    if (reachables.includes(tile)) div.classList.add(tile.unit?.owner === "enemy" ? "enemy-target" : "reachable");
    div.innerHTML = `
      <span class="coords">${tile.x},${tile.y}</span>
      <span class="occupants">
        ${tile.cityOwner ? `<span class="city-chip">${tile.cityLevel}</span>` : tile.village && tile.visible ? '<span class="city-chip">V</span>' : ""}
        ${tile.unit && tile.visible ? `<span class="unit-chip ${tile.unit.owner}">${tile.unit.hp}</span>` : ""}
      </span>
      <span class="yield">${tile.visible ? tile.resource ?? "" : "Fog"}</span>`;
    div.addEventListener("click", () => {
      state.selected = { x: tile.x, y: tile.y };
      render();
    });
    boardEl.appendChild(div);
  });

  turnInfoEl.innerHTML = [
    ["Turn", state.turn],
    ["Active", state.currentPlayer === "player" ? "You" : "Rival"],
    ["Stars", state.stars.player],
    ["Score", `${state.score.player} / ${state.score.enemy}`],
  ].map(([label, value]) => `<div class="stat"><label>${label}</label><strong>${value}</strong></div>`).join("");

  if (!selectedTile) {
    tileInfoEl.innerHTML = "Select a tile to inspect it.";
  } else {
    tileInfoEl.innerHTML = `
      <strong>${selectedTile.visible ? selectedTile.terrain : "Unknown"} tile</strong><br />
      Position: ${selectedTile.x}, ${selectedTile.y}<br />
      ${selectedTile.cityOwner ? `City owner: ${selectedTile.cityOwner}<br />Level: ${selectedTile.cityLevel}<br />` : ""}
      ${selectedTile.village && selectedTile.visible ? "Contains a neutral village.<br />" : ""}
      ${selectedTile.resource && selectedTile.visible ? `Resource: ${selectedTile.resource}<br />` : ""}
      ${selectedTile.unit && selectedTile.visible ? `Unit: ${selectedTile.unit.owner} (${selectedTile.unit.hp} hp, ${selectedTile.unit.moves} move)<br />` : ""}
    `;
  }

  logEl.innerHTML = state.log.map((item) => `<li>${item}</li>`).join("");

  const isPlayersTurn = state.currentPlayer === "player";
  moveBtn.disabled = !isPlayersTurn || !selectedTile?.unit || selectedTile.unit.owner !== "player";
  settleBtn.disabled = !isPlayersTurn || !selectedTile?.unit || !selectedTile.village || state.stars.player < 5;
  harvestBtn.disabled = !isPlayersTurn || !selectedTile?.cityOwner || selectedTile.cityOwner !== "player" || !selectedTile.resource || state.stars.player < 3;
}

function combat(attackerTile, defenderTile) {
  defenderTile.unit.hp -= attackerTile.unit.attack;
  pushLog(`${attackerTile.unit.owner} attacked at ${defenderTile.x},${defenderTile.y}.`);
  if (defenderTile.unit.hp <= 0) {
    pushLog(`${defenderTile.unit.owner} unit was defeated.`);
    defenderTile.unit = null;
    attackerTile.unit.moves = 0;
    defenderTile.unit = attackerTile.unit;
    attackerTile.unit = null;
    if (defenderTile.cityOwner && defenderTile.cityOwner !== state.currentPlayer) {
      defenderTile.cityOwner = state.currentPlayer;
      state.score[state.currentPlayer] += 4;
      pushLog(`${state.currentPlayer} captured a city!`);
    }
  } else {
    attackerTile.unit.hp -= 2;
    attackerTile.unit.moves = 0;
    if (attackerTile.unit.hp <= 0) attackerTile.unit = null;
  }
}

function moveSelectedUnit() {
  const tile = getTile(state.board, state.selected.x, state.selected.y);
  if (!tile?.unit || tile.unit.owner !== "player") return;
  const targets = reachableTiles(tile).filter((candidate) => !candidate.unit || candidate.unit.owner !== "player");
  if (!targets.length) {
    pushLog("No reachable tiles for that unit.");
    render();
    return;
  }
  const target = targets.sort((a, b) => {
    const aScore = (a.village ? 4 : 0) + (a.resource ? 2 : 0) + (a.unit?.owner === "enemy" ? 5 : 0);
    const bScore = (b.village ? 4 : 0) + (b.resource ? 2 : 0) + (b.unit?.owner === "enemy" ? 5 : 0);
    return bScore - aScore;
  })[0];

  if (target.unit?.owner === "enemy") {
    combat(tile, target);
  } else {
    target.unit = tile.unit;
    tile.unit = null;
    target.unit.moves = 0;
    revealAround(state.board, target.x, target.y, 2);
    pushLog(`Scout moved to ${target.x},${target.y}.`);
  }
  render();
}

function settleCity() {
  const tile = getTile(state.board, state.selected.x, state.selected.y);
  if (!tile?.unit || !tile.village || state.stars.player < 5) return;
  tile.village = false;
  tile.cityOwner = "player";
  tile.cityLevel = 1;
  state.stars.player -= 5;
  state.score.player += 5;
  pushLog(`A new city was founded at ${tile.x},${tile.y}.`);
  render();
}

function harvestResource() {
  const tile = getTile(state.board, state.selected.x, state.selected.y);
  if (!tile?.cityOwner || tile.cityOwner !== "player" || !tile.resource || state.stars.player < 3) return;
  state.stars.player -= 3;
  tile.cityLevel += 1;
  state.score.player += 3;
  pushLog(`Harvested ${tile.resource}; city level increased to ${tile.cityLevel}.`);
  tile.resource = null;
  render();
}

function enemyTurn() {
  const enemyUnits = state.board.filter((tile) => tile.unit?.owner === "enemy");
  enemyUnits.forEach((tile) => {
    tile.unit.moves = 1;
    const options = reachableTiles(tile).filter((candidate) => !candidate.unit || candidate.unit.owner !== "enemy");
    if (!options.length) return;
    const attackTarget = options.find((candidate) => candidate.unit?.owner === "player");
    const cityTarget = options.find((candidate) => candidate.cityOwner === "player");
    const target = attackTarget || cityTarget || options[Math.floor(Math.random() * options.length)];
    if (target.unit?.owner === "player") combat(tile, target);
    else {
      target.unit = tile.unit;
      tile.unit = null;
      target.unit.moves = 0;
    }
  });

  const enemyCities = state.board.filter((tile) => tile.cityOwner === "enemy");
  if (state.stars.enemy >= 5) {
    const village = state.board.find((tile) => tile.village && !tile.unit && neighbors(tile.x, tile.y).some(([x, y]) => getTile(state.board, x, y).cityOwner === "enemy"));
    if (village) {
      village.village = false;
      village.cityOwner = "enemy";
      village.cityLevel = 1;
      state.stars.enemy -= 5;
      state.score.enemy += 5;
      pushLog("The rival tribe founded a new city.");
    }
  }
  enemyCities.forEach((city) => {
    if (!city.unit && state.stars.enemy >= 2) {
      city.unit = createUnit("enemy");
      state.stars.enemy -= 2;
      pushLog(`The rival trained a defender at ${city.x},${city.y}.`);
    }
  });
}

function endTurn() {
  state.board.forEach((tile) => {
    if (tile.unit?.owner === "player") tile.unit.moves = 1;
  });
  state.stars.player += scoreIncome("player");
  state.stars.enemy += scoreIncome("enemy");
  state.currentPlayer = "enemy";
  pushLog(`You earned ${scoreIncome("player")} stars.`);
  enemyTurn();
  state.currentPlayer = "player";
  state.turn += 1;
  if (state.score.player >= 40 || state.score.enemy >= 40) {
    pushLog(state.score.player >= 40 ? "Victory! Your tribe dominates the square world." : "Defeat. The rival tribe outpaced you.");
    endTurnBtn.disabled = true;
    moveBtn.disabled = true;
    settleBtn.disabled = true;
    harvestBtn.disabled = true;
  }
  render();
}

endTurnBtn.addEventListener("click", endTurn);
moveBtn.addEventListener("click", moveSelectedUnit);
settleBtn.addEventListener("click", settleCity);
harvestBtn.addEventListener("click", harvestResource);

state.board = createBoard();
pushLog("Your tribe begins with a capital and a single scout.");
pushLog("Capture villages, upgrade cities, and hold off the rival tribe.");
render();
