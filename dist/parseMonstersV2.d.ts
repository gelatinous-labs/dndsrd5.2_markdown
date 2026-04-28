import type { AbilityKey, AbilityScores, Condition, CreatureType, DamageType, DieType, Senses, Size, Skill, Speed } from './types';
import type { MonsterActionDefinitionV2 } from './actionDefinitionV2';
/**
 * Monsters V2 generator.
 *
 * Parses `src/12_MonstersA-Z.md` directly and emits a v2 JSON artifact:
 *   `src/monsters.v2.json`
 *
 * The v2 format is aligned with Initiative Vault’s ActionDefinition + Formula
 * approach (actions are categorized, and roll/DC formulas are inferred).
 */
export interface MonsterV2 {
    /** Stable external key, not a DB primary key. Format: "monster:<slug>" */
    key: string;
    /** Stable slug used in compendium keys. */
    slug: string;
    name: string;
    /** Source tag for compendium ingestion. */
    source: 'srd';
    size: Size;
    creatureType: CreatureType;
    tags?: string[];
    alignment: string;
    abilityScores: AbilityScores;
    hp: {
        current: number;
        max: number;
    };
    hitDice?: {
        count: number;
        die: DieType;
    };
    ac: number;
    speed: Speed;
    cr: number;
    xp?: number;
    xpInLair?: number;
    savingThrowProficiencies: AbilityKey[];
    skillProficiencies: SkillProficiencyV2[];
    resistances?: DamageType[];
    immunities?: DamageType[];
    vulnerabilities?: DamageType[];
    conditionImmunities?: Condition[];
    senses: Senses;
    languages: string[];
    legendaryActionCount?: number;
    legendaryResistance?: number;
    /** Flattened action definitions across all sections. */
    actionDefinitions: MonsterActionDefinitionV2[];
    raw?: {
        sourceFile: string;
        startLine: number;
        endLine: number;
        markdown: string;
    };
}
export interface SkillProficiencyV2 {
    skill: Skill;
    expertise?: boolean;
}
