export function getHPData(actor) {
  const hp = actor?.system?.attributes?.hp;
  if (!hp) return null;
  return {
    value: hp.value ?? 0,
    max: hp.max ?? 0,
    temp: hp.temp ?? 0,
    tempmax: hp.tempmax ?? 0,
    effectiveMax: (hp.max ?? 0) + (hp.tempmax ?? 0),
  };
}

export function getSaves(actor) {
  const abilities = CONFIG.DND5E.abilities;
  const prof = actor.system.attributes?.prof ?? 0;
  const out = [];
  for (const [id, data] of Object.entries(actor.system.abilities || {})) {
    const saveBonus = data.bonuses?.save ?? data.saveBonus ?? 0;
    const total = (data.mod ?? 0) + (data.proficient ? prof : 0) + saveBonus;
    out.push({
      id,
      label: abilities[id]?.abbreviation || id.toUpperCase(),
      total: total >= 0 ? `+${total}` : `${total}`,
      proficient: !!data.proficient,
    });
  }
  return out;
}

export function getSkills(actor) {
  const config = CONFIG.DND5E.skills;
  const prof = actor.system.attributes?.prof ?? 0;
  const out = [];
  for (const [id, data] of Object.entries(actor.system.skills || {})) {
    const c = config[id];
    const ablMod = actor.system.abilities?.[data.ability]?.mod ?? 0;
    const mult = data.value ?? 0;
    const total = ablMod + Math.floor(prof * mult) + (data.bonus ?? 0);
    out.push({
      id,
      label: c?.label || id,
      ability: c?.ability?.toUpperCase() || data.ability?.toUpperCase() || "",
      total: total >= 0 ? `+${total}` : `${total}`,
      proficient: mult >= 1,
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function getActionsByType(actor) {
  const actions = { action: [], bonus: [], reaction: [] };
  for (const item of actor.items) {
    const act = item.system?.activation?.type;
    if (act === "action") actions.action.push(toItemRef(item));
    else if (act === "bonus") actions.bonus.push(toItemRef(item));
    else if (act === "reaction") actions.reaction.push(toItemRef(item));
  }
  return actions;
}

export function getItemsByType(actor, types) {
  const out = [];
  for (const item of actor.items) {
    if (!types.includes(item.type)) continue;
    out.push(toItemRef(item));
  }
  return out;
}

function toItemRef(item) {
  return {
    id: item.id,
    name: item.name,
    img: item.img,
    type: item.type,
    qty: item.system?.quantity ?? 1,
  };
}

export function getInspiration(actor) {
  return actor.system?.attributes?.inspiration ?? false;
}

export function getCurrency(actor) {
  return actor.system?.currency || {};
}

export function getSpellDetails(item) {
  if (item.type !== "spell") return "";
  const sys = item.system;
  const activationLabel = sys.activation?.type ? (CONFIG.DND5E.activationTypes?.[sys.activation.type] || sys.activation.type) : "";
  const activationCost = sys.activation?.cost ?? "";
  const comps = sys.components || {};
  const compParts = [];
  const compStr = (comps.value || "").toLowerCase();
  if (compStr.includes("v")) compParts.push("V");
  if (compStr.includes("s")) compParts.push("S");
  if (compStr.includes("m")) {
    const details = comps.materialDetails || "";
    compParts.push("M" + (details ? ` (${details})` : ""));
  }
  const rows = [];
  if (activationLabel) {
    const actStr = activationCost ? `${activationCost} ${activationLabel}` : activationLabel;
    rows.push(`<div class="detail-row"><span class="detail-label">Activación</span><span class="detail-value">${actStr}</span></div>`);
  }
  if (compParts.length) {
    rows.push(`<div class="detail-row"><span class="detail-label">Componentes</span><span class="detail-value">${compParts.join("+")}</span></div>`);
  }
  if (comps.concentration) {
    rows.push(`<div class="detail-row"><span class="detail-label">Concentración</span><span class="detail-value">Sí</span></div>`);
  }
  const rangeStr = formatRange(sys.range);
  if (rangeStr) {
    rows.push(`<div class="detail-row"><span class="detail-label">Rango</span><span class="detail-value">${rangeStr}</span></div>`);
  }
  const targetStr = formatTarget(sys.target);
  if (targetStr) {
    rows.push(`<div class="detail-row"><span class="detail-label">Área/Objetivo</span><span class="detail-value">${targetStr}</span></div>`);
  }
  if (sys.save?.ability) {
    const abl = CONFIG.DND5E.abilities[sys.save.ability]?.label || sys.save.ability;
    const dc = sys.save.dc ?? "";
    rows.push(`<div class="detail-row"><span class="detail-label">Salvación</span><span class="detail-value">${abl}${dc ? ` CD ${dc}` : ""}</span></div>`);
  }
  return rows.join("");
}

function formatRange(range) {
  if (!range) return "";
  const labels = {
    touch: "Toque", self: "Personal", sight: "Visual",
    unlimited: "Ilimitado", planar: "Interplanar",
  };
  if (labels[range.units]) return labels[range.units];
  const units = range.units === "feet" ? "pies" : range.units === "mile" ? "millas" : range.units || "";
  const val = range.value ?? range.long ?? "";
  return val ? `${val} ${units}`.trim() : (units || "");
}

function formatTarget(target) {
  if (!target) return "";
  const areaTypes = {
    sphere: "Esfera", cylinder: "Cilindro", cone: "Cono", cube: "Cubo",
    line: "Línea", radius: "Radio", emanation: "Emanación",
    square: "Cuadrado", wall: "Muro", point: "Punto",
  };
  const type = target.type ? (areaTypes[target.type] || target.type) : "";
  const val = target.value || "";
  const units = target.units === "feet" ? "pies" : target.units === "mile" ? "millas" : target.units || "";
  const area = val && units ? `${val} ${units}` : "";
  const parts = [area, type].filter(Boolean);
  return parts.join(" de ") || "";
}

export function getSpellData(actor) {
  const spellsByLevel = {};
  for (const item of actor.items) {
    if (item.type !== "spell") continue;
    const level = item.system?.level ?? 0;
    if (!spellsByLevel[level]) spellsByLevel[level] = [];
    const actType = item.system?.activation?.type;
    spellsByLevel[level].push({
      id: item.id,
      name: item.name,
      img: item.img,
      level,
      activation: actType === "action" ? "A" : actType === "bonus" ? "BA" : actType === "reaction" ? "R" : "",
      prepared: item.system?.prepared ?? false,
      alwaysPrepared: item.system?.method === "always",
    });
  }
  const levels = Object.keys(spellsByLevel).sort((a, b) => a - b);
  const spellSlots = actor.system?.spells || {};
  return levels.map(l => {
    const level = parseInt(l);
    let slots = null;
    if (level > 0) {
      const slotKey = `spell${level}`;
      const slotData = spellSlots[slotKey];
      if (slotData) {
        slots = { value: slotData.value ?? 0, max: slotData.max ?? 0 };
      }
    }
    return { level, items: spellsByLevel[l], slots };
  });
}
