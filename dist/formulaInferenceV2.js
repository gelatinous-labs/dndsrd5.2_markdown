"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferAttackFormula = inferAttackFormula;
exports.inferSaveDCFormula = inferSaveDCFormula;
exports.inferSpellAttackBonusFormula = inferSpellAttackBonusFormula;
exports.inferSpellSaveDCFormula = inferSpellSaveDCFormula;
exports.inferDamageModifierFormula = inferDamageModifierFormula;
exports.buildDiceFormula = buildDiceFormula;
const types_1 = require("./types");
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
function flat(value) {
    return { type: 'flat', value };
}
function abilityModFormula(ability) {
    return { type: 'abilityMod', ability };
}
function pb() {
    return { type: 'proficiencyBonus' };
}
function sum(operands) {
    const filtered = operands.filter((o) => !(o.type === 'flat' && o.value === 0));
    if (filtered.length === 0)
        return flat(0);
    if (filtered.length === 1)
        return filtered[0];
    return { type: 'sum', operands: filtered };
}
/**
 * Infer a to-hit formula from a resolved attack bonus.
 *
 * Uses monster ability scores + PB(from CR) to back-solve:
 *   attackBonus = PB + abilityMod + misc
 *
 * We choose the ability that minimizes |misc|, tie-breaking by attack type.
 */
function inferAttackFormula(attackBonus, attackType, abilityScores, cr) {
    const PB = (0, types_1.calculateProficiencyBonus)(cr);
    const scored = ABILITY_KEYS.map((ability) => {
        const mod = (0, types_1.calculateModifier)(abilityScores[ability]);
        const misc = attackBonus - (PB + mod);
        return { ability, mod, misc, absMisc: Math.abs(misc) };
    }).sort((a, b) => {
        if (a.absMisc !== b.absMisc)
            return a.absMisc - b.absMisc;
        // Tie-break: prefer STR for melee, DEX for ranged.
        const pref = attackType === 'ranged' ? 'dex' : attackType === 'melee' ? 'str' : 'dex';
        if (a.ability === pref && b.ability !== pref)
            return -1;
        if (b.ability === pref && a.ability !== pref)
            return 1;
        // Stable fallback
        return ABILITY_KEYS.indexOf(a.ability) - ABILITY_KEYS.indexOf(b.ability);
    });
    const best = scored[0];
    return {
        inferredAbility: best.ability,
        misc: best.misc,
        toHitFormula: sum([pb(), abilityModFormula(best.ability), flat(best.misc)]),
    };
}
/**
 * Infer a save DC formula from a resolved save DC.
 *
 * Standard 5e: DC = 8 + PB + abilityMod(saveAbility) + misc
 */
function inferSaveDCFormula(saveDC, saveAbility, abilityScores, cr) {
    const PB = (0, types_1.calculateProficiencyBonus)(cr);
    const mod = (0, types_1.calculateModifier)(abilityScores[saveAbility]);
    const misc = saveDC - (8 + PB + mod);
    return {
        misc,
        dcFormula: sum([flat(8), pb(), abilityModFormula(saveAbility), flat(misc)]),
    };
}
function inferSpellAttackBonusFormula(attackBonus, spellcastingAbility, abilityScores, cr) {
    const PB = (0, types_1.calculateProficiencyBonus)(cr);
    const mod = (0, types_1.calculateModifier)(abilityScores[spellcastingAbility]);
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
function inferSpellSaveDCFormula(saveDC, spellcastingAbility, abilityScores, cr) {
    const result = inferSaveDCFormula(saveDC, spellcastingAbility, abilityScores, cr);
    return { misc: result.misc, saveDcFormula: result.dcFormula };
}
function inferDamageModifierFormula(modifier, attackAbility, abilityScores) {
    if (modifier === 0)
        return undefined;
    if (attackAbility) {
        const mod = (0, types_1.calculateModifier)(abilityScores[attackAbility]);
        if (mod === modifier)
            return abilityModFormula(attackAbility);
        const diff = modifier - mod;
        if (diff !== 0)
            return sum([abilityModFormula(attackAbility), flat(diff)]);
    }
    for (const ability of ABILITY_KEYS) {
        const mod = (0, types_1.calculateModifier)(abilityScores[ability]);
        if (mod === modifier)
            return abilityModFormula(ability);
    }
    return flat(modifier);
}
function buildDiceFormula(dice, attackAbility, abilityScores) {
    const modFormula = dice.modifier !== 0
        ? inferDamageModifierFormula(dice.modifier, attackAbility, abilityScores)
        : undefined;
    return {
        count: dice.count,
        die: dice.die,
        modifier: modFormula,
    };
}
