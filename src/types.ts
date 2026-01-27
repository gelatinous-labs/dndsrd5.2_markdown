// =============================================================================
// D&D 5.2e Unified Entity Schema
// =============================================================================

// -----------------------------------------------------------------------------
// Foundational Types
// -----------------------------------------------------------------------------

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type AbilityScores = Record<AbilityKey, number>;

export interface Speed {
  walk?: number;
  fly?: number;
  swim?: number;
  burrow?: number;
  climb?: number;
  hover?: boolean;
}

export type Size = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';

export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';

export type Condition =
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious';

export type CreatureType =
  | 'aberration'
  | 'beast'
  | 'celestial'
  | 'construct'
  | 'dragon'
  | 'elemental'
  | 'fey'
  | 'fiend'
  | 'giant'
  | 'humanoid'
  | 'monstrosity'
  | 'ooze'
  | 'plant'
  | 'undead';

export type Skill =
  | 'acrobatics'
  | 'animalHandling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleightOfHand'
  | 'stealth'
  | 'survival';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const SKILL_ABILITIES: Record<Skill, AbilityKey> = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
};

// -----------------------------------------------------------------------------
// Dice & Damage Types
// -----------------------------------------------------------------------------

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface DiceExpression {
  count: number;
  die: DieType;
  modifier?: number;
}

export interface DamageInstance {
  dice: DiceExpression;
  type: DamageType;
  condition?: string;
}

// -----------------------------------------------------------------------------
// Senses
// -----------------------------------------------------------------------------

export interface Senses {
  blindsight?: number;
  darkvision?: number;
  tremorsense?: number;
  truesight?: number;
  passivePerception: number;
}

// -----------------------------------------------------------------------------
// Saving Throw
// -----------------------------------------------------------------------------

export interface SavingThrow {
  ability: AbilityKey;
  dc: number;
  onSuccess?: string;
  onFailure?: string;
}

// -----------------------------------------------------------------------------
// Area of Effect
// -----------------------------------------------------------------------------

export interface AreaOfEffect {
  shape: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere';
  size: number;
  origin?: string;
}

// -----------------------------------------------------------------------------
// Actions (Discriminated Union)
// -----------------------------------------------------------------------------

interface BaseAction {
  name: string;
  description?: string;
}

export interface AttackAction extends BaseAction {
  actionType: 'attack';
  attackType: 'melee' | 'ranged' | 'melee-or-ranged';
  weaponType?: 'weapon' | 'spell';
  attackBonus: number;
  reach?: number;
  range?: { normal: number; long?: number };
  target?: string;
  damage: DamageInstance[];
  savingThrow?: SavingThrow;
}

export interface MultiattackAction extends BaseAction {
  actionType: 'multiattack';
  attacks: { name: string; count: number }[];
}

export interface AbilityAction extends BaseAction {
  actionType: 'ability';
  savingThrow: SavingThrow;
  areaOfEffect?: AreaOfEffect;
  damage?: DamageInstance[];
  recharge?: { min: number; max: number };
  usageLimit?: { uses: number; per: 'day' | 'rest' | 'encounter' };
}

export interface GenericAction extends BaseAction {
  actionType: 'generic';
}

export type Action = AttackAction | MultiattackAction | AbilityAction | GenericAction;

// -----------------------------------------------------------------------------
// Traits, Reactions, Legendary Actions
// -----------------------------------------------------------------------------

export interface Trait {
  name: string;
  description: string;
}

export interface Reaction {
  name: string;
  description: string;
  trigger?: string;
}

export interface LegendaryAction {
  name: string;
  description: string;
  cost: number;
}

export interface LairAction {
  description: string;
  initiativeCount?: number;
}

export interface RegionalEffect {
  description: string;
  radius?: number;
}

// -----------------------------------------------------------------------------
// Skill Proficiency
// -----------------------------------------------------------------------------

export interface SkillProficiency {
  skill: Skill;
  expertise?: boolean;
}

// -----------------------------------------------------------------------------
// Hit Points
// -----------------------------------------------------------------------------

export interface HitPoints {
  current: number;
  max: number;
  temporary?: number;
}

// -----------------------------------------------------------------------------
// Entity Base Interface
// -----------------------------------------------------------------------------

export interface Entity {
  id: string;
  name: string;
  entityType: 'character' | 'monster';
  abilityScores: AbilityScores;
  hp: HitPoints;
  ac: number;
  speed: Speed;
  savingThrowProficiencies: AbilityKey[];
  skillProficiencies: SkillProficiency[];
  resistances?: DamageType[];
  immunities?: DamageType[];
  vulnerabilities?: DamageType[];
  conditionImmunities?: Condition[];
  senses: Senses;
  languages: string[];
  actions: Action[];
  bonusActions?: Action[];
  reactions?: Reaction[];
  traits?: Trait[];
}

// -----------------------------------------------------------------------------
// Character-Specific Types
// -----------------------------------------------------------------------------

export interface HitDice {
  die: DieType;
  current: number;
  max: number;
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

export interface ClassLevel {
  className: string;
  level: number;
  subclass?: string;
}

export interface CharacterSpellcasting {
  spellcastingAbility: AbilityKey;
  spellSlots: Record<number, { current: number; max: number }>;
  spellsKnown?: string[];
  spellsPrepared?: string[];
  cantripsKnown?: string[];
  ritualCasting?: boolean;
}

export interface Currency {
  cp?: number;
  sp?: number;
  ep?: number;
  gp?: number;
  pp?: number;
}

export interface Equipment {
  name: string;
  quantity: number;
  equipped?: boolean;
  attuned?: boolean;
  description?: string;
}

export interface Feat {
  name: string;
  description?: string;
  source?: string;
}

// -----------------------------------------------------------------------------
// Character Interface
// -----------------------------------------------------------------------------

export interface Character extends Entity {
  entityType: 'character';
  level: number;
  xp: number;
  class: string;
  subclass?: string;
  multiclass?: ClassLevel[];
  species: string;
  background: string;
  alignment?: string;
  hitDice: HitDice[];
  deathSaves: DeathSaves;
  spellcasting?: CharacterSpellcasting;
  feats?: Feat[];
  equipment?: Equipment[];
  currency?: Currency;
  toolProficiencies?: string[];
  weaponProficiencies?: string[];
  armorProficiencies?: string[];
}

// -----------------------------------------------------------------------------
// Monster-Specific Types
// -----------------------------------------------------------------------------

export interface MonsterSpellcasting {
  spellcastingAbility: AbilityKey;
  spellSaveDC?: number;
  spellAttackBonus?: number;
  atWill?: string[];
  perDay?: Record<number, string[]>;
  innate?: boolean;
}

export interface MonsterHitDice {
  count: number;
  die: DieType;
}

// -----------------------------------------------------------------------------
// Monster Interface
// -----------------------------------------------------------------------------

export interface Monster extends Entity {
  entityType: 'monster';
  size: Size;
  creatureType: CreatureType;
  tags?: string[];
  alignment: string;
  cr: number;
  xp?: number;
  xpInLair?: number;
  hitDice?: MonsterHitDice;
  spellcasting?: MonsterSpellcasting;
  legendaryActionCount?: number;
  legendaryActions?: LegendaryAction[];
  legendaryResistance?: number;
  lairActions?: LairAction[];
  regionalEffects?: RegionalEffect[];
  source?: string;
}

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

export function isCharacter(entity: Entity): entity is Character {
  return entity.entityType === 'character';
}

export function isMonster(entity: Entity): entity is Monster {
  return entity.entityType === 'monster';
}

export function isAttackAction(action: Action): action is AttackAction {
  return action.actionType === 'attack';
}

export function isMultiattackAction(action: Action): action is MultiattackAction {
  return action.actionType === 'multiattack';
}

export function isAbilityAction(action: Action): action is AbilityAction {
  return action.actionType === 'ability';
}

export function isGenericAction(action: Action): action is GenericAction {
  return action.actionType === 'generic';
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Calculate the ability modifier from an ability score.
 */
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate proficiency bonus from level (for characters) or CR (for monsters).
 */
export function calculateProficiencyBonus(levelOrCR: number): number {
  if (levelOrCR < 1) return 2;
  return Math.floor((levelOrCR - 1) / 4) + 2;
}

/**
 * Calculate spell save DC for an entity.
 */
export function calculateSpellSaveDC(entity: Entity, ability: AbilityKey): number {
  const levelOrCR = isCharacter(entity) ? entity.level : (entity as Monster).cr;
  const profBonus = calculateProficiencyBonus(levelOrCR);
  const abilityMod = calculateModifier(entity.abilityScores[ability]);
  return 8 + profBonus + abilityMod;
}

/**
 * Calculate spell attack bonus for an entity.
 */
export function calculateSpellAttackBonus(entity: Entity, ability: AbilityKey): number {
  const levelOrCR = isCharacter(entity) ? entity.level : (entity as Monster).cr;
  const profBonus = calculateProficiencyBonus(levelOrCR);
  const abilityMod = calculateModifier(entity.abilityScores[ability]);
  return profBonus + abilityMod;
}

/**
 * Calculate saving throw modifier for an entity and ability.
 */
export function calculateSavingThrow(entity: Entity, ability: AbilityKey): number {
  const abilityMod = calculateModifier(entity.abilityScores[ability]);
  const isProficient = entity.savingThrowProficiencies.includes(ability);

  if (!isProficient) {
    return abilityMod;
  }

  const levelOrCR = isCharacter(entity) ? entity.level : (entity as Monster).cr;
  const profBonus = calculateProficiencyBonus(levelOrCR);
  return abilityMod + profBonus;
}

/**
 * Calculate skill modifier for an entity and skill.
 */
export function calculateSkillModifier(entity: Entity, skill: Skill): number {
  const ability = SKILL_ABILITIES[skill];
  const abilityMod = calculateModifier(entity.abilityScores[ability]);

  const proficiency = entity.skillProficiencies.find((p) => p.skill === skill);
  if (!proficiency) {
    return abilityMod;
  }

  const levelOrCR = isCharacter(entity) ? entity.level : (entity as Monster).cr;
  const profBonus = calculateProficiencyBonus(levelOrCR);

  if (proficiency.expertise) {
    return abilityMod + profBonus * 2;
  }

  return abilityMod + profBonus;
}

/**
 * Calculate passive perception for an entity.
 */
export function calculatePassivePerception(entity: Entity): number {
  return 10 + calculateSkillModifier(entity, 'perception');
}

/**
 * Calculate XP reward from challenge rating.
 */
export function calculateXPFromCR(cr: number): number {
  const xpByCR: Record<number, number> = {
    0: 10,
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000,
  };

  return xpByCR[cr] ?? 0;
}

/**
 * Calculate average damage from a dice expression.
 */
export function calculateAverageDamage(dice: DiceExpression): number {
  const dieAverages: Record<DieType, number> = {
    d4: 2.5,
    d6: 3.5,
    d8: 4.5,
    d10: 5.5,
    d12: 6.5,
    d20: 10.5,
    d100: 50.5,
  };

  const average = dice.count * dieAverages[dice.die] + (dice.modifier ?? 0);
  return Math.floor(average);
}

/**
 * Parse a dice expression string (e.g., "2d6+3") into a DiceExpression object.
 */
export function parseDiceExpression(expr: string): DiceExpression | null {
  const regex = /^(\d+)d(\d+)([+-]\d+)?$/i;
  const match = expr.replace(/\s/g, '').match(regex);

  if (!match) {
    return null;
  }

  const count = parseInt(match[1], 10);
  const dieValue = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : undefined;

  const validDice = [4, 6, 8, 10, 12, 20, 100];
  if (!validDice.includes(dieValue)) {
    return null;
  }

  const die = `d${dieValue}` as DieType;

  return {
    count,
    die,
    modifier,
  };
}
