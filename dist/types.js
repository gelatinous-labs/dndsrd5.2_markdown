"use strict";
// =============================================================================
// D&D 5.2e Unified Entity Schema
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAGIC_ITEM_CRAFTING_COST = exports.MAGIC_ITEM_CRAFTING_TIME = exports.MAGIC_ITEM_RARITY_VALUES = exports.CLASS_NAMES = exports.SPELL_SCHOOL_NAMES = exports.SKILL_ABILITIES = exports.ABILITY_NAMES = void 0;
exports.isCantrip = isCantrip;
exports.isCharacter = isCharacter;
exports.isMonster = isMonster;
exports.isAttackAction = isAttackAction;
exports.isMultiattackAction = isMultiattackAction;
exports.isAbilityAction = isAbilityAction;
exports.isGenericAction = isGenericAction;
exports.calculateModifier = calculateModifier;
exports.calculateProficiencyBonus = calculateProficiencyBonus;
exports.calculateSpellSaveDC = calculateSpellSaveDC;
exports.calculateSpellAttackBonus = calculateSpellAttackBonus;
exports.calculateSavingThrow = calculateSavingThrow;
exports.calculateSkillModifier = calculateSkillModifier;
exports.calculatePassivePerception = calculatePassivePerception;
exports.calculateXPFromCR = calculateXPFromCR;
exports.calculateAverageDamage = calculateAverageDamage;
exports.parseDiceExpression = parseDiceExpression;
exports.isSpellcastingClass = isSpellcastingClass;
exports.isFullCaster = isFullCaster;
exports.isHalfCaster = isHalfCaster;
exports.isPactCaster = isPactCaster;
exports.isEquipment = isEquipment;
exports.isMagicItem = isMagicItem;
exports.isWeapon = isWeapon;
exports.isArmor = isArmor;
exports.isTool = isTool;
exports.isGear = isGear;
exports.calculateMagicItemValue = calculateMagicItemValue;
exports.calculateArmorAC = calculateArmorAC;
// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
exports.ABILITY_NAMES = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
};
exports.SKILL_ABILITIES = {
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
exports.SPELL_SCHOOL_NAMES = {
    abjuration: 'Abjuration',
    conjuration: 'Conjuration',
    divination: 'Divination',
    enchantment: 'Enchantment',
    evocation: 'Evocation',
    illusion: 'Illusion',
    necromancy: 'Necromancy',
    transmutation: 'Transmutation',
};
// Type guard for cantrips
function isCantrip(spell) {
    return spell.level === 0;
}
// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------
function isCharacter(entity) {
    return entity.entityType === 'character';
}
function isMonster(entity) {
    return entity.entityType === 'monster';
}
function isAttackAction(action) {
    return action.actionType === 'attack';
}
function isMultiattackAction(action) {
    return action.actionType === 'multiattack';
}
function isAbilityAction(action) {
    return action.actionType === 'ability';
}
function isGenericAction(action) {
    return action.actionType === 'generic';
}
// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------
/**
 * Calculate the ability modifier from an ability score.
 */
function calculateModifier(score) {
    return Math.floor((score - 10) / 2);
}
/**
 * Calculate proficiency bonus from level (for characters) or CR (for monsters).
 */
function calculateProficiencyBonus(levelOrCR) {
    if (levelOrCR < 1)
        return 2;
    return Math.floor((levelOrCR - 1) / 4) + 2;
}
/**
 * Calculate spell save DC for an entity.
 */
function calculateSpellSaveDC(entity, ability) {
    const levelOrCR = isCharacter(entity) ? entity.level : entity.cr;
    const profBonus = calculateProficiencyBonus(levelOrCR);
    const abilityMod = calculateModifier(entity.abilityScores[ability]);
    return 8 + profBonus + abilityMod;
}
/**
 * Calculate spell attack bonus for an entity.
 */
function calculateSpellAttackBonus(entity, ability) {
    const levelOrCR = isCharacter(entity) ? entity.level : entity.cr;
    const profBonus = calculateProficiencyBonus(levelOrCR);
    const abilityMod = calculateModifier(entity.abilityScores[ability]);
    return profBonus + abilityMod;
}
/**
 * Calculate saving throw modifier for an entity and ability.
 */
function calculateSavingThrow(entity, ability) {
    const abilityMod = calculateModifier(entity.abilityScores[ability]);
    const isProficient = entity.savingThrowProficiencies.includes(ability);
    if (!isProficient) {
        return abilityMod;
    }
    const levelOrCR = isCharacter(entity) ? entity.level : entity.cr;
    const profBonus = calculateProficiencyBonus(levelOrCR);
    return abilityMod + profBonus;
}
/**
 * Calculate skill modifier for an entity and skill.
 */
function calculateSkillModifier(entity, skill) {
    const ability = exports.SKILL_ABILITIES[skill];
    const abilityMod = calculateModifier(entity.abilityScores[ability]);
    const proficiency = entity.skillProficiencies.find((p) => p.skill === skill);
    if (!proficiency) {
        return abilityMod;
    }
    const levelOrCR = isCharacter(entity) ? entity.level : entity.cr;
    const profBonus = calculateProficiencyBonus(levelOrCR);
    if (proficiency.expertise) {
        return abilityMod + profBonus * 2;
    }
    return abilityMod + profBonus;
}
/**
 * Calculate passive perception for an entity.
 */
function calculatePassivePerception(entity) {
    return 10 + calculateSkillModifier(entity, 'perception');
}
/**
 * Calculate XP reward from challenge rating.
 */
function calculateXPFromCR(cr) {
    const xpByCR = {
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
function calculateAverageDamage(dice) {
    const dieAverages = {
        d4: 2.5,
        d6: 3.5,
        d8: 4.5,
        d10: 5.5,
        d12: 6.5,
        d20: 10.5,
        d100: 50.5,
    };
    const average = dice.count * dieAverages[dice.die] + dice.modifier;
    return Math.floor(average);
}
/**
 * Parse a dice expression string (e.g., "2d6+3") into a DiceExpression object.
 */
function parseDiceExpression(expr) {
    const regex = /^(\d+)d(\d+)([+-]\d+)?$/i;
    const match = expr.replace(/\s/g, '').match(regex);
    if (!match) {
        return null;
    }
    const count = parseInt(match[1], 10);
    const dieValue = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    const validDice = [4, 6, 8, 10, 12, 20, 100];
    if (!validDice.includes(dieValue)) {
        return null;
    }
    const die = `d${dieValue}`;
    return {
        count,
        die,
        modifier,
    };
}
exports.CLASS_NAMES = {
    barbarian: 'Barbarian',
    bard: 'Bard',
    cleric: 'Cleric',
    druid: 'Druid',
    fighter: 'Fighter',
    monk: 'Monk',
    paladin: 'Paladin',
    ranger: 'Ranger',
    rogue: 'Rogue',
    sorcerer: 'Sorcerer',
    warlock: 'Warlock',
    wizard: 'Wizard',
};
// -----------------------------------------------------------------------------
// Type Guards for Classes
// -----------------------------------------------------------------------------
function isSpellcastingClass(cls) {
    return cls.spellcasting !== undefined && cls.spellcasting.type !== 'none';
}
function isFullCaster(cls) {
    return cls.spellcasting?.type === 'full';
}
function isHalfCaster(cls) {
    return cls.spellcasting?.type === 'half';
}
function isPactCaster(cls) {
    return cls.spellcasting?.type === 'pact';
}
// -----------------------------------------------------------------------------
// Constants for Magic Items
// -----------------------------------------------------------------------------
exports.MAGIC_ITEM_RARITY_VALUES = {
    common: 100,
    uncommon: 400,
    rare: 4000,
    veryRare: 40000,
    legendary: 200000,
    artifact: null, // Priceless
};
exports.MAGIC_ITEM_CRAFTING_TIME = {
    common: 5,
    uncommon: 10,
    rare: 50,
    veryRare: 125,
    legendary: 250,
};
exports.MAGIC_ITEM_CRAFTING_COST = {
    common: 50,
    uncommon: 200,
    rare: 2000,
    veryRare: 20000,
    legendary: 100000,
};
// -----------------------------------------------------------------------------
// Type Guards for Inventory Items
// -----------------------------------------------------------------------------
function isEquipment(item) {
    return item.itemType === 'equipment';
}
function isMagicItem(item) {
    return item.itemType === 'magicItem';
}
function isWeapon(item) {
    return item.itemType === 'equipment' && item.equipmentCategory === 'weapon';
}
function isArmor(item) {
    return item.itemType === 'equipment' && item.equipmentCategory === 'armor';
}
function isTool(item) {
    return item.itemType === 'equipment' && item.equipmentCategory === 'tool';
}
function isGear(item) {
    return item.itemType === 'equipment' && item.equipmentCategory === 'gear';
}
// -----------------------------------------------------------------------------
// Helper Functions for Inventory Items
// -----------------------------------------------------------------------------
/**
 * Calculate the GP value of a magic item by its rarity.
 * Returns null for artifacts (priceless).
 * Halves value for consumables except spell scrolls.
 */
function calculateMagicItemValue(item, isSpellScroll = false) {
    const baseValue = exports.MAGIC_ITEM_RARITY_VALUES[item.rarity];
    if (baseValue === null)
        return null;
    // Consumables are worth half, except spell scrolls
    if (item.consumable && !isSpellScroll) {
        return Math.floor(baseValue / 2);
    }
    return baseValue;
}
/**
 * Calculate AC for a character wearing armor.
 */
function calculateArmorAC(armor, dexModifier, hasShield = false) {
    let ac = armor.ac.base;
    if (armor.ac.dexBonus === true) {
        ac += dexModifier;
    }
    else if (armor.ac.dexBonus === 'max2') {
        ac += Math.min(dexModifier, 2);
    }
    // If dexBonus is false or undefined, no Dex bonus
    if (hasShield) {
        ac += 2;
    }
    return ac;
}
