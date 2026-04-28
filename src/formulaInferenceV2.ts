import type { AbilityKey, AbilityScores, DiceExpression } from './types';
import { calculateModifier, calculateProficiencyBonus } from './types';
import type { AttackType, DiceFormula, Formula } from './actionDefinitionV2';

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function flat(value: number): Formula {
  return { type: 'flat', value };
}

function abilityModFormula(ability: AbilityKey): Formula {
  return { type: 'abilityMod', ability };
}

function pb(): Formula {
  return { type: 'proficiencyBonus' };
}

function sum(operands: Formula[]): Formula {
  const filtered = operands.filter(
    (o) => !(o.type === 'flat' && o.value === 0)
  );
  if (filtered.length === 0) return flat(0);
  if (filtered.length === 1) return filtered[0]!;
  return { type: 'sum', operands: filtered };
}

export interface AttackFormulaResult {
  toHitFormula: Formula;
  inferredAbility: AbilityKey;
  misc: number;
}

/**
 * Infer a to-hit formula from a resolved attack bonus.
 *
 * Uses monster ability scores + PB(from CR) to back-solve:
 *   attackBonus = PB + abilityMod + misc
 *
 * We choose the ability that minimizes |misc|, tie-breaking by attack type.
 */
export function inferAttackFormula(
  attackBonus: number,
  attackType: AttackType,
  abilityScores: AbilityScores,
  cr: number
): AttackFormulaResult {
  const PB = calculateProficiencyBonus(cr);

  const scored = ABILITY_KEYS.map((ability) => {
    const mod = calculateModifier(abilityScores[ability]);
    const misc = attackBonus - (PB + mod);
    return { ability, mod, misc, absMisc: Math.abs(misc) };
  }).sort((a, b) => {
    if (a.absMisc !== b.absMisc) return a.absMisc - b.absMisc;

    // Tie-break: prefer STR for melee, DEX for ranged.
    const pref: AbilityKey =
      attackType === 'ranged' ? 'dex' : attackType === 'melee' ? 'str' : 'dex';
    if (a.ability === pref && b.ability !== pref) return -1;
    if (b.ability === pref && a.ability !== pref) return 1;

    // Stable fallback
    return ABILITY_KEYS.indexOf(a.ability) - ABILITY_KEYS.indexOf(b.ability);
  });

  const best = scored[0]!;
  return {
    inferredAbility: best.ability,
    misc: best.misc,
    toHitFormula: sum([pb(), abilityModFormula(best.ability), flat(best.misc)]),
  };
}

export interface SaveDCFormulaResult {
  dcFormula: Formula;
  misc: number;
}

/**
 * Infer a save DC formula from a resolved save DC.
 *
 * Standard 5e: DC = 8 + PB + abilityMod(saveAbility) + misc
 */
export function inferSaveDCFormula(
  saveDC: number,
  saveAbility: AbilityKey,
  abilityScores: AbilityScores,
  cr: number
): SaveDCFormulaResult {
  const PB = calculateProficiencyBonus(cr);
  const mod = calculateModifier(abilityScores[saveAbility]);
  const misc = saveDC - (8 + PB + mod);

  return {
    misc,
    dcFormula: sum([flat(8), pb(), abilityModFormula(saveAbility), flat(misc)]),
  };
}

export interface SpellAttackBonusFormulaResult {
  attackBonusFormula: Formula;
  misc: number;
}

export function inferSpellAttackBonusFormula(
  attackBonus: number,
  spellcastingAbility: AbilityKey,
  abilityScores: AbilityScores,
  cr: number
): SpellAttackBonusFormulaResult {
  const PB = calculateProficiencyBonus(cr);
  const mod = calculateModifier(abilityScores[spellcastingAbility]);
  const misc = attackBonus - (PB + mod);
  return {
    misc,
    attackBonusFormula: sum([
      pb(),
      abilityModFormula(spellcastingAbility),
      flat(misc),
    ]),
  };
}

export interface SpellSaveDCFormulaResult {
  saveDcFormula: Formula;
  misc: number;
}

export function inferSpellSaveDCFormula(
  saveDC: number,
  spellcastingAbility: AbilityKey,
  abilityScores: AbilityScores,
  cr: number
): SpellSaveDCFormulaResult {
  const result = inferSaveDCFormula(saveDC, spellcastingAbility, abilityScores, cr);
  return { misc: result.misc, saveDcFormula: result.dcFormula };
}

export function inferDamageModifierFormula(
  modifier: number,
  attackAbility: AbilityKey | undefined,
  abilityScores: AbilityScores
): Formula | undefined {
  if (modifier === 0) return undefined;

  if (attackAbility) {
    const mod = calculateModifier(abilityScores[attackAbility]);
    if (mod === modifier) return abilityModFormula(attackAbility);
    const diff = modifier - mod;
    if (diff !== 0) return sum([abilityModFormula(attackAbility), flat(diff)]);
  }

  for (const ability of ABILITY_KEYS) {
    const mod = calculateModifier(abilityScores[ability]);
    if (mod === modifier) return abilityModFormula(ability);
  }

  return flat(modifier);
}

export function buildDiceFormula(
  dice: DiceExpression,
  attackAbility: AbilityKey | undefined,
  abilityScores: AbilityScores
): DiceFormula {
  const modFormula =
    dice.modifier !== 0
      ? inferDamageModifierFormula(dice.modifier, attackAbility, abilityScores)
      : undefined;

  return {
    count: dice.count,
    die: dice.die,
    modifier: modFormula,
  };
}

