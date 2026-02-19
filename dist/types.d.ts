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
    /** Modifier to add to the roll (0 = no modifier) */
    modifier: number;
}
export interface DamageInstance {
    id: string;
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
    shape: 'cone' | 'cube' | 'cylinder' | 'emanation' | 'line' | 'sphere';
    size: number;
    /** For lines: the width (size is the length) */
    width?: number;
    origin?: string;
}
export type SpellSchool = 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';
export type SpellClass = 'bard' | 'cleric' | 'druid' | 'paladin' | 'ranger' | 'sorcerer' | 'warlock' | 'wizard';
export declare const SPELL_SCHOOL_NAMES: Record<SpellSchool, string>;
/** Casting time for a spell */
export interface CastingTime {
    type: 'action' | 'bonusAction' | 'reaction' | 'time';
    /** For 'time' type: duration in minutes */
    minutes?: number;
    /** Whether the spell can be cast as a ritual (adds 10 minutes) */
    ritual?: boolean;
    /** For reactions and some bonus actions: what triggers the casting */
    trigger?: string;
}
/** Range of a spell */
export type SpellRange = {
    type: 'self';
} | {
    type: 'touch';
} | {
    type: 'distance';
    feet: number;
} | {
    type: 'sight';
} | {
    type: 'unlimited';
};
/** Material component details */
export interface MaterialComponent {
    description: string;
    /** Gold piece cost if specified */
    cost?: number;
    /** Whether the component is consumed */
    consumed?: boolean;
}
/** Spell components */
export interface SpellComponents {
    verbal: boolean;
    somatic: boolean;
    material?: MaterialComponent;
}
/** Duration of a spell */
export type SpellDuration = {
    type: 'instantaneous';
} | {
    type: 'concentration';
    maxDuration: string;
} | {
    type: 'time';
    duration: string;
} | {
    type: 'untilDispelled';
    concentration?: boolean;
} | {
    type: 'special';
    description: string;
};
/** Scaling when cast at higher levels */
export interface SpellScaling {
    /** Description of how the spell scales */
    description: string;
    /** For damage spells: additional dice per level above base */
    damagePerLevel?: DiceExpression;
    /** For target spells: additional targets per level above base */
    targetsPerLevel?: number;
    /** For duration spells: additional duration per level */
    durationPerLevel?: string;
}
/** Cantrip upgrade info */
export interface CantripScaling {
    description: string;
    /** Levels at which the cantrip improves (typically 5, 11, 17) */
    levels: number[];
}
/** Full spell definition - analogous to Action for entities */
export interface Spell {
    id: string;
    name: string;
    /** 0 for cantrips, 1-9 for leveled spells */
    level: number;
    school: SpellSchool;
    /** Classes that have this spell on their list */
    classes: SpellClass[];
    castingTime: CastingTime;
    range: SpellRange;
    components: SpellComponents;
    duration: SpellDuration;
    /** Full description text */
    description: string;
    /** For spells with attack rolls */
    attackType?: 'melee' | 'ranged';
    /** For spells requiring a saving throw */
    savingThrow?: {
        ability: AbilityKey;
        /** Description of success/failure effects (DC is caster's spell save DC) */
        onSuccess?: string;
        onFailure?: string;
    };
    /** Damage dealt by the spell */
    damage?: DamageInstance[];
    /** Healing provided by the spell */
    healing?: DiceExpression;
    /** Area of effect if applicable */
    areaOfEffect?: AreaOfEffect;
    /** Scaling when cast with higher-level slots (level 1+ spells) */
    higherLevelScaling?: SpellScaling;
    /** Scaling at character levels (cantrips only) */
    cantripScaling?: CantripScaling;
    /** Source book reference */
    source?: string;
}
export declare function isCantrip(spell: Spell): boolean;
interface BaseAction {
    id: string;
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
/** An item in a multiattack listing which attack and how many times */
export interface MultiattackItem {
    id: string;
    name: string;
    count: number;
}
export interface MultiattackAction extends BaseAction {
    actionType: 'multiattack';
    attacks: MultiattackItem[];
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
    id: string;
    name: string;
    description: string;
}
export interface Reaction {
    id: string;
    name: string;
    description: string;
    trigger?: string;
}
export interface LegendaryAction {
    id: string;
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
    id: string;
    skill: Skill;
    expertise?: boolean;
}
export type SourceType = 'character' | 'monster';
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
/** Item in a character's inventory (not the full item definition) */
export interface CharacterItem {
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
    equipment?: CharacterItem[];
    currency?: Currency;
    toolProficiencies?: string[];
    weaponProficiencies?: string[];
    armorProficiencies?: string[];
    /** URL to character portrait image */
    portrait?: string;
    /** Long-form notes */
    notes?: string;
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
    /** Monster description/lore */
    description?: string;
    /** URL to monster image */
    portrait?: string;
    /** DM notes */
    notes?: string;
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
export type ClassName = 'barbarian' | 'bard' | 'cleric' | 'druid' | 'fighter' | 'monk' | 'paladin' | 'ranger' | 'rogue' | 'sorcerer' | 'warlock' | 'wizard';
export declare const CLASS_NAMES: Record<ClassName, string>;
export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shields';
export type WeaponCategory = 'simple' | 'martial';
export interface WeaponProficiency {
    category?: WeaponCategory;
    /** Specific restrictions like "Finesse", "Light", "Melee" */
    restriction?: string;
    /** Specific weapons by name */
    specific?: string[];
}
export type SpellcastingType = 'full' | 'half' | 'pact' | 'none';
export interface ClassSpellcasting {
    type: SpellcastingType;
    ability: AbilityKey;
    /** Level at which spellcasting is gained (1 for full casters, 1-2 for half casters) */
    startLevel: number;
    /** Whether the class can cast rituals */
    ritualCasting?: boolean;
    /** Type of spellcasting focus */
    focusType?: 'arcane' | 'druidic' | 'holy';
    /** Whether the class uses a spellbook (Wizard) */
    usesSpellbook?: boolean;
    /** For Warlock: spell slots recover on short rest */
    recoversOnShortRest?: boolean;
}
export interface ClassResource {
    name: string;
    /** How many at each level (index 0 = level 1) */
    countByLevel: (number | null)[];
    /** When the resource recovers */
    recovery: 'shortRest' | 'longRest' | 'both';
    description?: string;
}
export interface ScalingValue {
    name: string;
    /** Value at each level (index 0 = level 1). Can be dice strings like "1d6" or numbers */
    valueByLevel: string[];
    description?: string;
}
/**
 * Activation type for feature actions.
 * Mirrors monster action types but includes class-specific options.
 */
export type ActivationType = 'action' | 'bonusAction' | 'reaction' | 'magicAction' | 'free' | 'special';
/**
 * Resource cost for using a feature action.
 */
export interface ResourceCost {
    /** Name of the resource (e.g., "Focus Points", "Channel Divinity", "Rage") */
    resource: string;
    /** Amount of the resource consumed */
    amount: number;
    /** Alternative: can use spell slot instead */
    alternativeSpellSlot?: number;
}
/**
 * Scaling information for feature actions that improve at certain levels.
 */
export interface FeatureScaling {
    /** Description of how the feature scales */
    description: string;
    /** Levels at which the feature improves */
    levels?: number[];
    /** Dice progression (e.g., ["1d8", "2d8", "3d8", "4d8"]) */
    diceProgression?: string[];
}
/**
 * An action-like ability within a class feature.
 * Analogous to monster Action but with class-specific properties like resource costs.
 */
export interface FeatureAction {
    name: string;
    description: string;
    /** How the action is activated */
    activation: ActivationType;
    /** Resource cost to use this action */
    cost?: ResourceCost;
    /** Range of the action */
    range?: SpellRange;
    /** Target description */
    target?: string;
    /** For actions requiring a saving throw */
    savingThrow?: {
        ability: AbilityKey;
        /** How DC is calculated (e.g., "spell save DC", "8 + Str + Prof") */
        dcCalculation?: string;
    };
    /** Damage dealt */
    damage?: DamageInstance[];
    /** Healing provided */
    healing?: DiceExpression;
    /** Area of effect */
    areaOfEffect?: AreaOfEffect;
    /** Conditions applied on failure/success */
    conditionsApplied?: Condition[];
    /** Duration of effects */
    duration?: string;
    /** How the action scales at higher levels */
    scaling?: FeatureScaling;
    /** Usage limits (e.g., "once per turn", "Wisdom modifier times per long rest") */
    usageLimit?: string;
}
export interface ClassFeature {
    name: string;
    level: number;
    description: string;
    /** If this is a subclass feature slot rather than a specific feature */
    isSubclassFeature?: boolean;
    /** Action-like sub-abilities within this feature (e.g., Divine Spark, Turn Undead) */
    actions?: FeatureAction[];
}
export interface SubclassFeature {
    name: string;
    level: number;
    description: string;
    /** Action-like sub-abilities within this feature */
    actions?: FeatureAction[];
}
export interface Subclass {
    id: string;
    name: string;
    className: ClassName;
    /** Flavor text / tagline */
    description?: string;
    /** The thematic tenets or principles (for Paladin oaths, etc.) */
    tenets?: string[];
    features: SubclassFeature[];
    /** Spells always prepared at certain levels (for subclasses that grant spells) */
    subclassSpells?: {
        level: number;
        spells: string[];
    }[];
}
export interface LevelProgression {
    level: number;
    proficiencyBonus: number;
    features: string[];
    /** Cantrips known (for casters) */
    cantrips?: number;
    /** Spells prepared/known */
    preparedSpells?: number;
    /** Spell slots per level (index 0 = 1st level slots) */
    spellSlots?: number[];
    /** For Warlock: pact slot level */
    pactSlotLevel?: number;
    /** Class-specific resources (e.g., Rages: 2, Rage Damage: +2) */
    resources?: Record<string, string | number>;
}
export interface CoreClassTraits {
    primaryAbility: AbilityKey | AbilityKey[];
    hitDie: DieType;
    savingThrows: [AbilityKey, AbilityKey];
    /** Number of skills to choose */
    skillChoiceCount: number;
    /** Skills available to choose from */
    skillChoices: Skill[];
    weaponProficiencies: WeaponProficiency[];
    armorProficiencies: ArmorCategory[];
    toolProficiencies?: string[];
    startingEquipment: {
        optionA: string;
        optionB: string;
    };
}
export interface ClassDefinition {
    id: ClassName;
    name: string;
    coreTraits: CoreClassTraits;
    /** Spellcasting configuration (undefined for non-casters) */
    spellcasting?: ClassSpellcasting;
    /** Class resources like Rage, Focus Points, Sorcery Points */
    resources?: ClassResource[];
    /** Scaling values like Sneak Attack dice, Martial Arts die */
    scalingValues?: ScalingValue[];
    /** Level-by-level progression */
    levelProgression: LevelProgression[];
    /** Class features by level */
    features: ClassFeature[];
    /** Subclasses for this class */
    subclasses: Subclass[];
    /** Levels at which subclass features are gained */
    subclassFeatureLevels: number[];
    /** Class spell list (spell names) organized by level */
    spellList?: Record<number, string[]>;
    /** Additional options like Eldritch Invocations, Metamagic, Fighting Styles */
    classOptions?: ClassOption[];
}
export interface ClassOption {
    name: string;
    description: string;
    /** Minimum level required */
    levelRequirement?: number;
    /** Other prerequisites */
    prerequisites?: string;
    /** Whether this option can be taken multiple times */
    repeatable?: boolean;
    /** Cost in resources (e.g., Sorcery Points for Metamagic) */
    cost?: number | string;
}
export declare function isSpellcastingClass(cls: ClassDefinition): boolean;
export declare function isFullCaster(cls: ClassDefinition): boolean;
export declare function isHalfCaster(cls: ClassDefinition): boolean;
export declare function isPactCaster(cls: ClassDefinition): boolean;
export type CurrencyType = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
export interface Cost {
    amount: number;
    currency: CurrencyType;
}
export interface InventoryItem {
    id: string;
    name: string;
    itemType: 'equipment' | 'magicItem';
    weight?: number;
    cost?: Cost;
    description?: string;
    source?: string;
}
export type WeaponProperty = 'ammunition' | 'finesse' | 'heavy' | 'light' | 'loading' | 'reach' | 'thrown' | 'twoHanded' | 'versatile';
export type WeaponMastery = 'cleave' | 'graze' | 'nick' | 'push' | 'sap' | 'slow' | 'topple' | 'vex';
export interface WeaponDefinition extends InventoryItem {
    itemType: 'equipment';
    equipmentCategory: 'weapon';
    weaponType: 'simple' | 'martial';
    attackType: 'melee' | 'ranged';
    damage: {
        dice: DiceExpression;
        type: DamageType;
    };
    /** Damage when used two-handed (for versatile weapons) */
    versatileDamage?: {
        dice: DiceExpression;
        type: DamageType;
    };
    properties: WeaponProperty[];
    /** Range for ranged or thrown weapons */
    range?: {
        normal: number;
        long: number;
    };
    mastery?: WeaponMastery;
}
export type ArmorType = 'light' | 'medium' | 'heavy' | 'shield';
export interface ArmorDefinition extends InventoryItem {
    itemType: 'equipment';
    equipmentCategory: 'armor';
    armorType: ArmorType;
    ac: {
        base: number;
        /** true = full Dex, 'max2' = Dex max +2, false/undefined = no Dex bonus */
        dexBonus?: boolean | 'max2';
    };
    strengthRequirement?: number;
    stealthDisadvantage?: boolean;
}
export type ToolType = 'artisan' | 'gaming' | 'musical' | 'other';
export interface ToolVariant {
    name: string;
    cost: Cost;
    weight?: number;
}
export interface ToolDefinition extends InventoryItem {
    itemType: 'equipment';
    equipmentCategory: 'tool';
    toolType: ToolType;
    ability: AbilityKey;
    utilizeAction?: string;
    craftItems?: string[];
    variants?: ToolVariant[];
}
export type GearType = 'pack' | 'focus' | 'container' | 'consumable' | 'ammunition' | 'general';
export type FocusType = 'arcane' | 'druidic' | 'holy';
export interface GearDefinition extends InventoryItem {
    itemType: 'equipment';
    equipmentCategory: 'gear';
    gearType?: GearType;
    /** For containers: capacity description */
    capacity?: string;
    /** For items with active use: how they're activated */
    usageAction?: ActivationType;
    /** For packs: contents list */
    packContents?: string[];
    /** For spellcasting foci */
    focusType?: FocusType;
    /** For ammunition: quantity when purchased */
    quantity?: number;
    /** For ammunition: storage item name */
    storage?: string;
}
export type EquipmentDefinition = WeaponDefinition | ArmorDefinition | ToolDefinition | GearDefinition;
export type MagicItemRarity = 'common' | 'uncommon' | 'rare' | 'veryRare' | 'legendary' | 'artifact';
export type MagicItemCategory = 'armor' | 'potion' | 'ring' | 'rod' | 'scroll' | 'staff' | 'wand' | 'weapon' | 'wondrousItem';
export interface MagicItemCharges {
    max: number;
    current?: number;
    /** Dice expression for recharge amount, e.g., "1d6+4" */
    rechargeAmount?: string;
    /** When the item recharges, e.g., "at dawn" */
    rechargeCondition?: string;
}
export interface MagicItemAbility {
    name: string;
    description: string;
    activation?: ActivationType;
    /** Charge cost to use this ability */
    chargeCost?: number;
    /** If the ability casts a spell */
    spell?: string;
    /** Spell level if casting at a specific level */
    spellLevel?: number;
}
export interface MagicItemBonuses {
    ac?: number;
    attackRoll?: number;
    damageRoll?: number;
    savingThrows?: number;
    /** Set ability score to a specific value */
    abilityScore?: {
        ability: AbilityKey;
        value: number;
    };
    /** Bonus to spell save DC */
    spellSaveDC?: number;
    /** Bonus to spell attack rolls */
    spellAttack?: number;
}
export interface MagicItemDefinition extends InventoryItem {
    itemType: 'magicItem';
    category: MagicItemCategory;
    rarity: MagicItemRarity;
    requiresAttunement: boolean;
    /** Prerequisites for attunement, e.g., "by a spellcaster", "by a cleric" */
    attunementPrerequisites?: string[];
    charges?: MagicItemCharges;
    /** Whether the item is consumed when used */
    consumable: boolean;
    cursed?: boolean;
    curseDescription?: string;
    /** Base item type for armor/weapon magic items, e.g., "Plate Armor", "Longsword" */
    baseItemType?: string;
    /** Restrictions on base item, e.g., "Any Medium or Heavy, Except Hide Armor" */
    baseItemRestriction?: string;
    /** Numeric bonuses granted by the item */
    bonuses?: MagicItemBonuses;
    /** Special abilities of the item */
    abilities?: MagicItemAbility[];
    /** Damage resistances granted */
    resistances?: DamageType[];
    /** Damage immunities granted */
    immunities?: DamageType[];
    /** Condition immunities granted */
    conditionImmunities?: Condition[];
    /** Spells the item allows you to cast */
    spellsGranted?: {
        spell: string;
        /** "atWill", "1/day", etc. */
        frequency?: string;
        chargeCost?: number;
    }[];
}
export declare const MAGIC_ITEM_RARITY_VALUES: Record<MagicItemRarity, number | null>;
export declare const MAGIC_ITEM_CRAFTING_TIME: Record<Exclude<MagicItemRarity, 'artifact'>, number>;
export declare const MAGIC_ITEM_CRAFTING_COST: Record<Exclude<MagicItemRarity, 'artifact'>, number>;
export declare function isEquipment(item: InventoryItem): item is EquipmentDefinition;
export declare function isMagicItem(item: InventoryItem): item is MagicItemDefinition;
export declare function isWeapon(item: InventoryItem): item is WeaponDefinition;
export declare function isArmor(item: InventoryItem): item is ArmorDefinition;
export declare function isTool(item: InventoryItem): item is ToolDefinition;
export declare function isGear(item: InventoryItem): item is GearDefinition;
/**
 * Calculate the GP value of a magic item by its rarity.
 * Returns null for artifacts (priceless).
 * Halves value for consumables except spell scrolls.
 */
export declare function calculateMagicItemValue(item: MagicItemDefinition, isSpellScroll?: boolean): number | null;
/**
 * Calculate AC for a character wearing armor.
 */
export declare function calculateArmorAC(armor: ArmorDefinition, dexModifier: number, hasShield?: boolean): number;
export {};
