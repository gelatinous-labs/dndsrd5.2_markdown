"use strict";
// =============================================================================
// D&D 5.2e Unified Entity Schema
// =============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_ABILITIES = exports.ABILITY_NAMES = void 0;
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
    const average = dice.count * dieAverages[dice.die] + (dice.modifier ?? 0);
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
    const modifier = match[3] ? parseInt(match[3], 10) : undefined;
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
