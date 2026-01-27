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
export type DamageType = 'acid' | 'bludgeoning' | 'cold' | 'fire' | 'force' | 'lightning' | 'necrotic' | 'piercing' | 'poison' | 'psychic' | 'radiant' | 'slashing' | 'thunder';
export type Condition = 'blinded' | 'charmed' | 'deafened' | 'exhaustion' | 'frightened' | 'grappled' | 'incapacitated' | 'invisible' | 'paralyzed' | 'petrified' | 'poisoned' | 'prone' | 'restrained' | 'stunned' | 'unconscious';
export type CreatureType = 'aberration' | 'beast' | 'celestial' | 'construct' | 'dragon' | 'elemental' | 'fey' | 'fiend' | 'giant' | 'humanoid' | 'monstrosity' | 'ooze' | 'plant' | 'undead';
export type Skill = 'acrobatics' | 'animalHandling' | 'arcana' | 'athletics' | 'deception' | 'history' | 'insight' | 'intimidation' | 'investigation' | 'medicine' | 'nature' | 'perception' | 'performance' | 'persuasion' | 'religion' | 'sleightOfHand' | 'stealth' | 'survival';
export declare const ABILITY_NAMES: Record<AbilityKey, string>;
export declare const SKILL_ABILITIES: Record<Skill, AbilityKey>;
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
export interface Senses {
    blindsight?: number;
    darkvision?: number;
    tremorsense?: number;
    truesight?: number;
    passivePerception: number;
}
export interface SavingThrow {
    ability: AbilityKey;
    dc: number;
    onSuccess?: string;
    onFailure?: string;
}
export interface AreaOfEffect {
    shape: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere';
    size: number;
    origin?: string;
}
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
    range?: {
        normal: number;
        long?: number;
    };
    target?: string;
    damage: DamageInstance[];
    savingThrow?: SavingThrow;
}
export interface MultiattackAction extends BaseAction {
    actionType: 'multiattack';
    attacks: {
        name: string;
        count: number;
    }[];
}
export interface AbilityAction extends BaseAction {
    actionType: 'ability';
    savingThrow: SavingThrow;
    areaOfEffect?: AreaOfEffect;
    damage?: DamageInstance[];
    recharge?: {
        min: number;
        max: number;
    };
    usageLimit?: {
        uses: number;
        per: 'day' | 'rest' | 'encounter';
    };
}
export interface GenericAction extends BaseAction {
    actionType: 'generic';
}
export type Action = AttackAction | MultiattackAction | AbilityAction | GenericAction;
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
export interface SkillProficiency {
    skill: Skill;
    expertise?: boolean;
}
export interface HitPoints {
    current: number;
    max: number;
    temporary?: number;
}
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
    spellSlots: Record<number, {
        current: number;
        max: number;
    }>;
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
export declare function isCharacter(entity: Entity): entity is Character;
export declare function isMonster(entity: Entity): entity is Monster;
export declare function isAttackAction(action: Action): action is AttackAction;
export declare function isMultiattackAction(action: Action): action is MultiattackAction;
export declare function isAbilityAction(action: Action): action is AbilityAction;
export declare function isGenericAction(action: Action): action is GenericAction;
/**
 * Calculate the ability modifier from an ability score.
 */
export declare function calculateModifier(score: number): number;
/**
 * Calculate proficiency bonus from level (for characters) or CR (for monsters).
 */
export declare function calculateProficiencyBonus(levelOrCR: number): number;
/**
 * Calculate spell save DC for an entity.
 */
export declare function calculateSpellSaveDC(entity: Entity, ability: AbilityKey): number;
/**
 * Calculate spell attack bonus for an entity.
 */
export declare function calculateSpellAttackBonus(entity: Entity, ability: AbilityKey): number;
/**
 * Calculate saving throw modifier for an entity and ability.
 */
export declare function calculateSavingThrow(entity: Entity, ability: AbilityKey): number;
/**
 * Calculate skill modifier for an entity and skill.
 */
export declare function calculateSkillModifier(entity: Entity, skill: Skill): number;
/**
 * Calculate passive perception for an entity.
 */
export declare function calculatePassivePerception(entity: Entity): number;
/**
 * Calculate XP reward from challenge rating.
 */
export declare function calculateXPFromCR(cr: number): number;
/**
 * Calculate average damage from a dice expression.
 */
export declare function calculateAverageDamage(dice: DiceExpression): number;
/**
 * Parse a dice expression string (e.g., "2d6+3") into a DiceExpression object.
 */
export declare function parseDiceExpression(expr: string): DiceExpression | null;
export {};
