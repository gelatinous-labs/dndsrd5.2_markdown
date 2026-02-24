"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
const formulaInferenceV2_1 = require("./formulaInferenceV2");
// =============================================================================
// Parsing helpers / constants (adapted from parseMonsters.ts)
// =============================================================================
const SKILL_NAME_MAP = {
    acrobatics: 'acrobatics',
    'animal handling': 'animalHandling',
    arcana: 'arcana',
    athletics: 'athletics',
    deception: 'deception',
    history: 'history',
    insight: 'insight',
    intimidation: 'intimidation',
    investigation: 'investigation',
    medicine: 'medicine',
    nature: 'nature',
    perception: 'perception',
    performance: 'performance',
    persuasion: 'persuasion',
    religion: 'religion',
    'sleight of hand': 'sleightOfHand',
    stealth: 'stealth',
    survival: 'survival',
};
const DAMAGE_TYPES = [
    'acid',
    'bludgeoning',
    'cold',
    'fire',
    'force',
    'lightning',
    'necrotic',
    'piercing',
    'poison',
    'psychic',
    'radiant',
    'slashing',
    'thunder',
];
const CONDITIONS = [
    'blinded',
    'charmed',
    'deafened',
    'exhaustion',
    'frightened',
    'grappled',
    'incapacitated',
    'invisible',
    'paralyzed',
    'petrified',
    'poisoned',
    'prone',
    'restrained',
    'stunned',
    'unconscious',
];
const CREATURE_TYPE_MAP = {
    aberration: 'aberration',
    beast: 'beast',
    celestial: 'celestial',
    construct: 'construct',
    dragon: 'dragon',
    elemental: 'elemental',
    fey: 'fey',
    fiend: 'fiend',
    giant: 'giant',
    humanoid: 'humanoid',
    monstrosity: 'monstrosity',
    ooze: 'ooze',
    plant: 'plant',
    undead: 'undead',
};
const SIZE_MAP = {
    tiny: 'Tiny',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    huge: 'Huge',
    gargantuan: 'Gargantuan',
};
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
function generateId(name) {
    return slugify(name);
}
function parseSize(text) {
    const lower = text.toLowerCase();
    for (const [key, value] of Object.entries(SIZE_MAP)) {
        if (lower.includes(key))
            return value;
    }
    return 'Medium';
}
function parseCreatureType(text) {
    const tagMatch = text.match(/\(([^)]+)\)/);
    const tags = tagMatch ? [tagMatch[1]] : undefined;
    const typeText = text.replace(/\([^)]+\)/, '').toLowerCase().trim();
    for (const [key, value] of Object.entries(CREATURE_TYPE_MAP)) {
        if (typeText.includes(key))
            return { type: value, tags };
    }
    return { type: 'humanoid', tags };
}
function parseSpeed(speedText) {
    const speed = {};
    const walkMatch = speedText.match(/^(\d+)\s*ft\./);
    if (walkMatch)
        speed.walk = parseInt(walkMatch[1], 10);
    const flyMatch = speedText.match(/fly\s+(\d+)\s*ft\./i);
    if (flyMatch)
        speed.fly = parseInt(flyMatch[1], 10);
    const swimMatch = speedText.match(/swim\s+(\d+)\s*ft\./i);
    if (swimMatch)
        speed.swim = parseInt(swimMatch[1], 10);
    const burrowMatch = speedText.match(/burrow\s+(\d+)\s*ft\./i);
    if (burrowMatch)
        speed.burrow = parseInt(burrowMatch[1], 10);
    const climbMatch = speedText.match(/climb\s+(\d+)\s*ft\./i);
    if (climbMatch)
        speed.climb = parseInt(climbMatch[1], 10);
    if (speedText.toLowerCase().includes('hover'))
        speed.hover = true;
    return speed;
}
function parseHP(hpText) {
    // Format: "150 (20d10 + 40)"
    const match = hpText.match(/(\d+)\s*\((\d+)d(\d+)/);
    if (match) {
        const hp = parseInt(match[1], 10);
        const dieCount = parseInt(match[2], 10);
        const dieType = parseInt(match[3], 10);
        const validDice = [4, 6, 8, 10, 12, 20, 100];
        if (validDice.includes(dieType)) {
            return {
                current: hp,
                max: hp,
                hitDice: { count: dieCount, die: `d${dieType}` },
            };
        }
    }
    const numMatch = hpText.match(/(\d+)/);
    const hp = numMatch ? parseInt(numMatch[1], 10) : 1;
    return { current: hp, max: hp };
}
function parseAC(acText) {
    const match = acText.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 10;
}
function parseCR(crText) {
    let cr = 0;
    const crMatch = crText.match(/^([\d/]+)/);
    if (crMatch) {
        const crStr = crMatch[1];
        if (crStr.includes('/')) {
            const [num, denom] = crStr.split('/').map((n) => parseInt(n, 10));
            cr = num / denom;
        }
        else {
            cr = parseInt(crStr, 10);
        }
    }
    let xp;
    let xpInLair;
    const lairMatch = crText.match(/or\s+([\d,]+)\s*in\s*lair/i);
    if (lairMatch)
        xpInLair = parseInt(lairMatch[1].replace(/,/g, ''), 10);
    const xpMatch = crText.match(/XP\s+([\d,]+)/);
    if (xpMatch)
        xp = parseInt(xpMatch[1].replace(/,/g, ''), 10);
    return { cr, xp, xpInLair };
}
function parseSenses(sensesText) {
    const senses = { passivePerception: 10 };
    const blindsightMatch = sensesText.match(/blindsight\s+(\d+)\s*ft\./i);
    if (blindsightMatch)
        senses.blindsight = parseInt(blindsightMatch[1], 10);
    const darkvisionMatch = sensesText.match(/darkvision\s+(\d+)\s*ft\./i);
    if (darkvisionMatch)
        senses.darkvision = parseInt(darkvisionMatch[1], 10);
    const tremorsenseMatch = sensesText.match(/tremorsense\s+(\d+)\s*ft\./i);
    if (tremorsenseMatch)
        senses.tremorsense = parseInt(tremorsenseMatch[1], 10);
    const truesightMatch = sensesText.match(/truesight\s+(\d+)\s*ft\./i);
    if (truesightMatch)
        senses.truesight = parseInt(truesightMatch[1], 10);
    const passiveMatch = sensesText.match(/passive\s*perception\s+(\d+)/i);
    if (passiveMatch)
        senses.passivePerception = parseInt(passiveMatch[1], 10);
    return senses;
}
function parseSkills(skillsText) {
    const skills = [];
    const skillPattern = /([A-Za-z\s]+)\s+[+-]\d+/g;
    let match;
    while ((match = skillPattern.exec(skillsText)) !== null) {
        const skillName = match[1].trim().toLowerCase();
        const skill = SKILL_NAME_MAP[skillName];
        if (skill) {
            skills.push({ skill });
        }
    }
    return skills;
}
function parseAbilityScores(lines) {
    const scores = {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
    };
    const saveProficiencies = [];
    const abilityMap = {
        STR: 'str',
        DEX: 'dex',
        CON: 'con',
        INT: 'int',
        WIS: 'wis',
        CHA: 'cha',
    };
    for (const line of lines) {
        const match = line.match(/\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(\d+)\s*\|\s*([+-]?\d+)\s*\|\s*([+-]?\d+)\s*\|/i);
        if (!match)
            continue;
        const ability = abilityMap[match[1].toUpperCase()];
        const score = parseInt(match[2], 10);
        const mod = parseInt(match[3], 10);
        const save = parseInt(match[4], 10);
        scores[ability] = score;
        if (save > mod)
            saveProficiencies.push(ability);
    }
    return { scores, saveProficiencies };
}
function parseImmunitiesResistances(text) {
    const damage = [];
    const conditions = [];
    const parts = text.split(/[,;]/);
    for (const part of parts) {
        const lower = part.trim().toLowerCase();
        for (const dt of DAMAGE_TYPES) {
            if (lower.includes(dt))
                damage.push(dt);
        }
        for (const cond of CONDITIONS) {
            if (lower.includes(cond))
                conditions.push(cond);
        }
    }
    return { damage, conditions };
}
function parseLanguages(langText) {
    return langText
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean);
}
function parseDamageFromText(text) {
    const damages = [];
    const damagePattern = /(\d+)\s*\((\d+d\d+)(?:\s*([+-]\s*\d+))?\)\s*(\w+)\s*damage/gi;
    let match;
    while ((match = damagePattern.exec(text)) !== null) {
        const diceExpr = match[2] + (match[3] ? match[3].replace(/\s/g, '') : '');
        const typeStr = match[4].toLowerCase();
        const parsed = (0, types_1.parseDiceExpression)(diceExpr);
        if (!parsed)
            continue;
        if (!DAMAGE_TYPES.includes(typeStr))
            continue;
        damages.push({ dice: parsed, type: typeStr });
    }
    return damages;
}
function parseOutcomeText(description) {
    // Common SRD patterns:
    // "*Failure:* X. *Success:* Y."
    const failureMatch = description.match(/\*Failure:\*\s*([^*]+?)(?=\*\w)/i);
    const successMatch = description.match(/\*Success:\*\s*([^*]+?)(?=\*\w)/i);
    return {
        onFailure: failureMatch ? failureMatch[1].trim() : undefined,
        onSuccess: successMatch ? successMatch[1].trim() : undefined,
    };
}
function parseAreaOfEffect(description) {
    // Line: "60-foot-long, 5-foot-wide Line"
    const lineMatch = description.match(/(\d+)-foot-long,\s*(\d+)-foot-wide\s+Line/i);
    if (lineMatch) {
        return {
            shape: 'line',
            size: parseInt(lineMatch[1], 10),
            width: parseInt(lineMatch[2], 10),
        };
    }
    // Generic: "30-foot Cone", "5-foot Emanation", "20-foot-radius Sphere"
    const aoeMatch = description.match(/(\d+)-foot(?:-radius)?\s+(Cone|Cube|Cylinder|Emanation|Sphere)/i);
    if (aoeMatch) {
        const shape = aoeMatch[2].toLowerCase();
        return { shape, size: parseInt(aoeMatch[1], 10) };
    }
    return undefined;
}
function sectionActivation(section) {
    switch (section) {
        case 'actions':
            return 'action';
        case 'bonusActions':
            return 'bonusAction';
        case 'reactions':
            return 'reaction';
        case 'legendaryActions':
            return 'special';
        case 'spells':
            return 'special';
        case 'traits':
        default:
            return 'passive';
    }
}
function mapAttackType(raw) {
    const lower = raw.toLowerCase();
    if (lower.includes('melee or ranged'))
        return 'melee_or_ranged';
    if (lower.includes('ranged'))
        return 'ranged';
    return 'melee';
}
function abilityKeyFromFullName(name) {
    const lower = name.toLowerCase();
    if (lower.startsWith('strength'))
        return 'str';
    if (lower.startsWith('dexterity'))
        return 'dex';
    if (lower.startsWith('constitution'))
        return 'con';
    if (lower.startsWith('intelligence'))
        return 'int';
    if (lower.startsWith('wisdom'))
        return 'wis';
    return 'cha';
}
function parseNameQualifiers(name) {
    let baseName = name.trim();
    const tags = [];
    let usageLimit;
    let recharge;
    let legendaryCost;
    // Legendary action cost "(Costs 2 Actions)"
    const costMatch = baseName.match(/\(Costs?\s+(\d+)\s+Actions?\)/i);
    if (costMatch) {
        legendaryCost = parseInt(costMatch[1], 10);
        baseName = baseName.replace(costMatch[0], '').trim();
    }
    // Recharge "(Recharge 5-6)"
    const rechargeMatch = baseName.match(/\(Recharge\s+(\d+)(?:-(\d+))?\)/i);
    if (rechargeMatch) {
        const min = parseInt(rechargeMatch[1], 10);
        const max = rechargeMatch[2] ? parseInt(rechargeMatch[2], 10) : min;
        recharge = { min, max };
        baseName = baseName.replace(rechargeMatch[0], '').trim();
    }
    // Usage limit "(2/Day)" or "(2/Day Each)" or "(1e/Day Each)"
    const usageMatch = baseName.match(/\((\d+)\s*e?\s*\/\s*Day(?:\s+Each)?\)/i);
    if (usageMatch) {
        usageLimit = { uses: parseInt(usageMatch[1], 10), per: 'day' };
        baseName = baseName.replace(usageMatch[0], '').trim();
    }
    // Lair alternate uses "(3/Day, or 4/Day in Lair)"
    const lairAltMatch = baseName.match(/\((\d+)\s*\/\s*Day,\s*or\s*(\d+)\s*\/\s*Day\s*in\s*Lair\)/i);
    if (lairAltMatch) {
        usageLimit = { uses: parseInt(lairAltMatch[1], 10), per: 'day' };
        tags.push(`altUsesInLair:${parseInt(lairAltMatch[2], 10)}`);
        baseName = baseName.replace(lairAltMatch[0], '').trim();
    }
    return { baseName, usageLimit, recharge, legendaryCost, tags };
}
function parseMultiattackItems(description) {
    const items = [];
    const multiPattern = /makes?\s+(one|two|three|four|five|\d+)\s+([A-Za-z][A-Za-z'’ -]+?)\s+attacks?/gi;
    const countMap = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
    };
    let match;
    while ((match = multiPattern.exec(description)) !== null) {
        const countRaw = match[1].toLowerCase();
        const count = Number.isFinite(Number(countRaw))
            ? parseInt(countRaw, 10)
            : (countMap[countRaw] ?? 1);
        items.push({ name: match[2].trim(), count });
    }
    return items;
}
function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}
function loadSpellIndex(srcDir) {
    const spellsPath = path.join(srcDir, 'spells.json');
    if (!fs.existsSync(spellsPath))
        return new Map();
    const raw = fs.readFileSync(spellsPath, 'utf-8');
    const spells = JSON.parse(raw);
    const map = new Map();
    for (const s of spells) {
        map.set(normalizeName(s.name), {
            id: s.id,
            name: s.name,
            castingTime: s.castingTime,
        });
    }
    return map;
}
function mapCastingTimeToActivation(castingTime) {
    if (!castingTime)
        return 'special';
    switch (castingTime.type) {
        case 'action':
            return 'action';
        case 'bonusAction':
            return 'bonusAction';
        case 'reaction':
            return 'reaction';
        default:
            return 'special';
    }
}
function extractSpellcastingHeaderInfo(text) {
    const out = {};
    const abilityMatch = text.match(/using\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+as\s+the\s+spellcasting\s+ability/i);
    if (abilityMatch) {
        out.spellcastingAbility = abilityKeyFromFullName(abilityMatch[1]);
    }
    const dcMatch = text.match(/spell\s+save\s+DC\s+(\d+)/i);
    if (dcMatch)
        out.spellSaveDC = parseInt(dcMatch[1], 10);
    const atkMatch = text.match(/([+-]?\d+)\s+to\s+hit\s+with\s+spell\s+attacks?/i);
    if (atkMatch)
        out.spellAttackBonus = parseInt(atkMatch[1], 10);
    return out;
}
function extractSpellsFromSpellcastingMarkdown(rawMarkdown) {
    const lines = rawMarkdown.split('\n');
    const groups = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('-'))
            continue;
        const atWillMatch = trimmed.match(/\*\*At\s+Will:\*\*\s*(.*)$/i);
        if (atWillMatch) {
            const spells = Array.from(atWillMatch[1].matchAll(/\*([^*]+)\*/g)).map((m) => m[1].trim());
            if (spells.length > 0)
                groups.push({ kind: 'atWill', spellNames: spells });
            continue;
        }
        const perDayMatch = trimmed.match(/\*\*(\d+)\s*e?\s*\/\s*Day\s+Each:\*\*\s*(.*)$/i);
        if (perDayMatch) {
            const uses = parseInt(perDayMatch[1], 10);
            const spells = Array.from(perDayMatch[2].matchAll(/\*([^*]+)\*/g)).map((m) => m[1].trim());
            if (spells.length > 0) {
                groups.push({ kind: 'perDay', uses, spellNames: spells });
            }
            continue;
        }
    }
    return groups;
}
function splitIntoMonsterBlocks(content) {
    const lines = content.split('\n');
    const blocks = [];
    let currentBlock = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headerMatch = line.match(/^##\s+(.+)$/);
        if (headerMatch && !line.startsWith('###')) {
            if (currentBlock)
                blocks.push(currentBlock);
            currentBlock = {
                name: headerMatch[1].trim(),
                headerLineNumber: i + 1,
                headerLine: line,
                lines: [],
            };
            continue;
        }
        if (currentBlock)
            currentBlock.lines.push({ lineNumber: i + 1, text: line });
    }
    if (currentBlock)
        blocks.push(currentBlock);
    return blocks;
}
function flattenItemDescription(lines) {
    return lines
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .trim();
}
function buildActionDefinitionForItem(opts) {
    const { monster, section, sortOrder, itemName, rawMarkdown, rawStartLine, rawEndLine, flattenedDescription, spellIndex, } = opts;
    const qualifiers = parseNameQualifiers(itemName);
    const name = qualifiers.baseName;
    const tags = [...qualifiers.tags];
    const raw = {
        sourceFile: '12_MonstersA-Z.md',
        startLine: rawStartLine,
        endLine: rawEndLine,
        markdown: rawMarkdown,
    };
    const keyBase = `monster:${monster.slug}:${section}:${slugify(name)}:${rawStartLine}`;
    // Multiattack
    if (name.toLowerCase() === 'multiattack') {
        const items = parseMultiattackItems(flattenedDescription);
        return {
            primary: {
                section,
                sortOrder,
                key: keyBase,
                name,
                kind: 'multiattack',
                activation: sectionActivation(section),
                rulesText: flattenedDescription,
                tags,
                usageLimit: qualifiers.usageLimit,
                recharge: qualifiers.recharge,
                legendaryCost: qualifiers.legendaryCost,
                multiattack: { items },
                raw,
            },
            extra: [],
        };
    }
    // Attack action
    const attackMatch = flattenedDescription.match(/\*(Melee|Ranged|Melee or Ranged)\s+Attack\s+Roll:\*\s*([+-]?\d+)/i);
    if (attackMatch) {
        const attackType = mapAttackType(attackMatch[1]);
        const attackBonus = parseInt(attackMatch[2], 10);
        const inferred = (0, formulaInferenceV2_1.inferAttackFormula)(attackBonus, attackType, monster.abilityScores, monster.cr);
        const reachMatch = flattenedDescription.match(/reach\s+(\d+)\s*ft\./i);
        const reach = reachMatch ? parseInt(reachMatch[1], 10) : undefined;
        const rangeMatch = flattenedDescription.match(/range\s+(\d+)(?:\/(\d+))?\s*ft\./i);
        const range = rangeMatch
            ? {
                normal: parseInt(rangeMatch[1], 10),
                long: rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined,
            }
            : undefined;
        const damages = parseDamageFromText(flattenedDescription);
        const damage = damages.map((d) => ({
            appliesOn: 'onHit',
            damageType: d.type,
            diceFormula: (0, formulaInferenceV2_1.buildDiceFormula)(d.dice, inferred.inferredAbility, monster.abilityScores),
        }));
        return {
            primary: {
                section,
                sortOrder,
                key: keyBase,
                name,
                kind: 'attack',
                activation: sectionActivation(section),
                rulesText: flattenedDescription,
                tags,
                usageLimit: qualifiers.usageLimit,
                recharge: qualifiers.recharge,
                legendaryCost: qualifiers.legendaryCost,
                attack: {
                    attackType,
                    attackBonus,
                    toHitFormula: inferred.toHitFormula,
                    inferredAbility: inferred.inferredAbility,
                    misc: inferred.misc,
                    reach,
                    range,
                },
                damage: damage.length > 0 ? damage : undefined,
                raw,
            },
            extra: [],
        };
    }
    // Save action
    const saveMatch = flattenedDescription.match(/\*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Saving\s+Throw\*:\s*DC\s+(\d+)/i);
    if (saveMatch) {
        const saveAbility = abilityKeyFromFullName(saveMatch[1]);
        const saveDC = parseInt(saveMatch[2], 10);
        const inferred = (0, formulaInferenceV2_1.inferSaveDCFormula)(saveDC, saveAbility, monster.abilityScores, monster.cr);
        const outcomes = parseOutcomeText(flattenedDescription);
        const aoe = parseAreaOfEffect(flattenedDescription);
        const damages = parseDamageFromText(flattenedDescription);
        const damage = damages.map((d) => ({
            appliesOn: 'onFailSave',
            damageType: d.type,
            diceFormula: (0, formulaInferenceV2_1.buildDiceFormula)(d.dice, undefined, monster.abilityScores),
        }));
        return {
            primary: {
                section,
                sortOrder,
                key: keyBase,
                name,
                kind: 'save',
                activation: sectionActivation(section),
                rulesText: flattenedDescription,
                tags,
                usageLimit: qualifiers.usageLimit,
                recharge: qualifiers.recharge,
                legendaryCost: qualifiers.legendaryCost,
                save: {
                    saveAbility,
                    saveDC,
                    dcFormula: inferred.dcFormula,
                    misc: inferred.misc,
                    onFailure: outcomes.onFailure,
                    onSuccess: outcomes.onSuccess,
                    areaOfEffect: aoe,
                },
                damage: damage.length > 0 ? damage : undefined,
                raw,
            },
            extra: [],
        };
    }
    // Spellcasting block -> keep as a generic definition, but also create spellcast defs.
    const extra = [];
    if (name.toLowerCase() === 'spellcasting') {
        const headerInfo = extractSpellcastingHeaderInfo(flattenedDescription);
        const spellGroups = extractSpellsFromSpellcastingMarkdown(rawMarkdown);
        for (const group of spellGroups) {
            for (const spellNameRaw of group.spellNames) {
                const normalized = normalizeName(spellNameRaw);
                const spell = spellIndex.get(normalized);
                const usageLimit = group.kind === 'perDay' && group.uses
                    ? { uses: group.uses, per: 'day' }
                    : undefined;
                const spellTags = [
                    ...(group.kind === 'atWill' ? ['atWill'] : [`perDay:${group.uses}`]),
                ];
                const spellcastingAbility = headerInfo.spellcastingAbility;
                const spellSaveDC = headerInfo.spellSaveDC;
                const spellAttackBonus = headerInfo.spellAttackBonus;
                const spellcast = {
                    spellName: spell?.name ?? spellNameRaw,
                    spellKey: spell?.id ? `spell:${spell.id}` : undefined,
                    spellcastingAbility,
                    spellSaveDC,
                    spellAttackBonus,
                };
                if (spellcastingAbility && spellAttackBonus != null) {
                    const atk = (0, formulaInferenceV2_1.inferSpellAttackBonusFormula)(spellAttackBonus, spellcastingAbility, monster.abilityScores, monster.cr);
                    spellcast.spellAttackBonusFormula = atk.attackBonusFormula;
                    spellcast.miscSpellAttackBonus = atk.misc;
                }
                if (spellcastingAbility && spellSaveDC != null) {
                    const dc = (0, formulaInferenceV2_1.inferSpellSaveDCFormula)(spellSaveDC, spellcastingAbility, monster.abilityScores, monster.cr);
                    spellcast.spellSaveDcFormula = dc.saveDcFormula;
                    spellcast.miscSpellSaveDC = dc.misc;
                }
                extra.push({
                    section: 'spells',
                    sortOrder: extra.length,
                    key: `monster:${monster.slug}:spells:${spell?.id ?? slugify(spellNameRaw)}:${rawStartLine}`,
                    name: spellcast.spellName,
                    kind: 'spellcast',
                    activation: mapCastingTimeToActivation(spell?.castingTime),
                    rulesText: '',
                    tags: spellTags,
                    usageLimit,
                    spellcast,
                    raw,
                });
            }
        }
    }
    return {
        primary: {
            section,
            sortOrder,
            key: keyBase,
            name,
            kind: 'generic',
            activation: sectionActivation(section),
            rulesText: flattenedDescription,
            tags,
            usageLimit: qualifiers.usageLimit,
            recharge: qualifiers.recharge,
            legendaryCost: qualifiers.legendaryCost,
            raw,
        },
        extra,
    };
}
function parseMonsterBlock(block, spellIndex) {
    const { name, lines, headerLineNumber, headerLine } = block;
    // Find the type line (first italic line): "*Large Aberration, Lawful Evil*"
    let typeLine = '';
    for (const l of lines) {
        if (l.text.startsWith('*') &&
            l.text.endsWith('*') &&
            !l.text.startsWith('**') &&
            !l.text.startsWith('***')) {
            typeLine = l.text.slice(1, -1);
            break;
        }
    }
    if (!typeLine) {
        console.warn(`Could not find type line for monster: ${name}`);
        return null;
    }
    // Format: "Large Aberration, Lawful Evil" or "Huge Dragon (Chromatic), Chaotic Evil"
    const typeMatch = typeLine.match(/^(\w+)\s+(.+?),\s*(.+)$/);
    if (!typeMatch) {
        console.warn(`Could not parse type line for monster: ${name}: ${typeLine}`);
        return null;
    }
    const size = parseSize(typeMatch[1]);
    const { type: creatureType, tags } = parseCreatureType(typeMatch[2]);
    const alignment = typeMatch[3].trim();
    const slug = generateId(name);
    const monster = {
        key: `monster:${slug}`,
        slug,
        name,
        source: 'srd',
        size,
        creatureType,
        tags,
        alignment,
        abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        hp: { current: 1, max: 1 },
        ac: 10,
        speed: { walk: 30 },
        cr: 0,
        savingThrowProficiencies: [],
        skillProficiencies: [],
        senses: { passivePerception: 10 },
        languages: [],
        actionDefinitions: [],
        raw: {
            sourceFile: '12_MonstersA-Z.md',
            startLine: headerLineNumber,
            endLine: lines.length > 0 ? lines[lines.length - 1].lineNumber : headerLineNumber,
            markdown: [headerLine, ...lines.map((l) => l.text)].join('\n'),
        },
    };
    // Parse bullet points
    for (const l of lines) {
        const line = l.text;
        if (line.startsWith('- **Armor Class:**')) {
            monster.ac = parseAC(line.replace('- **Armor Class:**', '').trim());
        }
        else if (line.startsWith('- **Hit Points:**')) {
            const hpData = parseHP(line.replace('- **Hit Points:**', '').trim());
            monster.hp = { current: hpData.current, max: hpData.max };
            if (hpData.hitDice)
                monster.hitDice = hpData.hitDice;
        }
        else if (line.startsWith('- **Speed:**')) {
            monster.speed = parseSpeed(line.replace('- **Speed:**', '').trim());
        }
        else if (line.startsWith('- **Skills**:')) {
            monster.skillProficiencies = parseSkills(line.replace('- **Skills**:', '').trim());
        }
        else if (line.startsWith('- **Senses**:')) {
            monster.senses = parseSenses(line.replace('- **Senses**:', '').trim());
        }
        else if (line.startsWith('- **Languages**:')) {
            monster.languages = parseLanguages(line.replace('- **Languages**:', '').trim());
        }
        else if (line.startsWith('- **CR**')) {
            const crData = parseCR(line.replace('- **CR**', '').trim());
            monster.cr = crData.cr;
            if (crData.xp)
                monster.xp = crData.xp;
            if (crData.xpInLair)
                monster.xpInLair = crData.xpInLair;
        }
        else if (line.startsWith('- **Immunities**:')) {
            const immText = line.replace('- **Immunities**:', '').trim();
            const { damage, conditions } = parseImmunitiesResistances(immText);
            if (damage.length > 0)
                monster.immunities = damage;
            if (conditions.length > 0)
                monster.conditionImmunities = conditions;
        }
        else if (line.startsWith('- **Resistances**:')) {
            const resText = line.replace('- **Resistances**:', '').trim();
            const { damage } = parseImmunitiesResistances(resText);
            if (damage.length > 0)
                monster.resistances = damage;
        }
        else if (line.startsWith('- **Vulnerabilities**:')) {
            const vulnText = line.replace('- **Vulnerabilities**:', '').trim();
            const { damage } = parseImmunitiesResistances(vulnText);
            if (damage.length > 0)
                monster.vulnerabilities = damage;
        }
    }
    // Parse ability score table
    const tableLines = lines
        .map((l) => l.text)
        .filter((t) => t.startsWith('|') && t.includes('|'));
    const { scores, saveProficiencies } = parseAbilityScores(tableLines);
    monster.abilityScores = scores;
    monster.savingThrowProficiencies = saveProficiencies;
    // Parse sections + items (track raw markdown per item)
    let currentSection = null;
    let currentItemName = '';
    let currentItemDescLines = [];
    let currentItemRawLines = [];
    const flushItem = () => {
        if (!currentSection || !currentItemName || currentItemRawLines.length === 0) {
            currentItemName = '';
            currentItemDescLines = [];
            currentItemRawLines = [];
            return;
        }
        const rawMarkdown = currentItemRawLines.map((l) => l.text).join('\n');
        const flattened = flattenItemDescription(currentItemDescLines);
        const sortOrder = monster.actionDefinitions.filter((a) => a.section === currentSection).length;
        const { primary, extra } = buildActionDefinitionForItem({
            monster,
            section: currentSection,
            sortOrder,
            itemName: currentItemName,
            rawMarkdown,
            rawStartLine: currentItemRawLines[0].lineNumber,
            rawEndLine: currentItemRawLines[currentItemRawLines.length - 1].lineNumber,
            flattenedDescription: flattened,
            spellIndex,
        });
        monster.actionDefinitions.push(primary);
        for (const e of extra)
            monster.actionDefinitions.push(e);
        // Legendary resistance (store uses/day if present)
        if (currentSection === 'traits' &&
            currentItemName.toLowerCase().includes('legendary resistance') &&
            primary.usageLimit?.per === 'day') {
            monster.legendaryResistance = primary.usageLimit.uses;
        }
        currentItemName = '';
        currentItemDescLines = [];
        currentItemRawLines = [];
    };
    for (const l of lines) {
        const line = l.text;
        if (line.startsWith('### Traits')) {
            flushItem();
            currentSection = 'traits';
            continue;
        }
        if (line.startsWith('### Actions')) {
            flushItem();
            currentSection = 'actions';
            continue;
        }
        if (line.startsWith('### Bonus Actions')) {
            flushItem();
            currentSection = 'bonusActions';
            continue;
        }
        if (line.startsWith('### Reactions')) {
            flushItem();
            currentSection = 'reactions';
            continue;
        }
        if (line.startsWith('### Legendary Actions')) {
            flushItem();
            currentSection = 'legendaryActions';
            continue;
        }
        if (currentSection && line.startsWith('***') && line.includes('.***')) {
            flushItem();
            const itemMatch = line.match(/\*\*\*(.+?)\.\*\*\*\s*(.*)/);
            if (itemMatch) {
                currentItemName = itemMatch[1].trim();
                currentItemDescLines = [itemMatch[2] ?? ''];
                currentItemRawLines = [l];
            }
            continue;
        }
        if (currentSection && currentItemName && line.trim()) {
            currentItemDescLines.push(line.trim());
            currentItemRawLines.push(l);
        }
    }
    flushItem();
    if (monster.actionDefinitions.some((a) => a.section === 'legendaryActions')) {
        monster.legendaryActionCount = 3;
    }
    return monster;
}
function main() {
    // __dirname is dist/ when compiled, so go up and into src/
    const srcDir = path.join(__dirname, '..', 'src');
    const inputPath = path.join(srcDir, '12_MonstersA-Z.md');
    const outputPath = path.join(srcDir, 'monsters.v2.json');
    console.log(`Reading monsters from: ${inputPath}`);
    const content = fs.readFileSync(inputPath, 'utf-8');
    const blocks = splitIntoMonsterBlocks(content);
    console.log(`Found ${blocks.length} monster blocks`);
    const spellIndex = loadSpellIndex(srcDir);
    console.log(`Loaded ${spellIndex.size} spells for name→id mapping`);
    const monsters = [];
    for (const block of blocks) {
        const monster = parseMonsterBlock(block, spellIndex);
        if (monster)
            monsters.push(monster);
    }
    console.log(`Parsed ${monsters.length} monsters (v2)`);
    fs.writeFileSync(outputPath, JSON.stringify(monsters, null, 2));
    console.log(`Wrote v2 monsters to: ${outputPath}`);
}
main();
