export const MODULE_ID = "mobile-movement";

export const SETTINGS = {
  ENABLED_USERS: "mobileMode.enabledUsers",
  CENTER_BUTTON_ACTION: "mobileMode.centerButtonAction",
  LEVEL20_URLS: "mobileMode.level20Urls",
  SEAT_ORIENTATION: "mobileMode.seatOrientation",
};

export const TEMPLATES = {
  MOVEMENT: `modules/${MODULE_ID}/templates/mobile-movement.hbs`,
  HP_CONTROL: `modules/${MODULE_ID}/templates/hp-control.hbs`,
};

export const ROTATION_STEP = 45;
export const MOVE_BLOCK_EPSILON = 1e-10;
export const MOVEMENT_KEYS = ["up", "down", "left", "right", "up-left", "up-right", "down-left", "down-right"];
export const DIAGONAL_DIRECTIONS = ["up-left", "up-right", "down-left", "down-right"];

export const AREA_TYPES = {
  sphere: "Esfera", cylinder: "Cilindro", cone: "Cono", cube: "Cubo",
  line: "Línea", radius: "Radio", emanation: "Emanación",
  square: "Cuadrado", wall: "Muro", point: "Punto",
};

export const RANGE_LABELS = {
  touch: "Toque", self: "Personal", sight: "Visual",
  unlimited: "Ilimitado", planar: "Interplanar",
};
