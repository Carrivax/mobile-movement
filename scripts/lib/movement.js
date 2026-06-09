import { MOVE_BLOCK_EPSILON, DIAGONAL_DIRECTIONS } from "./constants.js";

export function snapToGrid(x, y) {
  const grid = game.scenes.active?.grid;
  if (!grid || grid.type === CONST.GRID_TYPES.GRIDLESS) return { x, y };
  const size = grid.size;
  const dx = grid.dx || 0;
  const dy = grid.dy || 0;
  return {
    x: Math.round((x - dx) / size) * size + dx,
    y: Math.round((y - dy) / size) * size + dy,
  };
}

export function getMovementDelta(direction, step) {
  switch (direction) {
    case "up": return { dx: 0, dy: -step };
    case "down": return { dx: 0, dy: step };
    case "left": return { dx: -step, dy: 0 };
    case "right": return { dx: step, dy: 0 };
    case "up-left": return { dx: -step, dy: -step };
    case "up-right": return { dx: step, dy: -step };
    case "down-left": return { dx: -step, dy: step };
    case "down-right": return { dx: step, dy: step };
    default: return { dx: 0, dy: 0 };
  }
}

export function isMoveBlocked(tokenDoc, toX, toY) {
  const scene = game.scenes.active;
  if (!scene?.grid) return false;

  const size = scene.grid.size;
  const halfW = (tokenDoc.width * size) / 2;
  const halfH = (tokenDoc.height * size) / 2;
  const fromX = tokenDoc.x + halfW;
  const fromY = tokenDoc.y + halfH;
  const toCenterX = toX + halfW;
  const toCenterY = toY + halfH;

  const walls = scene.walls?.contents ?? [];
  if (!walls.length) return false;

  const tokenElev = tokenDoc.elevation ?? 0;

  for (const wall of walls) {
    const data = wall._source ?? wall;
    if (Number(data.move ?? 1) < 1) continue;

    if (!_isWallAtElevation(wall, data, tokenElev, scene)) continue;

    const doorType = Number(data.door ?? 0);
    const doorState = Number(data.ds ?? 0);
    if (doorType > 0 && doorState === CONST.WALL_DOOR_STATES.OPEN) continue;

    const c = data.c ?? wall.c;
    if (!c?.length || c.length < 4) continue;
    if (segmentsIntersect(
      { x1: fromX, y1: fromY, x2: toCenterX, y2: toCenterY },
      { x1: c[0], y1: c[1], x2: c[2], y2: c[3] }
    )) return true;
  }
  return false;
}

function _isWallAtElevation(wall, data, tokenElev, scene) {
  // 1) Native v14 Scene Levels: wall.levels es un Set de Level IDs
  const sceneLevels = scene.levels?.contents ?? [];
  if (sceneLevels.length > 0) {
    const wallLevels = wall.levels;
    if (wallLevels?.size > 0) {
      const tokenLevel = sceneLevels.find(l =>
        tokenElev >= l.elevation.bottom && tokenElev <= l.elevation.top
      );
      if (tokenLevel) return wallLevels.has(tokenLevel.id);
      return false;
    }
  }

  // 2) Legacy: threshold.elevation
  const threshold = data.threshold ?? wall.threshold;
  if (threshold) {
    const elev = threshold.elevation;
    if (elev) {
      const min = elev.min;
      const max = elev.max;
      if (min !== undefined || max !== undefined) {
        return (tokenElev >= (min ?? -Infinity)) && (tokenElev <= (max ?? Infinity));
      }
    }
  }

  // 3) Levels module (bytheripper): wall.flags.levels.wallElevation
  const lvlFlags = data.flags?.levels ?? wall.flags?.levels;
  if (lvlFlags?.wallElevation) {
    const { min, max } = lvlFlags.wallElevation;
    return (tokenElev >= (min ?? -Infinity)) && (tokenElev <= (max ?? Infinity));
  }

  // 4) Sin datos de elevación → bloquea en todos los pisos (compatibilidad)
  return true;
}

function segmentsIntersect(a, b) {
  const d1x = a.x2 - a.x1;
  const d1y = a.y2 - a.y1;
  const d2x = b.x2 - b.x1;
  const d2y = b.y2 - b.y1;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < MOVE_BLOCK_EPSILON) return false;
  const t = ((b.x1 - a.x1) * d2y - (b.y1 - a.y1) * d2x) / cross;
  const u = ((b.x1 - a.x1) * d1y - (b.y1 - a.y1) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function isDiagonalDirection(direction) {
  return DIAGONAL_DIRECTIONS.includes(direction);
}

export function isDiagonalAllowed(scene) {
  return scene?.grid?.diagonal !== 0;
}

export function getMovementDistanceInUnits(direction, scene) {
  const grid = scene?.grid;
  if (!grid) return 0;
  const dist = grid.distance || 5;
  if (isDiagonalDirection(direction) && grid.diagonal === 1) return Math.round(dist * 1.5);
  return Math.round(dist);
}

const SEAT_TRANSFORMS = {
  0: {
    up: "up", down: "down", left: "left", right: "right",
    "up-left": "up-left", "up-right": "up-right",
    "down-left": "down-left", "down-right": "down-right",
  },
  90: {
    up: "left", down: "right", left: "down", right: "up",
    "up-left": "down-left", "up-right": "up-left",
    "down-right": "up-right", "down-left": "down-right",
  },
  180: {
    up: "down", down: "up", left: "right", right: "left",
    "up-left": "down-right", "up-right": "down-left",
    "down-left": "up-right", "down-right": "up-left",
  },
  270: {
    up: "right", down: "left", left: "up", right: "down",
    "up-left": "up-right", "up-right": "down-right",
    "down-right": "down-left", "down-left": "up-left",
  },
};

export function transformDirection(direction, seatAngle) {
  const map = SEAT_TRANSFORMS[seatAngle] || SEAT_TRANSFORMS[0];
  return map[direction] || direction;
}

export function gridDistanceBetween(pos1, pos2, scene) {
  const grid = scene?.grid;
  if (!grid) return 0;
  const size = grid.size || 100;
  const dist = grid.distance || 5;
  const dx = (pos2.x - pos1.x) / size;
  const dy = (pos2.y - pos1.y) / size;
  const cells = Math.sqrt(dx * dx + dy * dy);
  return Math.round(cells * dist);
}
