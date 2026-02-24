"use strict";
/**
 * V2 spell parser: 07_Spells.md → spells.v2.json
 *
 * Produces a v2 artifact with:
 *   - stable key/slug/source fields
 *   - raw source blocks (sourceFile, startLine, endLine, markdown)
 *   - same structured mechanics as v1 but without synthetic child IDs
 *   - fixed duration model (concentration and untilDispelled are mutually exclusive)
 */
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
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SOURCE_FILE = '07_Spells.md';
const SCHOOLS = [
    'abjuration',
    'conjuration',
    'divination',
    'enchantment',
    'evocation',
    'illusion',
    'necromancy',
    'transmutation',
];
const CLASSES = [
    'bard',
    'cleric',
    'druid',
    'paladin',
    'ranger',
    'sorcerer',
    'warlock',
    'wizard',
];
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
// ---------------------------------------------------------------------------
// Slug / ID generation
// ---------------------------------------------------------------------------
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
// ---------------------------------------------------------------------------
// Parsing helpers (same logic as v1, adapted for v2 where needed)
// ---------------------------------------------------------------------------
function parseSchool(text) {
    const lower = text.toLowerCase();
    for (const school of SCHOOLS) {
        if (lower.includes(school))
            return school;
    }
    return null;
}
function parseClasses(text) {
    const classes = [];
    const lower = text.toLowerCase();
    for (const cls of CLASSES) {
        if (lower.includes(cls))
            classes.push(cls);
    }
    return classes;
}
function parseLevelAndSchool(line) {
    const stripped = line.replace(/^\*+|\*+$/g, '').trim();
    const cantripMatch = stripped.match(/^(\w+)\s+Cantrip\s*\(([^)]+)\)/i);
    if (cantripMatch) {
        const school = parseSchool(cantripMatch[1]);
        const classes = parseClasses(cantripMatch[2]);
        if (school)
            return { level: 0, school, classes };
    }
    const levelMatch = stripped.match(/^Level\s+(\d+)\s+(\w+)\s*\(([^)]+)\)/i);
    if (levelMatch) {
        const level = parseInt(levelMatch[1], 10);
        const school = parseSchool(levelMatch[2]);
        const classes = parseClasses(levelMatch[3]);
        if (school)
            return { level, school, classes };
    }
    return null;
}
function parseCastingTime(text) {
    const lower = text.toLowerCase().trim();
    const ritual = lower.includes('ritual');
    const reactionMatch = text.match(/reaction,?\s*which\s+you\s+take\s+(.+)/i);
    if (reactionMatch || lower.startsWith('reaction')) {
        return {
            type: 'reaction',
            trigger: reactionMatch ? reactionMatch[1].trim() : undefined,
        };
    }
    const bonusMatch = text.match(/bonus\s+action,?\s*which\s+you\s+take\s+(.+)/i);
    if (bonusMatch || lower.includes('bonus action')) {
        return {
            type: 'bonusAction',
            trigger: bonusMatch ? bonusMatch[1].trim() : undefined,
        };
    }
    const minuteMatch = lower.match(/(\d+)\s*minute/);
    if (minuteMatch) {
        return { type: 'time', minutes: parseInt(minuteMatch[1], 10), ritual };
    }
    const hourMatch = lower.match(/(\d+)\s*hour/);
    if (hourMatch) {
        return { type: 'time', minutes: parseInt(hourMatch[1], 10) * 60, ritual };
    }
    return { type: 'action', ritual: ritual || undefined };
}
function parseRange(text) {
    const lower = text.toLowerCase().trim();
    if (lower === 'self' || lower.startsWith('self'))
        return { type: 'self' };
    if (lower === 'touch')
        return { type: 'touch' };
    if (lower === 'sight')
        return { type: 'sight' };
    if (lower === 'unlimited' || lower.includes('unlimited'))
        return { type: 'unlimited' };
    const distMatch = text.match(/(\d+)\s*(?:feet|ft\.?)/i);
    if (distMatch)
        return { type: 'distance', feet: parseInt(distMatch[1], 10) };
    const mileMatch = text.match(/(\d+)\s*mile/i);
    if (mileMatch)
        return { type: 'distance', feet: parseInt(mileMatch[1], 10) * 5280 };
    return { type: 'self' };
}
function parseComponents(text) {
    const components = { verbal: false, somatic: false };
    const upper = text.toUpperCase();
    if (upper.includes('V'))
        components.verbal = true;
    if (upper.includes('S'))
        components.somatic = true;
    const materialMatch = text.match(/M\s*\(([^)]+)\)/i);
    if (materialMatch) {
        const matDesc = materialMatch[1].trim();
        const material = { description: matDesc };
        const costMatch = matDesc.match(/worth\s+(\d+)\+?\s*GP/i);
        if (costMatch)
            material.cost = parseInt(costMatch[1], 10);
        if (matDesc.toLowerCase().includes('consume'))
            material.consumed = true;
        components.material = material;
    }
    else if (upper.includes('M')) {
        components.material = { description: 'unspecified material' };
    }
    return components;
}
function parseDuration(text) {
    const lower = text.toLowerCase().trim();
    if (lower === 'instantaneous')
        return { type: 'instantaneous' };
    // "Concentration, up to X" → concentration type
    const concMatch = text.match(/concentration,?\s*up\s*to\s*(.+)/i);
    if (concMatch) {
        return { type: 'concentration', maxDuration: concMatch[1].trim() };
    }
    // "Concentration, until dispelled" → concentration type (mutually exclusive with untilDispelled)
    if (lower.includes('concentration') && lower.includes('until dispelled')) {
        return { type: 'concentration', maxDuration: 'until dispelled' };
    }
    // "Until dispelled" (without concentration)
    if (lower.includes('until dispelled')) {
        return { type: 'untilDispelled' };
    }
    if (lower.match(/\d+\s*(minute|hour|day|round|year)/)) {
        return { type: 'time', duration: text.trim() };
    }
    return { type: 'special', description: text.trim() };
}
function parseDamageFromText(text) {
    const damages = [];
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
function parseAreaOfEffect(text) {
    const sphereMatch = text.match(/(\d+)-foot(?:-radius)?\s*sphere/i);
    if (sphereMatch)
        return { shape: 'sphere', size: parseInt(sphereMatch[1], 10) };
    const coneMatch = text.match(/(\d+)-foot\s*cone/i);
    if (coneMatch)
        return { shape: 'cone', size: parseInt(coneMatch[1], 10) };
    const cubeMatch = text.match(/(\d+)-foot\s*cube/i);
    if (cubeMatch)
        return { shape: 'cube', size: parseInt(cubeMatch[1], 10) };
    const lineMatch = text.match(/(\d+)-foot(?:-long)?(?:,?\s*(\d+)-foot-wide)?\s*line/i);
    if (lineMatch) {
        const aoe = { shape: 'line', size: parseInt(lineMatch[1], 10) };
        if (lineMatch[2])
            aoe.width = parseInt(lineMatch[2], 10);
        return aoe;
    }
    const cylinderMatch = text.match(/(\d+)-foot(?:-radius)?\s*cylinder/i);
    if (cylinderMatch)
        return { shape: 'cylinder', size: parseInt(cylinderMatch[1], 10) };
    const emanationMatch = text.match(/(\d+)-foot\s*emanation/i);
    if (emanationMatch)
        return { shape: 'emanation', size: parseInt(emanationMatch[1], 10) };
    return undefined;
}
function parseSavingThrow(text) {
    const abilityMap = {
        strength: 'str',
        dexterity: 'dex',
        constitution: 'con',
        intelligence: 'int',
        wisdom: 'wis',
        charisma: 'cha',
    };
    const saveMatch = text.match(/(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving\s+throw/i);
    if (saveMatch) {
        const ability = abilityMap[saveMatch[1].toLowerCase()];
        let onSuccess;
        let onFailure;
        const successMatch = text.match(/on\s+a\s+(?:successful\s+)?(?:save|success)[,:]?\s*([^.]+)/i);
        if (successMatch)
            onSuccess = successMatch[1].trim();
        const failMatch = text.match(/on\s+a\s+failed\s+(?:save|saving throw)[,:]?\s*([^.]+)/i);
        if (failMatch)
            onFailure = failMatch[1].trim();
        return { ability, onSuccess, onFailure };
    }
    return undefined;
}
function parseAttackType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('melee spell attack'))
        return 'melee';
    if (lower.includes('ranged spell attack'))
        return 'ranged';
    return undefined;
}
function parseHigherLevelScaling(text) {
    const match = text.match(/using\s+a\s+higher-level\s+spell\s+slot[._]*\s*(.+)/i);
    if (!match)
        return undefined;
    const description = match[1].trim();
    const scaling = { description };
    const damageMatch = description.match(/increases?\s+by\s+(\d+d\d+)/i);
    if (damageMatch) {
        const parsed = (0, types_1.parseDiceExpression)(damageMatch[1]);
        if (parsed)
            scaling.damagePerLevel = parsed;
    }
    const targetMatch = description.match(/(\d+)\s+additional\s+(target|creature|beast)/i);
    if (targetMatch)
        scaling.targetsPerLevel = parseInt(targetMatch[1], 10);
    return scaling;
}
function parseCantripScaling(text) {
    const match = text.match(/cantrip\s+upgrade[._]*\s*(.+)/i);
    if (!match)
        return undefined;
    const description = match[1].trim();
    const levels = [];
    const levelMatches = description.matchAll(/level[s]?\s+(\d+)/gi);
    for (const m of levelMatches) {
        levels.push(parseInt(m[1], 10));
    }
    if (levels.length === 0)
        levels.push(5, 11, 17);
    return { description, levels };
}
function parseHealing(text) {
    const healMatch = text.match(/regains?\s+(\d+d\d+)(?:\s*\+\s*(\d+))?\s+hit\s+points/i);
    if (healMatch) {
        const diceStr = healMatch[1] + (healMatch[2] ? `+${healMatch[2]}` : '');
        return (0, types_1.parseDiceExpression)(diceStr) ?? undefined;
    }
    return undefined;
}
function splitIntoSpellBlocks(content) {
    const allLines = content.split('\n');
    const blocks = [];
    let currentBlock = null;
    let inSpellDescriptions = false;
    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const lineNumber = i + 1; // 1-based
        if (line.startsWith('## Spell Descriptions')) {
            inSpellDescriptions = true;
            continue;
        }
        if (!inSpellDescriptions)
            continue;
        // Skip letter-group headers like "### A Spells"
        if (line.match(/^###\s+[A-Z]\s+Spells/))
            continue;
        // Spell header: #### SpellName
        const headerMatch = line.match(/^####\s+(?:\*\*)?(.+?)(?:\*\*)?$/);
        if (headerMatch) {
            if (currentBlock) {
                const lastLine = currentBlock.lines.length > 0
                    ? currentBlock.lines[currentBlock.lines.length - 1].lineNumber
                    : currentBlock.headerLineNumber;
                blocks.push({
                    name: currentBlock.name,
                    lines: currentBlock.lines.map((l) => l.text),
                    headerLineNumber: currentBlock.headerLineNumber,
                    endLineNumber: lastLine,
                    rawMarkdown: [
                        currentBlock.headerText,
                        ...currentBlock.lines.map((l) => l.text),
                    ].join('\n'),
                });
            }
            currentBlock = {
                name: headerMatch[1].trim(),
                headerLineNumber: lineNumber,
                headerText: line,
                lines: [],
            };
        }
        else if (currentBlock) {
            currentBlock.lines.push({ text: line, lineNumber });
        }
    }
    // Flush final block
    if (currentBlock) {
        const lastLine = currentBlock.lines.length > 0
            ? currentBlock.lines[currentBlock.lines.length - 1].lineNumber
            : currentBlock.headerLineNumber;
        blocks.push({
            name: currentBlock.name,
            lines: currentBlock.lines.map((l) => l.text),
            headerLineNumber: currentBlock.headerLineNumber,
            endLineNumber: lastLine,
            rawMarkdown: [
                currentBlock.headerText,
                ...currentBlock.lines.map((l) => l.text),
            ].join('\n'),
        });
    }
    return blocks;
}
// ---------------------------------------------------------------------------
// Parse a spell block into a SpellV2
// ---------------------------------------------------------------------------
function parseSpellBlock(block) {
    const { name, lines } = block;
    // Find the level/school/class line (first italic line)
    let levelSchoolLine = '';
    let levelSchoolIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('*') && !line.startsWith('**') && line.endsWith('*')) {
            levelSchoolLine = line;
            levelSchoolIdx = i;
            break;
        }
    }
    if (!levelSchoolLine) {
        console.warn(`Could not find level/school line for spell: ${name}`);
        return null;
    }
    const levelSchool = parseLevelAndSchool(levelSchoolLine);
    if (!levelSchool) {
        console.warn(`Could not parse level/school for spell: ${name}: ${levelSchoolLine}`);
        return null;
    }
    const slug = generateSlug(name);
    const spell = {
        key: `spell:${slug}`,
        slug,
        name,
        source: 'srd',
        level: levelSchool.level,
        school: levelSchool.school,
        classes: levelSchool.classes,
        castingTime: { type: 'action' },
        range: { type: 'self' },
        components: { verbal: false, somatic: false },
        duration: { type: 'instantaneous' },
        description: '',
        raw: {
            sourceFile: SOURCE_FILE,
            startLine: block.headerLineNumber,
            endLine: block.endLineNumber,
            markdown: block.rawMarkdown,
        },
    };
    // Parse attribute lines
    let descriptionStartIdx = -1;
    for (let i = levelSchoolIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('**Casting Time:**') || line.startsWith('**Casting Time**:')) {
            const value = line.replace(/\*\*Casting Time:?\*\*:?\s*/i, '').trim();
            spell.castingTime = parseCastingTime(value);
        }
        else if (line.startsWith('**Range:**') || line.startsWith('**Range**:')) {
            const value = line.replace(/\*\*Range:?\*\*:?\s*/i, '').trim();
            spell.range = parseRange(value);
        }
        else if (line.startsWith('**Components:**') ||
            line.startsWith('**Component:**') ||
            line.startsWith('**Components**:') ||
            line.startsWith('**Component**:')) {
            const value = line.replace(/\*\*Components?:?\*\*:?\s*/i, '').trim();
            spell.components = parseComponents(value);
        }
        else if (line.startsWith('**Duration:**') || line.startsWith('**Duration**:')) {
            const value = line.replace(/\*\*Duration:?\*\*:?\s*/i, '').trim();
            spell.duration = parseDuration(value);
        }
        else if (line && !line.startsWith('**') && !line.startsWith('|')) {
            descriptionStartIdx = i;
            break;
        }
    }
    // Collect description
    if (descriptionStartIdx !== -1) {
        const descLines = [];
        for (let i = descriptionStartIdx; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('> ####'))
                break;
            descLines.push(line);
        }
        spell.description = descLines.join('\n').trim();
    }
    // Parse additional properties from description
    const fullText = spell.description;
    const attackType = parseAttackType(fullText);
    if (attackType)
        spell.attackType = attackType;
    const savingThrow = parseSavingThrow(fullText);
    if (savingThrow)
        spell.savingThrow = savingThrow;
    const damage = parseDamageFromText(fullText);
    if (damage.length > 0)
        spell.damage = damage;
    const healing = parseHealing(fullText);
    if (healing)
        spell.healing = healing;
    const aoe = parseAreaOfEffect(fullText);
    if (aoe)
        spell.areaOfEffect = aoe;
    if (spell.level > 0) {
        const scaling = parseHigherLevelScaling(fullText);
        if (scaling)
            spell.higherLevelScaling = scaling;
    }
    if (spell.level === 0) {
        const cantripScale = parseCantripScaling(fullText);
        if (cantripScale)
            spell.cantripScaling = cantripScale;
    }
    return spell;
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
    const srcDir = path.join(__dirname, '..', 'src');
    const inputPath = path.join(srcDir, SOURCE_FILE);
    const outputPath = path.join(srcDir, 'spells.v2.json');
    console.log(`Reading spells from: ${inputPath}`);
    const content = fs.readFileSync(inputPath, 'utf-8');
    const blocks = splitIntoSpellBlocks(content);
    console.log(`Found ${blocks.length} spell blocks`);
    const spells = [];
    for (const block of blocks) {
        const spell = parseSpellBlock(block);
        if (spell)
            spells.push(spell);
    }
    console.log(`Successfully parsed ${spells.length} spells`);
    // Summary stats
    const cantrips = spells.filter((s) => s.level === 0).length;
    const leveled = spells.filter((s) => s.level > 0).length;
    const withDamage = spells.filter((s) => s.damage && s.damage.length > 0).length;
    const withSave = spells.filter((s) => s.savingThrow).length;
    const withAttack = spells.filter((s) => s.attackType).length;
    const withConcentration = spells.filter((s) => s.duration.type === 'concentration').length;
    console.log(`  Cantrips: ${cantrips}, Leveled: ${leveled}`);
    console.log(`  With damage: ${withDamage}, With save: ${withSave}, With attack: ${withAttack}`);
    console.log(`  Concentration: ${withConcentration}`);
    fs.writeFileSync(outputPath, JSON.stringify(spells, null, 2));
    console.log(`Wrote spells v2 to: ${outputPath}`);
}
main();
