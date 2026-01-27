import * as fs from 'fs';
import * as path from 'path';
import {
  Spell,
  SpellSchool,
  SpellClass,
  CastingTime,
  SpellRange,
  SpellComponents,
  SpellDuration,
  MaterialComponent,
  SpellScaling,
  CantripScaling,
  AreaOfEffect,
  DamageInstance,
  DiceExpression,
  DamageType,
  DieType,
  AbilityKey,
  parseDiceExpression,
} from './types';

// Valid schools
const SCHOOLS: SpellSchool[] = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
];

// Valid classes
const CLASSES: SpellClass[] = [
  'bard',
  'cleric',
  'druid',
  'paladin',
  'ranger',
  'sorcerer',
  'warlock',
  'wizard',
];

// Valid damage types
const DAMAGE_TYPES: DamageType[] = [
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

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSchool(text: string): SpellSchool | null {
  const lower = text.toLowerCase();
  for (const school of SCHOOLS) {
    if (lower.includes(school)) {
      return school;
    }
  }
  return null;
}

function parseClasses(text: string): SpellClass[] {
  const classes: SpellClass[] = [];
  const lower = text.toLowerCase();

  for (const cls of CLASSES) {
    if (lower.includes(cls)) {
      classes.push(cls);
    }
  }

  return classes;
}

function parseLevelAndSchool(
  line: string
): { level: number; school: SpellSchool; classes: SpellClass[] } | null {
  // Format: "*Level 2 Evocation (Wizard)*" or "*Evocation Cantrip (Sorcerer, Wizard)*"
  const stripped = line.replace(/^\*+|\*+$/g, '').trim();

  // Check for cantrip
  const cantripMatch = stripped.match(/^(\w+)\s+Cantrip\s*\(([^)]+)\)/i);
  if (cantripMatch) {
    const school = parseSchool(cantripMatch[1]);
    const classes = parseClasses(cantripMatch[2]);
    if (school) {
      return { level: 0, school, classes };
    }
  }

  // Check for leveled spell: "Level X School (Classes)"
  const levelMatch = stripped.match(/^Level\s+(\d+)\s+(\w+)\s*\(([^)]+)\)/i);
  if (levelMatch) {
    const level = parseInt(levelMatch[1], 10);
    const school = parseSchool(levelMatch[2]);
    const classes = parseClasses(levelMatch[3]);
    if (school) {
      return { level, school, classes };
    }
  }

  return null;
}

function parseCastingTime(text: string): CastingTime {
  const lower = text.toLowerCase().trim();

  // Check for ritual
  const ritual = lower.includes('ritual');

  // Check for reaction with trigger
  const reactionMatch = text.match(/reaction,?\s*which\s+you\s+take\s+(.+)/i);
  if (reactionMatch || lower.startsWith('reaction')) {
    return {
      type: 'reaction',
      trigger: reactionMatch ? reactionMatch[1].trim() : undefined,
    };
  }

  // Check for bonus action with trigger
  const bonusMatch = text.match(/bonus\s+action,?\s*which\s+you\s+take\s+(.+)/i);
  if (bonusMatch || lower.includes('bonus action')) {
    return {
      type: 'bonusAction',
      trigger: bonusMatch ? bonusMatch[1].trim() : undefined,
    };
  }

  // Check for time duration
  const minuteMatch = lower.match(/(\d+)\s*minute/);
  if (minuteMatch) {
    return {
      type: 'time',
      minutes: parseInt(minuteMatch[1], 10),
      ritual,
    };
  }

  const hourMatch = lower.match(/(\d+)\s*hour/);
  if (hourMatch) {
    return {
      type: 'time',
      minutes: parseInt(hourMatch[1], 10) * 60,
      ritual,
    };
  }

  // Default to action
  return {
    type: 'action',
    ritual: ritual || undefined,
  };
}

function parseRange(text: string): SpellRange {
  const lower = text.toLowerCase().trim();

  if (lower === 'self' || lower.startsWith('self')) {
    return { type: 'self' };
  }

  if (lower === 'touch') {
    return { type: 'touch' };
  }

  if (lower === 'sight') {
    return { type: 'sight' };
  }

  if (lower === 'unlimited' || lower.includes('unlimited')) {
    return { type: 'unlimited' };
  }

  // Try to extract distance
  const distMatch = text.match(/(\d+)\s*(?:feet|ft\.?)/i);
  if (distMatch) {
    return { type: 'distance', feet: parseInt(distMatch[1], 10) };
  }

  // Mile conversion
  const mileMatch = text.match(/(\d+)\s*mile/i);
  if (mileMatch) {
    return { type: 'distance', feet: parseInt(mileMatch[1], 10) * 5280 };
  }

  // Default to self if unparseable
  return { type: 'self' };
}

function parseComponents(text: string): SpellComponents {
  const components: SpellComponents = {
    verbal: false,
    somatic: false,
  };

  // Check for V, S, M
  const upper = text.toUpperCase();

  if (upper.includes('V')) {
    components.verbal = true;
  }

  if (upper.includes('S')) {
    components.somatic = true;
  }

  // Check for material component
  const materialMatch = text.match(/M\s*\(([^)]+)\)/i);
  if (materialMatch) {
    const matDesc = materialMatch[1].trim();
    const material: MaterialComponent = {
      description: matDesc,
    };

    // Check for gold cost
    const costMatch = matDesc.match(/worth\s+(\d+)\+?\s*GP/i);
    if (costMatch) {
      material.cost = parseInt(costMatch[1], 10);
    }

    // Check if consumed
    if (matDesc.toLowerCase().includes('consume')) {
      material.consumed = true;
    }

    components.material = material;
  } else if (upper.includes('M')) {
    // M without parentheses is unusual but handle it
    components.material = { description: 'unspecified material' };
  }

  return components;
}

function parseDuration(text: string): SpellDuration {
  const lower = text.toLowerCase().trim();

  if (lower === 'instantaneous') {
    return { type: 'instantaneous' };
  }

  // Check for concentration
  const concMatch = text.match(/concentration,?\s*up\s*to\s*(.+)/i);
  if (concMatch) {
    return {
      type: 'concentration',
      maxDuration: concMatch[1].trim(),
    };
  }

  // Check for "until dispelled"
  if (lower.includes('until dispelled')) {
    return {
      type: 'untilDispelled',
      concentration: lower.includes('concentration'),
    };
  }

  // Otherwise it's a time duration
  if (lower.match(/\d+\s*(minute|hour|day|round|year)/)) {
    return {
      type: 'time',
      duration: text.trim(),
    };
  }

  // Special/complex duration
  return {
    type: 'special',
    description: text.trim(),
  };
}

function parseDamageFromText(text: string): DamageInstance[] {
  const damages: DamageInstance[] = [];

  // Pattern: "4d4 Acid damage" or "10d6 + 40 Force damage"
  const damagePattern = /(\d+d\d+)(?:\s*\+\s*(\d+))?\s+(\w+)\s+damage/gi;
  let match;

  while ((match = damagePattern.exec(text)) !== null) {
    const diceStr = match[1] + (match[2] ? `+${match[2]}` : '');
    const typeStr = match[3].toLowerCase();

    const parsed = parseDiceExpression(diceStr);
    if (parsed && DAMAGE_TYPES.includes(typeStr as DamageType)) {
      damages.push({
        dice: parsed,
        type: typeStr as DamageType,
      });
    }
  }

  return damages;
}

function parseAreaOfEffect(text: string): AreaOfEffect | undefined {
  const lower = text.toLowerCase();

  // Patterns for different shapes
  const sphereMatch = text.match(/(\d+)-foot(?:-radius)?\s*sphere/i);
  if (sphereMatch) {
    return { shape: 'sphere', size: parseInt(sphereMatch[1], 10) };
  }

  const coneMatch = text.match(/(\d+)-foot\s*cone/i);
  if (coneMatch) {
    return { shape: 'cone', size: parseInt(coneMatch[1], 10) };
  }

  const cubeMatch = text.match(/(\d+)-foot\s*cube/i);
  if (cubeMatch) {
    return { shape: 'cube', size: parseInt(cubeMatch[1], 10) };
  }

  const lineMatch = text.match(/(\d+)-foot(?:-long)?(?:,?\s*(\d+)-foot-wide)?\s*line/i);
  if (lineMatch) {
    const aoe: AreaOfEffect = { shape: 'line', size: parseInt(lineMatch[1], 10) };
    if (lineMatch[2]) {
      aoe.width = parseInt(lineMatch[2], 10);
    }
    return aoe;
  }

  const cylinderMatch = text.match(/(\d+)-foot(?:-radius)?\s*cylinder/i);
  if (cylinderMatch) {
    return { shape: 'cylinder', size: parseInt(cylinderMatch[1], 10) };
  }

  const emanationMatch = text.match(/(\d+)-foot\s*emanation/i);
  if (emanationMatch) {
    return { shape: 'emanation', size: parseInt(emanationMatch[1], 10) };
  }

  return undefined;
}

function parseSavingThrow(
  text: string
): { ability: AbilityKey; onSuccess?: string; onFailure?: string } | undefined {
  const abilityMap: Record<string, AbilityKey> = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha',
  };

  // Pattern: "Wisdom saving throw" or "makes a Dexterity saving throw"
  const saveMatch = text.match(
    /(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving\s+throw/i
  );

  if (saveMatch) {
    const ability = abilityMap[saveMatch[1].toLowerCase()];

    // Try to extract success/failure effects
    let onSuccess: string | undefined;
    let onFailure: string | undefined;

    const successMatch = text.match(/on\s+a\s+(?:successful\s+)?(?:save|success)[,:]?\s*([^.]+)/i);
    if (successMatch) {
      onSuccess = successMatch[1].trim();
    }

    const failMatch = text.match(/on\s+a\s+failed\s+(?:save|saving throw)[,:]?\s*([^.]+)/i);
    if (failMatch) {
      onFailure = failMatch[1].trim();
    }

    return { ability, onSuccess, onFailure };
  }

  return undefined;
}

function parseAttackType(text: string): 'melee' | 'ranged' | undefined {
  const lower = text.toLowerCase();

  if (lower.includes('melee spell attack')) {
    return 'melee';
  }

  if (lower.includes('ranged spell attack')) {
    return 'ranged';
  }

  return undefined;
}

function parseHigherLevelScaling(text: string): SpellScaling | undefined {
  // Look for "Using a Higher-Level Spell Slot" section
  const match = text.match(/using\s+a\s+higher-level\s+spell\s+slot[._]*\s*(.+)/i);
  if (!match) return undefined;

  const description = match[1].trim();

  const scaling: SpellScaling = { description };

  // Try to parse damage increase
  const damageMatch = description.match(/increases?\s+by\s+(\d+d\d+)/i);
  if (damageMatch) {
    const parsed = parseDiceExpression(damageMatch[1]);
    if (parsed) {
      scaling.damagePerLevel = parsed;
    }
  }

  // Try to parse additional targets
  const targetMatch = description.match(/(\d+)\s+additional\s+(target|creature|beast)/i);
  if (targetMatch) {
    scaling.targetsPerLevel = parseInt(targetMatch[1], 10);
  }

  return scaling;
}

function parseCantripScaling(text: string): CantripScaling | undefined {
  // Look for "Cantrip Upgrade" section
  const match = text.match(/cantrip\s+upgrade[._]*\s*(.+)/i);
  if (!match) return undefined;

  const description = match[1].trim();

  // Extract levels (typically 5, 11, 17)
  const levels: number[] = [];
  const levelMatches = description.matchAll(/level[s]?\s+(\d+)/gi);
  for (const m of levelMatches) {
    levels.push(parseInt(m[1], 10));
  }

  // If no explicit levels found, use defaults
  if (levels.length === 0) {
    levels.push(5, 11, 17);
  }

  return { description, levels };
}

function parseHealing(text: string): DiceExpression | undefined {
  // Pattern: "regains 1d8 + 4 hit points" or "regain 2d6 hit points"
  const healMatch = text.match(/regains?\s+(\d+d\d+)(?:\s*\+\s*(\d+))?\s+hit\s+points/i);
  if (healMatch) {
    const diceStr = healMatch[1] + (healMatch[2] ? `+${healMatch[2]}` : '');
    return parseDiceExpression(diceStr) ?? undefined;
  }
  return undefined;
}

interface SpellBlock {
  name: string;
  lines: string[];
}

function splitIntoSpellBlocks(content: string): SpellBlock[] {
  const lines = content.split('\n');
  const blocks: SpellBlock[] = [];
  let currentBlock: SpellBlock | null = null;
  let inSpellDescriptions = false;

  for (const line of lines) {
    // Check if we've reached the spell descriptions section
    if (line.startsWith('## Spell Descriptions')) {
      inSpellDescriptions = true;
      continue;
    }

    if (!inSpellDescriptions) continue;

    // Check for section headers like "### A Spells"
    if (line.match(/^###\s+[A-Z]\s+Spells/)) {
      continue;
    }

    // Check for spell header (#### Name)
    const headerMatch = line.match(/^####\s+(?:\*\*)?(.+?)(?:\*\*)?$/);
    if (headerMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = { name: headerMatch[1].trim(), lines: [] };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function parseSpellBlock(block: SpellBlock): Spell | null {
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

  // Initialize spell with defaults
  const spell: Spell = {
    id: generateId(name),
    name,
    level: levelSchool.level,
    school: levelSchool.school,
    classes: levelSchool.classes,
    castingTime: { type: 'action' },
    range: { type: 'self' },
    components: { verbal: false, somatic: false },
    duration: { type: 'instantaneous' },
    description: '',
  };

  // Parse the attribute lines
  let descriptionStartIdx = -1;
  for (let i = levelSchoolIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('**Casting Time:**') || line.startsWith('**Casting Time**:')) {
      const value = line.replace(/\*\*Casting Time:?\*\*:?\s*/i, '').trim();
      spell.castingTime = parseCastingTime(value);
    } else if (line.startsWith('**Range:**') || line.startsWith('**Range**:')) {
      const value = line.replace(/\*\*Range:?\*\*:?\s*/i, '').trim();
      spell.range = parseRange(value);
    } else if (
      line.startsWith('**Components:**') ||
      line.startsWith('**Component:**') ||
      line.startsWith('**Components**:') ||
      line.startsWith('**Component**:')
    ) {
      const value = line.replace(/\*\*Components?:?\*\*:?\s*/i, '').trim();
      spell.components = parseComponents(value);
    } else if (line.startsWith('**Duration:**') || line.startsWith('**Duration**:')) {
      const value = line.replace(/\*\*Duration:?\*\*:?\s*/i, '').trim();
      spell.duration = parseDuration(value);
    } else if (line && !line.startsWith('**') && !line.startsWith('|')) {
      // This is the start of the description
      descriptionStartIdx = i;
      break;
    }
  }

  // Collect description
  if (descriptionStartIdx !== -1) {
    const descLines: string[] = [];
    for (let i = descriptionStartIdx; i < lines.length; i++) {
      const line = lines[i];
      // Stop at embedded stat blocks (they start with "> ####")
      if (line.startsWith('> ####')) {
        break;
      }
      descLines.push(line);
    }
    spell.description = descLines.join('\n').trim();
  }

  // Parse additional properties from description
  const fullText = spell.description;

  // Attack type
  const attackType = parseAttackType(fullText);
  if (attackType) {
    spell.attackType = attackType;
  }

  // Saving throw
  const savingThrow = parseSavingThrow(fullText);
  if (savingThrow) {
    spell.savingThrow = savingThrow;
  }

  // Damage
  const damage = parseDamageFromText(fullText);
  if (damage.length > 0) {
    spell.damage = damage;
  }

  // Healing
  const healing = parseHealing(fullText);
  if (healing) {
    spell.healing = healing;
  }

  // Area of effect
  const aoe = parseAreaOfEffect(fullText);
  if (aoe) {
    spell.areaOfEffect = aoe;
  }

  // Higher level scaling (for level 1+ spells)
  if (spell.level > 0) {
    const scaling = parseHigherLevelScaling(fullText);
    if (scaling) {
      spell.higherLevelScaling = scaling;
    }
  }

  // Cantrip scaling (for cantrips)
  if (spell.level === 0) {
    const cantripScale = parseCantripScaling(fullText);
    if (cantripScale) {
      spell.cantripScaling = cantripScale;
    }
  }

  return spell;
}

function main() {
  // __dirname is dist/ when compiled, so go up and into src/
  const srcDir = path.join(__dirname, '..', 'src');
  const inputPath = path.join(srcDir, '07_Spells.md');
  const outputPath = path.join(srcDir, 'spells.json');

  console.log(`Reading spells from: ${inputPath}`);

  const content = fs.readFileSync(inputPath, 'utf-8');
  const blocks = splitIntoSpellBlocks(content);

  console.log(`Found ${blocks.length} spell blocks`);

  const spells: Spell[] = [];

  for (const block of blocks) {
    const spell = parseSpellBlock(block);
    if (spell) {
      spells.push(spell);
    }
  }

  console.log(`Successfully parsed ${spells.length} spells`);

  fs.writeFileSync(outputPath, JSON.stringify(spells, null, 2));
  console.log(`Wrote spells to: ${outputPath}`);
}

main();
