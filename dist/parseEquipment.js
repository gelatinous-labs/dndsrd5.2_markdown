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
// Simple unique ID generator
let idCounter = 0;
function generateId(prefix) {
    return `${prefix}_${++idCounter}`;
}
// Valid damage types
const DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
];
// Weapon property mapping
const WEAPON_PROPERTY_MAP = {
    ammunition: 'ammunition',
    finesse: 'finesse',
    heavy: 'heavy',
    light: 'light',
    loading: 'loading',
    reach: 'reach',
    thrown: 'thrown',
    'two-handed': 'twoHanded',
    versatile: 'versatile',
};
// Weapon mastery mapping
const WEAPON_MASTERY_MAP = {
    cleave: 'cleave',
    graze: 'graze',
    nick: 'nick',
    push: 'push',
    sap: 'sap',
    slow: 'slow',
    topple: 'topple',
    vex: 'vex',
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
function parseCost(costStr) {
    const match = costStr.match(/(\d+(?:,\d+)?)\s*(CP|SP|EP|GP|PP)/i);
    if (!match)
        return undefined;
    const amount = parseInt(match[1].replace(',', ''), 10);
    const currencyMap = {
        cp: 'cp', sp: 'sp', ep: 'ep', gp: 'gp', pp: 'pp',
    };
    const currency = currencyMap[match[2].toLowerCase()];
    return { amount, currency };
}
function parseWeight(weightStr) {
    const match = weightStr.match(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*lb/i);
    if (!match)
        return undefined;
    // Handle fractions like "1/2 lb."
    if (match[1].includes('/')) {
        const [num, denom] = match[1].split('/');
        return parseInt(num, 10) / parseInt(denom, 10);
    }
    return parseFloat(match[1]);
}
function parseWeaponDamage(damageStr) {
    // Pattern: "1d8 Slashing" or "2d6 Bludgeoning"
    const match = damageStr.match(/(\d+d\d+)\s+(\w+)/i);
    if (!match)
        return undefined;
    const dice = (0, types_1.parseDiceExpression)(match[1]);
    if (!dice)
        return undefined;
    const typeStr = match[2].toLowerCase();
    if (!DAMAGE_TYPES.includes(typeStr))
        return undefined;
    return { dice, type: typeStr };
}
function parseWeaponProperties(propsStr) {
    const properties = [];
    let range;
    let versatileDamage;
    const parts = propsStr.split(',').map(p => p.trim().toLowerCase());
    for (const part of parts) {
        // Check for range notation like "Range (80/320)"
        const rangeMatch = part.match(/range\s*\((\d+)\/(\d+)\)/i);
        if (rangeMatch) {
            range = { normal: parseInt(rangeMatch[1], 10), long: parseInt(rangeMatch[2], 10) };
            continue;
        }
        // Check for thrown range like "Thrown (20/60)"
        const thrownMatch = part.match(/thrown\s*\((\d+)\/(\d+)\)/i);
        if (thrownMatch) {
            properties.push('thrown');
            range = { normal: parseInt(thrownMatch[1], 10), long: parseInt(thrownMatch[2], 10) };
            continue;
        }
        // Check for versatile damage like "Versatile (1d10)"
        const versatileMatch = part.match(/versatile\s*\((\d+d\d+)\)/i);
        if (versatileMatch) {
            properties.push('versatile');
            const vDice = (0, types_1.parseDiceExpression)(versatileMatch[1]);
            if (vDice) {
                // We'll need to get the damage type from the main damage
                versatileDamage = { dice: vDice, type: 'bludgeoning' }; // Will be overwritten
            }
            continue;
        }
        // Check for ammunition notation
        if (part.includes('ammunition')) {
            properties.push('ammunition');
            continue;
        }
        // Check for simple properties
        const prop = WEAPON_PROPERTY_MAP[part];
        if (prop) {
            properties.push(prop);
        }
    }
    return { properties, range, versatileDamage };
}
function parseWeaponFromTableRow(name, damage, properties, mastery, weight, cost, weaponType, attackType) {
    const damageInfo = parseWeaponDamage(damage);
    if (!damageInfo)
        return null;
    const propInfo = parseWeaponProperties(properties);
    const masteryLower = mastery.toLowerCase();
    const masteryValue = WEAPON_MASTERY_MAP[masteryLower];
    // If versatile, copy the damage type to versatile damage
    if (propInfo.versatileDamage) {
        propInfo.versatileDamage.type = damageInfo.type;
    }
    return {
        id: generateId('weapon'),
        name: name.trim(),
        itemType: 'equipment',
        equipmentCategory: 'weapon',
        weaponType,
        attackType,
        damage: damageInfo,
        versatileDamage: propInfo.versatileDamage,
        properties: propInfo.properties,
        range: propInfo.range,
        mastery: masteryValue,
        weight: parseWeight(weight),
        cost: parseCost(cost),
    };
}
function parseArmorFromTableRow(name, armorClass, strReq, stealth, weight, cost, armorType) {
    // Parse AC like "11 + Dex modifier" or "14 + Dex modifier (max 2)" or "18"
    let base = 0;
    let dexBonus;
    const acMatch = armorClass.match(/(\d+)/);
    if (acMatch) {
        base = parseInt(acMatch[1], 10);
    }
    if (armorClass.toLowerCase().includes('dex modifier')) {
        if (armorClass.includes('max 2')) {
            dexBonus = 'max2';
        }
        else {
            dexBonus = true;
        }
    }
    // Parse strength requirement like "Str 13" or "—"
    let strengthRequirement;
    const strMatch = strReq.match(/(\d+)/);
    if (strMatch) {
        strengthRequirement = parseInt(strMatch[1], 10);
    }
    // Parse stealth disadvantage
    const stealthDisadvantage = stealth.toLowerCase().includes('disadvantage');
    return {
        id: generateId('armor'),
        name: name.trim(),
        itemType: 'equipment',
        equipmentCategory: 'armor',
        armorType,
        ac: { base, dexBonus },
        strengthRequirement,
        stealthDisadvantage: stealthDisadvantage || undefined,
        weight: parseWeight(weight),
        cost: parseCost(cost),
    };
}
function parseToolFromSection(name, lines, toolType) {
    let ability = 'int';
    let utilizeAction;
    let craftItems;
    let weight;
    let cost;
    // Parse from header like "#### Alchemist's Supplies (50 GP)"
    const costMatch = name.match(/\(([^)]+)\)/);
    if (costMatch) {
        cost = parseCost(costMatch[1]);
        name = name.replace(/\s*\([^)]+\)/, '').trim();
    }
    for (const line of lines) {
        if (line.startsWith('**Ability:**')) {
            const abilityStr = line.replace('**Ability:**', '').trim().toLowerCase();
            ability = ABILITY_MAP[abilityStr] || 'int';
        }
        else if (line.startsWith('**Weight:**')) {
            weight = parseWeight(line);
        }
        else if (line.startsWith('**Utilize:**')) {
            utilizeAction = line.replace('**Utilize:**', '').trim();
        }
        else if (line.startsWith('**Craft:**')) {
            const craftStr = line.replace('**Craft:**', '').trim();
            craftItems = craftStr.split(',').map(s => s.trim().replace(/^\*|\*$/g, ''));
        }
    }
    return {
        id: generateId('tool'),
        name,
        itemType: 'equipment',
        equipmentCategory: 'tool',
        toolType,
        ability,
        utilizeAction,
        craftItems,
        weight,
        cost,
    };
}
function parseGearFromSection(name, description, tableRow) {
    let gearType;
    let focusType;
    let capacity;
    let packContents;
    // Detect gear type
    if (name.toLowerCase().includes('pack')) {
        gearType = 'pack';
        // Try to extract pack contents
        const contentsMatch = description.match(/contains the following items?:\s*(.+)/i);
        if (contentsMatch) {
            packContents = contentsMatch[1].split(',').map(s => s.trim());
        }
    }
    else if (description.toLowerCase().includes('spellcasting focus')) {
        gearType = 'focus';
        if (description.toLowerCase().includes('arcane'))
            focusType = 'arcane';
        else if (description.toLowerCase().includes('druidic') || description.toLowerCase().includes('druid'))
            focusType = 'druidic';
        else if (description.toLowerCase().includes('holy') || description.toLowerCase().includes('divine'))
            focusType = 'holy';
    }
    else if (description.match(/holds?\s+up\s+to/i)) {
        gearType = 'container';
        const capacityMatch = description.match(/holds?\s+up\s+to\s+([^.]+)/i);
        if (capacityMatch) {
            capacity = capacityMatch[1].trim();
        }
    }
    // Parse cost from name if present
    let cost;
    const costMatch = name.match(/\(([^)]+)\)/);
    if (costMatch) {
        cost = parseCost(costMatch[1]);
        name = name.replace(/\s*\([^)]+\)/, '').trim();
    }
    // Use table row data if provided
    if (tableRow?.cost) {
        cost = parseCost(tableRow.cost);
    }
    return {
        id: generateId('gear'),
        name,
        itemType: 'equipment',
        equipmentCategory: 'gear',
        gearType,
        focusType,
        capacity,
        packContents,
        description,
        weight: tableRow?.weight ? parseWeight(tableRow.weight) : undefined,
        cost,
    };
}
function parseEquipmentFile(content) {
    const result = {
        weapons: [],
        armor: [],
        tools: [],
        gear: [],
    };
    const lines = content.split('\n');
    let currentSection = '';
    let currentSubsection = '';
    let currentTableType = ''; // For "Table: Simple Melee Weapons" etc.
    let inTable = false;
    let tableHeaders = [];
    let currentItem = '';
    let currentItemLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Track major sections
        if (line.startsWith('## ')) {
            currentSection = line.replace('## ', '').trim().toLowerCase();
            currentSubsection = '';
            currentTableType = '';
            inTable = false;
            continue;
        }
        // Track subsections
        if (line.startsWith('### ')) {
            currentSubsection = line.replace('### ', '').trim().toLowerCase();
            currentTableType = '';
            inTable = false;
            continue;
        }
        // Track table type (e.g., "Table: Simple Melee Weapons")
        if (line.startsWith('Table:')) {
            currentTableType = line.replace('Table:', '').trim().toLowerCase();
            inTable = false;
            continue;
        }
        // Handle weapon tables - detect by table header row
        if (currentSection === 'weapons' && line.startsWith('|') && line.includes('Name') && line.includes('Damage')) {
            inTable = true;
            tableHeaders = line.split('|').map(h => h.trim().toLowerCase());
            continue;
        }
        if (currentSection === 'weapons' && inTable && line.startsWith('|') && !line.includes('---')) {
            const cols = line.split('|').map(c => c.trim());
            if (cols.length >= 6 && cols[1]) {
                // Determine weapon type and attack type from table type label
                const isSimple = currentTableType.includes('simple');
                const isMelee = currentTableType.includes('melee');
                const weapon = parseWeaponFromTableRow(cols[1], cols[2], cols[3], cols[4], cols[5], cols[6] || '', isSimple ? 'simple' : 'martial', isMelee ? 'melee' : 'ranged');
                if (weapon) {
                    result.weapons.push(weapon);
                }
            }
            continue;
        }
        // Handle armor tables - detect by table header row
        if (currentSection === 'armor' && line.startsWith('|') && line.includes('Armor') && line.includes('Class')) {
            inTable = true;
            tableHeaders = line.split('|').map(h => h.trim().toLowerCase());
            continue;
        }
        if (currentSection === 'armor' && inTable && line.startsWith('|') && !line.includes('---')) {
            const cols = line.split('|').map(c => c.trim());
            if (cols.length >= 6 && cols[1]) {
                // Determine armor type from table type label
                let armorType = 'light';
                if (currentTableType.includes('medium'))
                    armorType = 'medium';
                else if (currentTableType.includes('heavy'))
                    armorType = 'heavy';
                else if (currentTableType.includes('shield'))
                    armorType = 'shield';
                const armor = parseArmorFromTableRow(cols[1], cols[2], cols[3], cols[4], cols[5], cols[6] || '', armorType);
                if (armor) {
                    result.armor.push(armor);
                }
            }
            continue;
        }
        // Handle tools (#### headers with details)
        if (currentSection === 'tools' && line.startsWith('#### ')) {
            // Flush previous tool
            if (currentItem && currentItemLines.length > 0) {
                const toolType = currentSubsection.includes('artisan') ? 'artisan' :
                    currentSubsection.includes('gaming') ? 'gaming' :
                        currentSubsection.includes('musical') ? 'musical' : 'other';
                const tool = parseToolFromSection(currentItem, currentItemLines, toolType);
                if (tool) {
                    result.tools.push(tool);
                }
            }
            currentItem = line.replace('#### ', '').trim();
            currentItemLines = [];
            continue;
        }
        if (currentSection === 'tools' && currentItem && line.startsWith('**')) {
            currentItemLines.push(line);
            continue;
        }
        // Handle adventuring gear (#### headers with descriptions)
        if (currentSection === 'adventuring gear' && line.startsWith('#### ')) {
            // Flush previous gear
            if (currentItem && currentItemLines.length > 0) {
                const description = currentItemLines.join(' ').trim();
                const gear = parseGearFromSection(currentItem, description);
                result.gear.push(gear);
            }
            currentItem = line.replace('#### ', '').trim();
            currentItemLines = [];
            continue;
        }
        if (currentSection === 'adventuring gear' && currentItem && line.trim() && !line.startsWith('#') && !line.startsWith('Table:') && !line.startsWith('|')) {
            currentItemLines.push(line.trim());
        }
    }
    // Flush final item
    if (currentItem && currentItemLines.length > 0) {
        if (currentSection === 'tools') {
            const toolType = currentSubsection.includes('artisan') ? 'artisan' :
                currentSubsection.includes('gaming') ? 'gaming' :
                    currentSubsection.includes('musical') ? 'musical' : 'other';
            const tool = parseToolFromSection(currentItem, currentItemLines, toolType);
            if (tool) {
                result.tools.push(tool);
            }
        }
        else if (currentSection === 'adventuring gear') {
            const description = currentItemLines.join(' ').trim();
            const gear = parseGearFromSection(currentItem, description);
            result.gear.push(gear);
        }
    }
    return result;
}
// Main execution
const srcDir = path.join(__dirname, '..', 'src');
const equipmentPath = path.join(srcDir, '06_Equipment.md');
const outputPath = path.join(srcDir, 'equipment.json');
console.log('Parsing equipment from:', equipmentPath);
const content = fs.readFileSync(equipmentPath, 'utf-8');
const equipment = parseEquipmentFile(content);
const allEquipment = [
    ...equipment.weapons,
    ...equipment.armor,
    ...equipment.tools,
    ...equipment.gear,
];
console.log(`Parsed ${equipment.weapons.length} weapons`);
console.log(`Parsed ${equipment.armor.length} armor pieces`);
console.log(`Parsed ${equipment.tools.length} tools`);
console.log(`Parsed ${equipment.gear.length} gear items`);
console.log(`Total: ${allEquipment.length} equipment items`);
fs.writeFileSync(outputPath, JSON.stringify(allEquipment, null, 2));
console.log('Saved equipment to:', outputPath);
