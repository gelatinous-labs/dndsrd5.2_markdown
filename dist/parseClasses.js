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
// Mapping of class names
const CLASS_NAME_MAP = {
    barbarian: 'barbarian',
    bard: 'bard',
    cleric: 'cleric',
    druid: 'druid',
    fighter: 'fighter',
    monk: 'monk',
    paladin: 'paladin',
    ranger: 'ranger',
    rogue: 'rogue',
    sorcerer: 'sorcerer',
    warlock: 'warlock',
    wizard: 'wizard',
};
// Ability mapping
const ABILITY_MAP = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha',
};
// Skill mapping
const SKILL_MAP = {
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
function parseAbility(text) {
    const lower = text.toLowerCase().trim();
    return ABILITY_MAP[lower] || null;
}
// Valid damage types for parsing
const DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
];
// Valid conditions
const CONDITIONS = [
    'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled',
    'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
    'prone', 'restrained', 'stunned', 'unconscious',
];
/**
 * Parse activation type from text like "As a Bonus Action" or "As a Magic action"
 */
function parseActivationType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('as a magic action'))
        return 'magicAction';
    if (lower.includes('as a bonus action'))
        return 'bonusAction';
    if (lower.includes('as a reaction'))
        return 'reaction';
    if (lower.includes('as an action'))
        return 'action';
    return null;
}
/**
 * Parse range from text like "within 30 feet" or "60 feet of yourself"
 */
function parseActionRange(text) {
    // Check for self
    if (text.toLowerCase().includes('yourself') && !text.match(/within\s+\d+\s*(?:feet|ft)/i)) {
        return { type: 'self' };
    }
    // Check for touch
    if (text.toLowerCase().includes('touch a creature') || text.toLowerCase().includes('you touch')) {
        return { type: 'touch' };
    }
    // Check for distance
    const distMatch = text.match(/within\s+(\d+)\s*(?:feet|ft)/i);
    if (distMatch) {
        return { type: 'distance', feet: parseInt(distMatch[1], 10) };
    }
    return undefined;
}
/**
 * Parse saving throw requirement from text
 */
function parseActionSavingThrow(text) {
    const saveMatch = text.match(/(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving\s+throw/i);
    if (saveMatch) {
        const ability = ABILITY_MAP[saveMatch[1].toLowerCase()];
        // Try to extract DC calculation
        let dcCalculation;
        const dcMatch = text.match(/DC\s+(\d+)/i);
        if (dcMatch) {
            dcCalculation = `DC ${dcMatch[1]}`;
        }
        else if (text.toLowerCase().includes('spell save dc')) {
            dcCalculation = 'spell save DC';
        }
        else {
            const customDC = text.match(/DC\s+(?:equals?\s+)?(\d+\s*\+[^.]+)/i);
            if (customDC) {
                dcCalculation = customDC[1].trim();
            }
        }
        return { ability, dcCalculation };
    }
    return undefined;
}
/**
 * Parse damage from text like "2d6 Necrotic damage"
 */
function parseActionDamage(text) {
    const damages = [];
    // Pattern: "1d8 Necrotic damage" or "2d6 + 5 Fire damage"
    const damagePattern = /(\d+d\d+)(?:\s*\+\s*(\d+))?\s+(\w+)\s+damage/gi;
    let match;
    while ((match = damagePattern.exec(text)) !== null) {
        const diceStr = match[1] + (match[2] ? `+${match[2]}` : '');
        const typeStr = match[3].toLowerCase();
        const parsed = (0, types_1.parseDiceExpression)(diceStr);
        if (parsed && DAMAGE_TYPES.includes(typeStr)) {
            damages.push({
                dice: parsed,
                type: typeStr,
            });
        }
    }
    return damages;
}
/**
 * Parse healing from text like "regain 1d8 Hit Points"
 */
function parseActionHealing(text) {
    // Pattern: "regain Xd8 Hit Points" or "restore Xd6 + modifier Hit Points"
    const healMatch = text.match(/(?:regain|restore|heal)[^.]*?(\d+d\d+)/i);
    if (healMatch) {
        return (0, types_1.parseDiceExpression)(healMatch[1]) ?? undefined;
    }
    return undefined;
}
/**
 * Parse conditions applied from text
 */
function parseActionConditions(text) {
    const conditions = [];
    const lower = text.toLowerCase();
    for (const cond of CONDITIONS) {
        if (lower.includes(cond + ' condition') || lower.includes('has the ' + cond)) {
            conditions.push(cond);
        }
    }
    return conditions;
}
/**
 * Parse resource cost from text like "expend 1 Focus Point"
 */
function parseResourceCost(text) {
    // Pattern: "expend X Resource" or "use X of your Resource"
    const patterns = [
        /expend\s+(\d+|a|one)\s+(?:use(?:s)?\s+of\s+)?(?:your\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+use)?(?:\.|,|$)/i,
        /expend\s+a\s+use\s+of\s+(?:your\s+)?(?:class's\s+)?([A-Z][a-zA-Z\s]+)/i,
        /use\s+(?:a\s+use\s+of\s+)?(?:your\s+)?([A-Z][a-zA-Z\s]+)/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            let amount = 1;
            let resource = '';
            if (match[2]) {
                // First pattern with amount
                const amountStr = match[1].toLowerCase();
                amount = amountStr === 'a' || amountStr === 'one' ? 1 : parseInt(amountStr, 10);
                resource = match[2].trim();
            }
            else {
                resource = match[1].trim();
            }
            // Clean up resource name
            resource = resource.replace(/\s+$/, '').replace(/,$/, '');
            if (resource) {
                const cost = { resource, amount };
                // Check for alternative spell slot cost
                const slotMatch = text.match(/expend(?:ing)?\s+a\s+(?:level\s+)?(\d+)\s+spell\s+slot/i);
                if (slotMatch) {
                    cost.alternativeSpellSlot = parseInt(slotMatch[1], 10);
                }
                return cost;
            }
        }
    }
    return undefined;
}
/**
 * Parse scaling information from text
 */
function parseActionScaling(text) {
    // Look for level-based scaling
    const scaleMatch = text.match(/(?:additional|extra)\s+(?:d\d+|damage|die)[^.]*?(?:level|levels)\s+([\d,\s]+(?:and\s+\d+)?)/i);
    const diceMatch = text.match(/(\d+d\d+)[^.]*?levels?\s+(\d+)\s*\((\d+d\d+)\)/i);
    if (scaleMatch || diceMatch) {
        const scaling = {
            description: text.substring(0, 200), // First 200 chars as description
        };
        // Extract levels
        const levelMatches = text.matchAll(/level[s]?\s+(\d+)/gi);
        const levels = [];
        for (const m of levelMatches) {
            levels.push(parseInt(m[1], 10));
        }
        if (levels.length > 0) {
            scaling.levels = levels;
        }
        return scaling;
    }
    return undefined;
}
/**
 * Parse a feature action from a bold-prefixed sub-feature text
 */
function parseFeatureAction(name, text) {
    const activation = parseActivationType(text);
    // If no activation type found, this might not be an action
    if (!activation) {
        return null;
    }
    const action = {
        name,
        description: text,
        activation,
    };
    // Parse optional properties
    const range = parseActionRange(text);
    if (range)
        action.range = range;
    const savingThrow = parseActionSavingThrow(text);
    if (savingThrow)
        action.savingThrow = savingThrow;
    const damage = parseActionDamage(text);
    if (damage.length > 0)
        action.damage = damage;
    const healing = parseActionHealing(text);
    if (healing)
        action.healing = healing;
    const conditions = parseActionConditions(text);
    if (conditions.length > 0)
        action.conditionsApplied = conditions;
    const cost = parseResourceCost(text);
    if (cost)
        action.cost = cost;
    const scaling = parseActionScaling(text);
    if (scaling)
        action.scaling = scaling;
    // Parse duration
    const durationMatch = text.match(/for\s+(\d+\s+(?:minute|hour|round|turn)[s]?|until[^.]+)/i);
    if (durationMatch) {
        action.duration = durationMatch[1].trim();
    }
    return action;
}
/**
 * Extract feature actions from a feature description.
 * Looks for bold-prefixed sub-features like "**Divine Spark.** ..."
 */
/**
 * Extract feature actions from a feature description.
 * Looks for bold-prefixed sub-features like "**Divine Spark.** ..."
 * Also detects when the feature itself is an action.
 *
 * @param description The feature description text
 * @param featureName The name of the parent feature (used when feature itself is an action)
 */
function extractFeatureActions(description, featureName) {
    const actions = [];
    // Pattern for bold sub-features: **Name.** Description
    const subFeaturePattern = /\*\*([^*]+)\.\*\*\s*([^*]+?)(?=\*\*[^*]+\.\*\*|$)/gs;
    let match;
    while ((match = subFeaturePattern.exec(description)) !== null) {
        const name = match[1].trim();
        const text = match[2].trim();
        // Skip if this is just a section header or short description
        if (text.length < 20)
            continue;
        const action = parseFeatureAction(name, text);
        if (action) {
            actions.push(action);
        }
    }
    // If no sub-features found, check if the main feature description itself is an action
    if (actions.length === 0 && featureName) {
        const activation = parseActivationType(description);
        if (activation) {
            // This feature itself is an action - parse it with the feature name
            const mainAction = parseFeatureAction(featureName, description);
            if (mainAction) {
                // Mark it as the main action (name matches feature name)
                mainAction.name = featureName;
                actions.push(mainAction);
            }
        }
    }
    return actions;
}
function parseAbilities(text) {
    const abilities = [];
    for (const [name, key] of Object.entries(ABILITY_MAP)) {
        if (text.toLowerCase().includes(name)) {
            abilities.push(key);
        }
    }
    return abilities;
}
function parseDie(text) {
    const match = text.match(/d(\d+)/i);
    if (match) {
        const num = parseInt(match[1], 10);
        if ([4, 6, 8, 10, 12, 20, 100].includes(num)) {
            return `d${num}`;
        }
    }
    return null;
}
function parseSkillChoices(text) {
    // Format: "Choose 2: Acrobatics, Athletics, History, Insight, Religion, or Stealth"
    const countMatch = text.match(/Choose\s+(\d+)/i);
    const count = countMatch ? parseInt(countMatch[1], 10) : 2;
    const skills = [];
    const lower = text.toLowerCase();
    for (const [name, skill] of Object.entries(SKILL_MAP)) {
        if (lower.includes(name)) {
            skills.push(skill);
        }
    }
    return { count, skills };
}
function parseWeaponProficiencies(text) {
    const profs = [];
    const lower = text.toLowerCase();
    if (lower.includes('simple') && lower.includes('martial')) {
        if (lower.includes('finesse') || lower.includes('light')) {
            // Specific restriction
            const restriction = lower.includes('finesse') ? 'Finesse' : 'Light';
            profs.push({ category: 'simple' });
            profs.push({ category: 'martial', restriction });
        }
        else {
            profs.push({ category: 'simple' });
            profs.push({ category: 'martial' });
        }
    }
    else if (lower.includes('simple')) {
        profs.push({ category: 'simple' });
    }
    else if (lower.includes('martial')) {
        profs.push({ category: 'martial' });
    }
    return profs;
}
function parseArmorProficiencies(text) {
    const armor = [];
    const lower = text.toLowerCase();
    if (lower.includes('light'))
        armor.push('light');
    if (lower.includes('medium'))
        armor.push('medium');
    if (lower.includes('heavy'))
        armor.push('heavy');
    if (lower.includes('shield'))
        armor.push('shields');
    return armor;
}
function parseToolProficiencies(text) {
    if (!text || text.toLowerCase() === 'none')
        return undefined;
    return [text.trim()];
}
function parseMarkdownTable(lines, startIdx) {
    const rows = [];
    let headers = [];
    let i = startIdx;
    // Find table start (line with |)
    while (i < lines.length && !lines[i].includes('|')) {
        i++;
    }
    if (i >= lines.length)
        return { rows: [], endIdx: i };
    // Parse header row
    const headerLine = lines[i];
    headers = headerLine
        .split('|')
        .map((h) => h.trim())
        .filter((h) => h);
    i++;
    // Skip separator row
    if (i < lines.length && lines[i].includes('---')) {
        i++;
    }
    // Parse data rows
    while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i]
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c !== '');
        if (cells.length > 0) {
            const row = {};
            headers.forEach((header, idx) => {
                row[header] = cells[idx] || '';
            });
            rows.push(row);
        }
        i++;
    }
    return { rows, endIdx: i };
}
function parseCoreTraitsTable(lines, startIdx) {
    const { rows } = parseMarkdownTable(lines, startIdx);
    const traits = {};
    for (const row of rows) {
        const key = Object.keys(row)[0];
        const value = row[Object.keys(row)[1]] || '';
        if (!key)
            continue;
        const keyLower = key.toLowerCase();
        if (keyLower.includes('primary ability')) {
            const abilities = parseAbilities(value);
            traits.primaryAbility = abilities.length === 1 ? abilities[0] : abilities;
        }
        else if (keyLower.includes('hit point die')) {
            const die = parseDie(value);
            if (die)
                traits.hitDie = die;
        }
        else if (keyLower.includes('saving throw')) {
            const saves = parseAbilities(value);
            if (saves.length >= 2) {
                traits.savingThrows = [saves[0], saves[1]];
            }
        }
        else if (keyLower.includes('skill proficiencies')) {
            const { count, skills } = parseSkillChoices(value);
            traits.skillChoiceCount = count;
            traits.skillChoices = skills;
        }
        else if (keyLower.includes('weapon proficiencies')) {
            traits.weaponProficiencies = parseWeaponProficiencies(value);
        }
        else if (keyLower.includes('armor training') || keyLower.includes('armor proficiencies')) {
            traits.armorProficiencies = parseArmorProficiencies(value);
        }
        else if (keyLower.includes('tool proficiencies')) {
            traits.toolProficiencies = parseToolProficiencies(value);
        }
        else if (keyLower.includes('starting equipment')) {
            // Parse options A and B
            const optA = value.match(/\(A\)\s*([^;]+)/i)?.[1]?.trim() || value;
            const optB = value.match(/\(B\)\s*(.+)/i)?.[1]?.trim() || '';
            traits.startingEquipment = { optionA: optA, optionB: optB };
        }
    }
    // Set defaults for missing values
    if (!traits.hitDie)
        traits.hitDie = 'd8';
    if (!traits.savingThrows)
        traits.savingThrows = ['str', 'con'];
    if (!traits.skillChoiceCount)
        traits.skillChoiceCount = 2;
    if (!traits.skillChoices)
        traits.skillChoices = [];
    if (!traits.weaponProficiencies)
        traits.weaponProficiencies = [];
    if (!traits.armorProficiencies)
        traits.armorProficiencies = [];
    if (!traits.startingEquipment)
        traits.startingEquipment = { optionA: '', optionB: '' };
    if (!traits.primaryAbility)
        traits.primaryAbility = 'str';
    return traits;
}
function parseFeaturesTable(lines, startIdx, className) {
    const { rows, endIdx } = parseMarkdownTable(lines, startIdx);
    const progression = [];
    const resourceColumns = [];
    const scalingColumns = [];
    // Identify special columns based on class
    const resourceNames = {
        barbarian: ['Rages'],
        monk: ['Focus Points'],
        sorcerer: ['Sorcery Points'],
        warlock: ['Spell Slots', 'Eldritch Invocations'],
        paladin: ['Channel Divinity'],
        cleric: ['Channel Divinity'],
    };
    const scalingNames = {
        barbarian: ['Rage Damage', 'Weapon Mastery'],
        rogue: ['Sneak Attack'],
        monk: ['Martial Arts', 'Unarmored Movement'],
    };
    for (const row of rows) {
        const level = parseInt(row['Level'], 10);
        if (isNaN(level))
            continue;
        const profBonus = parseInt(row['Proficiency Bonus']?.replace('+', ''), 10) || 2;
        const featuresStr = row['Class Features'] || '';
        const features = featuresStr
            .split(',')
            .map((f) => f.trim())
            .filter((f) => f && f !== '—');
        const prog = {
            level,
            proficiencyBonus: profBonus,
            features,
        };
        // Parse cantrips and prepared spells
        if (row['Cantrips']) {
            const cantrips = parseInt(row['Cantrips'], 10);
            if (!isNaN(cantrips))
                prog.cantrips = cantrips;
        }
        if (row['Prepared Spells']) {
            const prepared = parseInt(row['Prepared Spells'], 10);
            if (!isNaN(prepared))
                prog.preparedSpells = prepared;
        }
        // Parse spell slots (columns 1-9)
        const spellSlots = [];
        for (let slotLevel = 1; slotLevel <= 9; slotLevel++) {
            const slotVal = row[String(slotLevel)];
            if (slotVal && slotVal !== '—') {
                spellSlots.push(parseInt(slotVal, 10) || 0);
            }
        }
        if (spellSlots.length > 0) {
            prog.spellSlots = spellSlots;
        }
        // Parse slot level for Warlock
        if (row['Slot Level']) {
            const slotLevel = parseInt(row['Slot Level'], 10);
            if (!isNaN(slotLevel))
                prog.pactSlotLevel = slotLevel;
        }
        // Parse class-specific resources
        const resources = {};
        for (const col of Object.keys(row)) {
            if (['Level', 'Proficiency Bonus', 'Class Features', 'Cantrips', 'Prepared Spells', 'Slot Level'].includes(col))
                continue;
            if (/^[1-9]$/.test(col))
                continue; // Skip spell slot columns
            const val = row[col];
            if (val && val !== '—') {
                // Check if it's a number or dice expression
                if (/^\+?\d+/.test(val) || /d\d+/.test(val) || /^\d+\s*ft/.test(val)) {
                    resources[col] = val;
                }
            }
        }
        if (Object.keys(resources).length > 0) {
            prog.resources = resources;
        }
        progression.push(prog);
    }
    // Extract resources and scaling values from progression
    const resources = [];
    const scalingValues = [];
    if (progression.length > 0 && progression[0].resources) {
        const allResourceKeys = new Set();
        progression.forEach((p) => {
            if (p.resources) {
                Object.keys(p.resources).forEach((k) => allResourceKeys.add(k));
            }
        });
        for (const key of allResourceKeys) {
            const values = progression.map((p) => p.resources?.[key] ?? null);
            // Determine if this is a resource (count) or scaling value (dice/modifier)
            const isScaling = values.some((v) => typeof v === 'string' && (/d\d+/.test(v) || /^\+\d+/.test(v) || /ft\.?$/.test(String(v))));
            if (isScaling) {
                scalingValues.push({
                    name: key,
                    valueByLevel: values.map((v) => String(v ?? '—')),
                });
            }
            else {
                const counts = values.map((v) => {
                    if (v === null || v === '—')
                        return null;
                    const num = parseInt(String(v), 10);
                    return isNaN(num) ? null : num;
                });
                // Only add if there are actual values
                if (counts.some((c) => c !== null)) {
                    resources.push({
                        name: key,
                        countByLevel: counts,
                        recovery: key.toLowerCase().includes('rage') ? 'longRest' : 'longRest',
                    });
                }
            }
        }
    }
    return { progression, resources, scalingValues, endIdx };
}
function parseFeatures(lines, startIdx) {
    const features = [];
    let i = startIdx;
    while (i < lines.length) {
        const line = lines[i];
        // Match "#### Level X: Feature Name" or "### Level X: Feature Name"
        const featureMatch = line.match(/^#{3,4}\s+Level\s+(\d+):\s+(.+)/i);
        if (featureMatch) {
            const level = parseInt(featureMatch[1], 10);
            const name = featureMatch[2].trim();
            // Collect description until next feature or section
            let description = '';
            i++;
            while (i < lines.length) {
                const nextLine = lines[i];
                // Stop at next feature, subclass, or major section
                if (nextLine.match(/^#{2,4}\s+Level\s+\d+:/i) ||
                    nextLine.match(/^#{2,3}\s+\w+\s+Subclass/i) ||
                    nextLine.match(/^#{2,3}\s+\w+\s+Spell\s+List/i) ||
                    nextLine.match(/^#{2,3}\s+Eldritch\s+Invocation/i) ||
                    nextLine.match(/^#{2,3}\s+Metamagic\s+Options/i)) {
                    break;
                }
                description += nextLine + '\n';
                i++;
            }
            const isSubclassFeature = name.toLowerCase().includes('subclass feature') || name.toLowerCase() === 'subclass feature';
            const trimmedDesc = description.trim();
            // Extract action-like sub-features (pass feature name for features that are themselves actions)
            const actions = extractFeatureActions(trimmedDesc, name);
            const feature = {
                name,
                level,
                description: trimmedDesc,
                isSubclassFeature: isSubclassFeature || undefined,
            };
            if (actions.length > 0) {
                feature.actions = actions;
            }
            features.push(feature);
        }
        else {
            i++;
        }
    }
    return features;
}
function parseSubclass(lines, startIdx, className) {
    // Find subclass header: "### Barbarian Subclass: Path of the Berserker" or "### Rogue Subclass: Thief"
    let i = startIdx;
    let subclassName = '';
    let description = '';
    const headerMatch = lines[i]?.match(/^###\s+\w+\s+Subclass:\s+(.+)/i);
    if (!headerMatch)
        return null;
    subclassName = headerMatch[1].trim();
    i++;
    // Get description (italic line)
    while (i < lines.length && !lines[i].startsWith('####')) {
        const line = lines[i].trim();
        if (line.startsWith('*') && line.endsWith('*')) {
            description = line.slice(1, -1);
        }
        i++;
    }
    // Parse subclass features
    const features = [];
    while (i < lines.length) {
        const line = lines[i];
        // Stop at next subclass or major section
        if (line.match(/^###\s+\w+\s+Subclass:/i) || line.match(/^##\s+/)) {
            break;
        }
        const featureMatch = line.match(/^####\s+Level\s+(\d+):\s+(.+)/i);
        if (featureMatch) {
            const level = parseInt(featureMatch[1], 10);
            const name = featureMatch[2].trim();
            let featureDesc = '';
            i++;
            while (i < lines.length) {
                const nextLine = lines[i];
                if (nextLine.match(/^#{3,4}\s+Level\s+\d+:/i) || nextLine.match(/^###\s+/)) {
                    break;
                }
                featureDesc += nextLine + '\n';
                i++;
            }
            const trimmedDesc = featureDesc.trim();
            const actions = extractFeatureActions(trimmedDesc, name);
            const feature = {
                name,
                level,
                description: trimmedDesc,
            };
            if (actions.length > 0) {
                feature.actions = actions;
            }
            features.push(feature);
        }
        else {
            i++;
        }
    }
    const id = subclassName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return {
        id,
        name: subclassName,
        className,
        description,
        features,
    };
}
function parseSpellList(lines, startIdx) {
    const spellList = {};
    let i = startIdx;
    let currentLevel = 0;
    while (i < lines.length) {
        const line = lines[i];
        // Stop at subclass section
        if (line.match(/^###\s+\w+\s+Subclass:/i)) {
            break;
        }
        // Match level headers like "Table: Cantrips (Level 0 Wizard Spells)" or "Table: Level 1 Wizard Spells"
        const levelMatch = line.match(/Level\s+(\d+)/i) || line.match(/Cantrips/i);
        if (levelMatch) {
            if (line.toLowerCase().includes('cantrip')) {
                currentLevel = 0;
            }
            else {
                currentLevel = parseInt(levelMatch[1], 10);
            }
            spellList[currentLevel] = [];
        }
        // Parse spell table rows
        if (line.startsWith('|') && !line.includes('---') && !line.toLowerCase().includes('spell') && !line.toLowerCase().includes('school')) {
            const cells = line.split('|').map((c) => c.trim()).filter((c) => c);
            if (cells.length > 0 && cells[0]) {
                const spellName = cells[0].replace(/\*/g, '').trim();
                if (spellName && !spellList[currentLevel]?.includes(spellName)) {
                    if (!spellList[currentLevel])
                        spellList[currentLevel] = [];
                    spellList[currentLevel].push(spellName);
                }
            }
        }
        i++;
    }
    return spellList;
}
function parseClassOptions(lines, startIdx, optionType) {
    const options = [];
    let i = startIdx;
    while (i < lines.length) {
        const line = lines[i];
        // Stop at subclass or end of section
        if (line.match(/^###\s+\w+\s+Subclass:/i) || line.match(/^##\s+/)) {
            break;
        }
        // Match option header: "#### Agonizing Blast"
        const optionMatch = line.match(/^####\s+(.+)/);
        if (optionMatch) {
            const name = optionMatch[1].trim();
            let description = '';
            let prerequisites;
            let levelRequirement;
            let repeatable = false;
            let cost;
            i++;
            while (i < lines.length) {
                const nextLine = lines[i];
                if (nextLine.match(/^####\s+/) || nextLine.match(/^###\s+/)) {
                    break;
                }
                // Check for prerequisites
                const prereqMatch = nextLine.match(/\*Prerequisite:\s*(.+)\*/i);
                if (prereqMatch) {
                    prerequisites = prereqMatch[1].trim();
                    // Extract level requirement from prerequisites
                    const lvlMatch = prerequisites.match(/Level\s+(\d+)\+/i);
                    if (lvlMatch) {
                        levelRequirement = parseInt(lvlMatch[1], 10);
                    }
                }
                // Check for repeatable
                if (nextLine.toLowerCase().includes('**repeatable.**')) {
                    repeatable = true;
                }
                // Check for cost (Metamagic)
                const costMatch = nextLine.match(/(\d+)\s+Sorcery\s+Points?/i);
                if (costMatch) {
                    cost = parseInt(costMatch[1], 10);
                }
                description += nextLine + '\n';
                i++;
            }
            options.push({
                name,
                description: description.trim(),
                levelRequirement,
                prerequisites,
                repeatable: repeatable || undefined,
                cost,
            });
        }
        else {
            i++;
        }
    }
    return options;
}
function determineSpellcastingConfig(className, lines) {
    const fullCasters = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'];
    const halfCasters = ['paladin', 'ranger'];
    const pactCasters = ['warlock'];
    if (fullCasters.includes(className)) {
        const abilityMap = {
            bard: 'cha',
            cleric: 'wis',
            druid: 'wis',
            sorcerer: 'cha',
            wizard: 'int',
            barbarian: 'str',
            fighter: 'str',
            monk: 'wis',
            paladin: 'cha',
            ranger: 'wis',
            rogue: 'dex',
            warlock: 'cha',
        };
        return {
            type: 'full',
            ability: abilityMap[className],
            startLevel: 1,
            ritualCasting: className === 'wizard' || className === 'cleric' || className === 'druid',
            focusType: className === 'cleric' ? 'holy' : className === 'druid' ? 'druidic' : 'arcane',
            usesSpellbook: className === 'wizard',
        };
    }
    if (halfCasters.includes(className)) {
        return {
            type: 'half',
            ability: className === 'paladin' ? 'cha' : 'wis',
            startLevel: 1,
            focusType: className === 'paladin' ? 'holy' : 'druidic',
        };
    }
    if (pactCasters.includes(className)) {
        return {
            type: 'pact',
            ability: 'cha',
            startLevel: 1,
            focusType: 'arcane',
            recoversOnShortRest: true,
        };
    }
    return undefined;
}
function parseClassFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    // Find class name from first ## header
    let className = null;
    let displayName = '';
    for (const line of lines) {
        const match = line.match(/^##\s+(\w+)/);
        if (match) {
            displayName = match[1].trim();
            className = CLASS_NAME_MAP[displayName.toLowerCase()] || null;
            break;
        }
    }
    if (!className) {
        console.warn(`Could not determine class name from: ${filePath}`);
        return null;
    }
    console.log(`Parsing ${displayName}...`);
    // Find Core Traits table
    let coreTraitsIdx = -1;
    let featuresTableIdx = -1;
    let featuresStartIdx = -1;
    let subclassIdx = -1;
    let spellListIdx = -1;
    let optionsIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes('core') && line.toLowerCase().includes('traits')) {
            coreTraitsIdx = i;
        }
        else if (line.toLowerCase().includes('features') && line.includes('Table:')) {
            featuresTableIdx = i;
        }
        else if (line.match(/^#{3,4}\s+Level\s+1:/i) && featuresStartIdx === -1) {
            featuresStartIdx = i;
        }
        else if (line.match(/^###\s+\w+\s+Subclass:/i) && subclassIdx === -1) {
            subclassIdx = i;
        }
        else if (line.toLowerCase().includes('spell list') && spellListIdx === -1) {
            spellListIdx = i;
        }
        else if ((line.toLowerCase().includes('eldritch invocation options') ||
            line.toLowerCase().includes('metamagic options')) &&
            optionsIdx === -1) {
            optionsIdx = i;
        }
    }
    // Parse core traits
    const coreTraits = coreTraitsIdx >= 0 ? parseCoreTraitsTable(lines, coreTraitsIdx) : null;
    if (!coreTraits) {
        console.warn(`Could not parse core traits for ${displayName}`);
        return null;
    }
    // Parse features table
    const { progression, resources, scalingValues } = featuresTableIdx >= 0
        ? parseFeaturesTable(lines, featuresTableIdx, className)
        : { progression: [], resources: [], scalingValues: [] };
    // Parse class features
    const features = featuresStartIdx >= 0 ? parseFeatures(lines, featuresStartIdx) : [];
    // Determine subclass feature levels from features
    const subclassFeatureLevels = features
        .filter((f) => f.isSubclassFeature || f.name.toLowerCase().includes('subclass'))
        .map((f) => f.level);
    // If no explicit subclass features found, use common patterns
    if (subclassFeatureLevels.length === 0) {
        subclassFeatureLevels.push(3); // Most classes get subclass at 3
    }
    // Parse subclass
    const subclasses = [];
    if (subclassIdx >= 0) {
        const subclass = parseSubclass(lines, subclassIdx, className);
        if (subclass) {
            subclasses.push(subclass);
        }
    }
    // Parse spell list
    const spellList = spellListIdx >= 0 ? parseSpellList(lines, spellListIdx) : undefined;
    // Parse class options (invocations, metamagic)
    const classOptions = optionsIdx >= 0 ? parseClassOptions(lines, optionsIdx, '') : undefined;
    // Determine spellcasting config
    const spellcasting = determineSpellcastingConfig(className, lines);
    const classDef = {
        id: className,
        name: displayName,
        coreTraits,
        levelProgression: progression,
        features,
        subclasses,
        subclassFeatureLevels: [...new Set(subclassFeatureLevels)].sort((a, b) => a - b),
    };
    if (spellcasting)
        classDef.spellcasting = spellcasting;
    if (resources.length > 0)
        classDef.resources = resources;
    if (scalingValues.length > 0)
        classDef.scalingValues = scalingValues;
    if (spellList && Object.keys(spellList).length > 0)
        classDef.spellList = spellList;
    if (classOptions && classOptions.length > 0)
        classDef.classOptions = classOptions;
    return classDef;
}
function main() {
    const srcDir = path.join(__dirname, '..', 'src');
    const classesDir = path.join(srcDir, '03_Classes');
    const outputPath = path.join(srcDir, 'classes.json');
    console.log(`Reading classes from: ${classesDir}`);
    const classFiles = fs.readdirSync(classesDir).filter((f) => f.endsWith('.md') && f !== '00_Classes.md');
    console.log(`Found ${classFiles.length} class files`);
    const classes = [];
    for (const file of classFiles) {
        const filePath = path.join(classesDir, file);
        const classDef = parseClassFile(filePath);
        if (classDef) {
            classes.push(classDef);
        }
    }
    // Sort by class name
    classes.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Successfully parsed ${classes.length} classes`);
    fs.writeFileSync(outputPath, JSON.stringify(classes, null, 2));
    console.log(`Wrote classes to: ${outputPath}`);
}
main();
