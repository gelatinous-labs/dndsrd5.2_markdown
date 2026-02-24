import type { AbilityKey, DamageType, DieType } from './types';

// =============================================================================
// Formula AST (aligned with initiative-vault shared/schemas/formula.ts)
// =============================================================================

export type Formula =
  | { type: 'flat'; value: number }
  | { type: 'abilityMod'; ability: AbilityKey }
  | { type: 'proficiencyBonus' }
  | { type: 'level' }
  | { type: 'sum'; operands: Formula[] }
  | { type: 'max'; operands: Formula[] };

export type FormulaOrNumber = number | Formula;

export interface DiceFormula {
  count: FormulaOrNumber;
  die: DieType;
  modifier?: Formula;
}

// =============================================================================
// ActionDefinition-ish model (v2 SRD extraction target)
// =============================================================================

export type ActivationType =
  | 'action'
  | 'bonusAction'
  | 'reaction'
  | 'magicAction'
  | 'free'
  | 'special'
  | 'passive'
  | 'triggered';

export type ActionDefinitionKind =
  | 'attack'
  | 'save'
  | 'multiattack'
  | 'spellcast'
  | 'generic';

export type ActionSection =
  | 'traits'
  | 'actions'
  | 'bonusActions'
  | 'reactions'
  | 'legendaryActions'
  | 'spells';

export type AttackType = 'melee' | 'ranged' | 'melee_or_ranged';

export type WeaponType = 'weapon' | 'spell';

export type UsagePer = 'day' | 'rest' | 'encounter';

export type EffectApplication =
  | 'onHit'
  | 'onFailSave'
  | 'onSucceedSave'
  | 'always';

export interface SourceTextBlock {
  sourceFile: string;
  startLine: number;
  endLine: number;
  /** Raw markdown text for this block (preserves line breaks). */
  markdown: string;
}

export interface UsageLimit {
  uses: number;
  per: UsagePer;
}

export interface RechargeInfo {
  min: number;
  max: number;
}

export interface AreaOfEffectV2 {
  shape: 'cone' | 'cube' | 'cylinder' | 'emanation' | 'line' | 'sphere';
  /** For lines: length; for others: size/radius. */
  size: number;
  /** For lines: width. */
  width?: number;
  origin?: string;
}

export interface ActionAttackDetailV2 {
  attackType: AttackType;
  weaponType?: WeaponType;
  /** Resolved bonus parsed from SRD text (e.g. +9). */
  attackBonus: number;
  /** Inferred formula: sum(pb, abilityMod(inferredAbility), flat(misc)). */
  toHitFormula: Formula;
  inferredAbility: AbilityKey;
  misc: number;
  reach?: number;
  range?: { normal: number; long?: number };
  target?: string;
}

export interface ActionSaveDetailV2 {
  saveAbility: AbilityKey;
  /** Resolved DC parsed from SRD text (e.g. 16). */
  saveDC: number;
  /** Inferred formula: sum(8, pb, abilityMod(saveAbility), flat(misc)). */
  dcFormula: Formula;
  misc: number;
  onSuccess?: string;
  onFailure?: string;
  areaOfEffect?: AreaOfEffectV2;
  target?: string;
}

export interface MultiattackItemV2 {
  name: string;
  count: number;
}

export interface ActionMultiattackDetailV2 {
  items: MultiattackItemV2[];
}

export interface ActionSpellcastDetailV2 {
  spellName: string;
  /**
   * Optional stable external key when we can map to spells.json.
   *
   * Format: "spell:<slug>" (e.g., "spell:acid-arrow").
   *
   * NOTE: This is intentionally *not* called "id" to avoid conflating
   * external compendium keys with DB primary keys.
   */
  spellKey?: string;
  /** Optional inferred spellcasting ability for this monster. */
  spellcastingAbility?: AbilityKey;
  /** Resolved spell save DC if present in SRD spellcasting block. */
  spellSaveDC?: number;
  /** Resolved spell attack bonus if present in SRD spellcasting block. */
  spellAttackBonus?: number;
  /** Inferred formula for spell save DC when spellSaveDC is present. */
  spellSaveDcFormula?: Formula;
  /** Inferred formula for spell attack bonus when spellAttackBonus is present. */
  spellAttackBonusFormula?: Formula;
  /** Misc deltas vs the standard (8 + PB + mod) / (PB + mod). */
  miscSpellSaveDC?: number;
  miscSpellAttackBonus?: number;
}

export interface ActionDamageComponentV2 {
  appliesOn: EffectApplication;
  damageType: DamageType;
  diceFormula: DiceFormula;
  riderText?: string;
}

export interface ActionHealingComponentV2 {
  appliesOn: EffectApplication;
  diceFormula: DiceFormula;
  riderText?: string;
}

export interface MonsterActionDefinitionV2 {
  // -- Grant-ish metadata --
  section: ActionSection;
  sortOrder: number;

  // -- Definition-ish fields --
  key: string;
  name: string;
  kind: ActionDefinitionKind;
  activation: ActivationType;
  rulesText: string;
  tags: string[];

  usageLimit?: UsageLimit;
  recharge?: RechargeInfo;

  /** Legendary action cost (if applicable). */
  legendaryCost?: number;

  // -- Kind-specific mechanics --
  attack?: ActionAttackDetailV2;
  save?: ActionSaveDetailV2;
  multiattack?: ActionMultiattackDetailV2;
  spellcast?: ActionSpellcastDetailV2;

  // -- Effects --
  damage?: ActionDamageComponentV2[];
  healing?: ActionHealingComponentV2[];

  // -- Full-fidelity backtrace --
  raw?: SourceTextBlock;
}

