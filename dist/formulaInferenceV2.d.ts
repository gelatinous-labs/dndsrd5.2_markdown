import type { AbilityKey, AbilityScores, DiceExpression } from './types';
import type { AttackType, DiceFormula, Formula } from './actionDefinitionV2';
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
export declare function inferAttackFormula(attackBonus: number, attackType: AttackType, abilityScores: AbilityScores, cr: number): AttackFormulaResult;
export interface SaveDCFormulaResult {
    dcFormula: Formula;
    misc: number;
}
/**
 * Infer a save DC formula from a resolved save DC.
 *
 * Standard 5e: DC = 8 + PB + abilityMod(saveAbility) + misc
 */
export declare function inferSaveDCFormula(saveDC: number, saveAbility: AbilityKey, abilityScores: AbilityScores, cr: number): SaveDCFormulaResult;
export interface SpellAttackBonusFormulaResult {
    attackBonusFormula: Formula;
    misc: number;
}
export declare function inferSpellAttackBonusFormula(attackBonus: number, spellcastingAbility: AbilityKey, abilityScores: AbilityScores, cr: number): SpellAttackBonusFormulaResult;
export interface SpellSaveDCFormulaResult {
    saveDcFormula: Formula;
    misc: number;
}
export declare function inferSpellSaveDCFormula(saveDC: number, spellcastingAbility: AbilityKey, abilityScores: AbilityScores, cr: number): SpellSaveDCFormulaResult;
export declare function inferDamageModifierFormula(modifier: number, attackAbility: AbilityKey | undefined, abilityScores: AbilityScores): Formula | undefined;
export declare function buildDiceFormula(dice: DiceExpression, attackAbility: AbilityKey | undefined, abilityScores: AbilityScores): DiceFormula;
