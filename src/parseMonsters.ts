import * as fs from 'fs';
import * as path from 'path';
import {
  Monster,
  AbilityScores,
  AbilityKey,
  Speed,
  Size,
  CreatureType,
  DamageType,
  Condition,
  Senses,
  Skill,
  SkillProficiency,
  Action,
  Trait,
  Reaction,
  LegendaryAction,
  DamageInstance,
  DiceExpression,
  DieType,
  MultiattackItem,
  parseDiceExpression,
} from './types';

// Simple unique ID generator for sub-items
let uniqueIdCounter = 0;
function generateUniqueId(prefix: string): string {
  return `${prefix}_${++uniqueIdCounter}`;
}

// Mapping for skill names from markdown to our Skill type
const SKILL_NAME_MAP: Record<string, Skill> = {
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

// Valid conditions
const CONDITIONS: Condition[] = [
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

// Creature type mapping
const CREATURE_TYPE_MAP: Record<string, CreatureType> = {
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

// Size mapping
const SIZE_MAP: Record<string, Size> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
};

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSize(text: string): Size {
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(SIZE_MAP)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  return 'Medium';
}

function parseCreatureType(text: string): { type: CreatureType; tags?: string[] } {
  const lower = text.toLowerCase();

  // Check for tags in parentheses, e.g., "Dragon (Chromatic)" or "Fey (Goblinoid)"
  const tagMatch = text.match(/\(([^)]+)\)/);
  const tags = tagMatch ? [tagMatch[1]] : undefined;

  // Remove the tag part for type matching
  const typeText = text.replace(/\([^)]+\)/, '').toLowerCase().trim();

  for (const [key, value] of Object.entries(CREATURE_TYPE_MAP)) {
    if (typeText.includes(key)) {
      return { type: value, tags };
    }
  }

  return { type: 'humanoid', tags };
}

function parseSpeed(speedText: string): Speed {
  const speed: Speed = {};

  // Parse walk speed (default, no prefix)
  const walkMatch = speedText.match(/^(\d+)\s*ft\./);
  if (walkMatch) {
    speed.walk = parseInt(walkMatch[1], 10);
  }

  // Parse other speeds
  const flyMatch = speedText.match(/fly\s+(\d+)\s*ft\./i);
  if (flyMatch) speed.fly = parseInt(flyMatch[1], 10);

  const swimMatch = speedText.match(/swim\s+(\d+)\s*ft\./i);
  if (swimMatch) speed.swim = parseInt(swimMatch[1], 10);

  const burrowMatch = speedText.match(/burrow\s+(\d+)\s*ft\./i);
  if (burrowMatch) speed.burrow = parseInt(burrowMatch[1], 10);

  const climbMatch = speedText.match(/climb\s+(\d+)\s*ft\./i);
  if (climbMatch) speed.climb = parseInt(climbMatch[1], 10);

  // Check for hover
  if (speedText.toLowerCase().includes('hover')) {
    speed.hover = true;
  }

  return speed;
}

function parseHP(hpText: string): { current: number; max: number; hitDice?: { count: number; die: DieType } } {
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
        hitDice: {
          count: dieCount,
          die: `d${dieType}` as DieType,
        },
      };
    }
  }

  // Fallback: just the number
  const numMatch = hpText.match(/(\d+)/);
  const hp = numMatch ? parseInt(numMatch[1], 10) : 1;
  return { current: hp, max: hp };
}

function parseAC(acText: string): number {
  const match = acText.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 10;
}

function parseCR(crText: string): { cr: number; xp?: number; xpInLair?: number } {
  // Formats:
  // "10 (XP 5,900, or 7,200 in lair)"
  // "3 (XP 700; PB +2)"
  // "1/2 (XP 100; PB +2)"
  // "1/4 (XP 50; PB +2)"
  // "1/8 (XP 25; PB +2)"

  let cr = 0;
  const crMatch = crText.match(/^([\d/]+)/);
  if (crMatch) {
    const crStr = crMatch[1];
    if (crStr.includes('/')) {
      const [num, denom] = crStr.split('/').map((n) => parseInt(n, 10));
      cr = num / denom;
    } else {
      cr = parseInt(crStr, 10);
    }
  }

  let xp: number | undefined;
  let xpInLair: number | undefined;

  // Check for lair XP
  const lairMatch = crText.match(/or\s+([\d,]+)\s*in\s*lair/i);
  if (lairMatch) {
    xpInLair = parseInt(lairMatch[1].replace(/,/g, ''), 10);
  }

  // Check for regular XP
  const xpMatch = crText.match(/XP\s+([\d,]+)/);
  if (xpMatch) {
    xp = parseInt(xpMatch[1].replace(/,/g, ''), 10);
  }

  return { cr, xp, xpInLair };
}

function parseSenses(sensesText: string): Senses {
  const senses: Senses = { passivePerception: 10 };

  const blindsightMatch = sensesText.match(/blindsight\s+(\d+)\s*ft\./i);
  if (blindsightMatch) senses.blindsight = parseInt(blindsightMatch[1], 10);

  const darkvisionMatch = sensesText.match(/darkvision\s+(\d+)\s*ft\./i);
  if (darkvisionMatch) senses.darkvision = parseInt(darkvisionMatch[1], 10);

  const tremorsenseMatch = sensesText.match(/tremorsense\s+(\d+)\s*ft\./i);
  if (tremorsenseMatch) senses.tremorsense = parseInt(tremorsenseMatch[1], 10);

  const truesightMatch = sensesText.match(/truesight\s+(\d+)\s*ft\./i);
  if (truesightMatch) senses.truesight = parseInt(truesightMatch[1], 10);

  const passiveMatch = sensesText.match(/passive\s*perception\s+(\d+)/i);
  if (passiveMatch) senses.passivePerception = parseInt(passiveMatch[1], 10);

  return senses;
}

function parseSkills(skillsText: string): SkillProficiency[] {
  const skills: SkillProficiency[] = [];

  // Format: "History +12, Perception +10"
  const skillPattern = /([A-Za-z\s]+)\s+[+-]\d+/g;
  let match;

  while ((match = skillPattern.exec(skillsText)) !== null) {
    const skillName = match[1].trim().toLowerCase();
    const skill = SKILL_NAME_MAP[skillName];
    if (skill) {
      skills.push({ id: generateUniqueId('skill'), skill });
    }
  }

  return skills;
}

function parseAbilityScores(lines: string[]): { scores: AbilityScores; saveProficiencies: AbilityKey[] } {
  const scores: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const saveProficiencies: AbilityKey[] = [];

  const abilityMap: Record<string, AbilityKey> = {
    STR: 'str',
    DEX: 'dex',
    CON: 'con',
    INT: 'int',
    WIS: 'wis',
    CHA: 'cha',
  };

  for (const line of lines) {
    // Format: "| STR | 21 | +5 | +5 |"
    const match = line.match(/\|\s*(STR|DEX|CON|INT|WIS|CHA)\s*\|\s*(\d+)\s*\|\s*([+-]?\d+)\s*\|\s*([+-]?\d+)\s*\|/i);
    if (match) {
      const ability = abilityMap[match[1].toUpperCase()];
      const score = parseInt(match[2], 10);
      const mod = parseInt(match[3], 10);
      const save = parseInt(match[4], 10);

      scores[ability] = score;

      // Check if save bonus is higher than modifier (indicates proficiency)
      if (save > mod) {
        saveProficiencies.push(ability);
      }
    }
  }

  return { scores, saveProficiencies };
}

function parseImmunitiesResistances(text: string): { damage: DamageType[]; conditions: Condition[] } {
  const damage: DamageType[] = [];
  const conditions: Condition[] = [];

  const parts = text.split(/[,;]/);

  for (const part of parts) {
    const lower = part.trim().toLowerCase();

    // Check for damage types
    for (const dt of DAMAGE_TYPES) {
      if (lower.includes(dt)) {
        damage.push(dt);
      }
    }

    // Check for conditions
    for (const cond of CONDITIONS) {
      if (lower.includes(cond)) {
        conditions.push(cond);
      }
    }
  }

  return { damage, conditions };
}

function parseLanguages(langText: string): string[] {
  // Handle special cases like "telepathy 120 ft." and "Understands X but can't speak"
  const languages: string[] = [];

  // Split by comma or semicolon, but be careful with telepathy
  const parts = langText.split(/[,;]/).map((p) => p.trim());

  for (const part of parts) {
    if (part) {
      languages.push(part);
    }
  }

  return languages;
}

function parseDamageFromText(text: string): DamageInstance[] {
  const damages: DamageInstance[] = [];

  // Pattern: "12 (2d6 + 5) Bludgeoning damage" or "4 (1d8) Acid damage"
  const damagePattern = /(\d+)\s*\((\d+d\d+)(?:\s*([+-]\s*\d+))?\)\s*(\w+)\s*damage/gi;
  let match;

  while ((match = damagePattern.exec(text)) !== null) {
    const diceExpr = match[2] + (match[3] ? match[3].replace(/\s/g, '') : '');
    const typeStr = match[4].toLowerCase();

    const parsed = parseDiceExpression(diceExpr);
    if (parsed && DAMAGE_TYPES.includes(typeStr as DamageType)) {
      damages.push({
        id: generateUniqueId('dmg'),
        dice: parsed,
        type: typeStr as DamageType,
      });
    }
  }

  return damages;
}

function parseAction(name: string, description: string): Action {
  const fullText = description;

  // Check for Multiattack
  if (name.toLowerCase() === 'multiattack') {
    // Try to parse attack counts from description
    const attacks: MultiattackItem[] = [];

    // Pattern: "makes two Tentacle attacks" or "makes three Rend attacks"
    const multiPattern = /makes?\s+(two|three|four|five|\d+)\s+(\w+)\s+attacks?/gi;
    let match;

    while ((match = multiPattern.exec(description)) !== null) {
      const countStr = match[1].toLowerCase();
      let count = parseInt(countStr, 10);
      if (isNaN(count)) {
        const countMap: Record<string, number> = {
          one: 1,
          two: 2,
          three: 3,
          four: 4,
          five: 5,
        };
        count = countMap[countStr] || 1;
      }
      attacks.push({ id: generateUniqueId('ma'), name: match[2], count });
    }

    return {
      actionType: 'multiattack',
      id: generateUniqueId('action'),
      name,
      description,
      attacks,
    };
  }

  // Check for attack actions: "*Melee Attack Roll:*" or "*Ranged Attack Roll:*"
  const attackMatch = description.match(
    /\*(Melee|Ranged|Melee or Ranged)\s+Attack\s+Roll:\*\s*([+-]?\d+)/i
  );
  if (attackMatch) {
    const attackTypeStr = attackMatch[1].toLowerCase();
    let attackType: 'melee' | 'ranged' | 'melee-or-ranged' = 'melee';
    if (attackTypeStr.includes('or')) {
      attackType = 'melee-or-ranged';
    } else if (attackTypeStr === 'ranged') {
      attackType = 'ranged';
    }

    const attackBonus = parseInt(attackMatch[2], 10);

    // Parse reach
    let reach: number | undefined;
    const reachMatch = description.match(/reach\s+(\d+)\s*ft\./i);
    if (reachMatch) {
      reach = parseInt(reachMatch[1], 10);
    }

    // Parse range
    let range: { normal: number; long?: number } | undefined;
    const rangeMatch = description.match(/range\s+(\d+)(?:\/(\d+))?\s*ft\./i);
    if (rangeMatch) {
      range = { normal: parseInt(rangeMatch[1], 10) };
      if (rangeMatch[2]) {
        range.long = parseInt(rangeMatch[2], 10);
      }
    }

    const damage = parseDamageFromText(description);

    return {
      actionType: 'attack',
      id: generateUniqueId('action'),
      name,
      description,
      attackType,
      attackBonus,
      reach,
      range,
      damage,
    };
  }

  // Check for ability actions with saving throws: "*Dexterity Saving Throw*: DC 18"
  const saveMatch = description.match(
    /\*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Saving\s+Throw\*:\s*DC\s+(\d+)/i
  );
  if (saveMatch) {
    const abilityMap: Record<string, AbilityKey> = {
      strength: 'str',
      dexterity: 'dex',
      constitution: 'con',
      intelligence: 'int',
      wisdom: 'wis',
      charisma: 'cha',
    };

    const ability = abilityMap[saveMatch[1].toLowerCase()];
    const dc = parseInt(saveMatch[2], 10);

    // Check for recharge
    let recharge: { min: number; max: number } | undefined;
    const rechargeMatch = name.match(/\(Recharge\s+(\d+)(?:-(\d+))?\)/i);
    if (rechargeMatch) {
      const min = parseInt(rechargeMatch[1], 10);
      const max = rechargeMatch[2] ? parseInt(rechargeMatch[2], 10) : min;
      recharge = { min, max };
    }

    // Check for usage limit
    let usageLimit: { uses: number; per: 'day' | 'rest' | 'encounter' } | undefined;
    const usageMatch = name.match(/\((\d+)\/Day\)/i);
    if (usageMatch) {
      usageLimit = { uses: parseInt(usageMatch[1], 10), per: 'day' };
    }

    const damage = parseDamageFromText(description);

    return {
      actionType: 'ability',
      id: generateUniqueId('action'),
      name: name.replace(/\s*\([^)]+\)\s*$/, '').trim(), // Remove recharge/usage from name
      description,
      savingThrow: { ability, dc },
      recharge,
      usageLimit,
      damage: damage.length > 0 ? damage : undefined,
    };
  }

  // Generic action (fallback)
  return {
    actionType: 'generic',
    id: generateUniqueId('action'),
    name,
    description,
  };
}

function parseTrait(name: string, description: string): Trait {
  return { id: generateUniqueId('trait'), name, description };
}

function parseLegendaryAction(name: string, description: string): LegendaryAction {
  // Most legendary actions cost 1
  // Some might specify "(Costs 2 Actions)" or similar
  let cost = 1;
  const costMatch = name.match(/\(Costs?\s+(\d+)\s+Actions?\)/i);
  if (costMatch) {
    cost = parseInt(costMatch[1], 10);
  }

  return {
    id: generateUniqueId('la'),
    name: name.replace(/\s*\([^)]+\)\s*$/, '').trim(),
    description,
    cost,
  };
}

interface MonsterBlock {
  name: string;
  lines: string[];
}

function splitIntoMonsterBlocks(content: string): MonsterBlock[] {
  const lines = content.split('\n');
  const blocks: MonsterBlock[] = [];
  let currentBlock: MonsterBlock | null = null;

  for (const line of lines) {
    // Check for monster header (## Name)
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch && !line.startsWith('###')) {
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

function parseMonsterBlock(block: MonsterBlock): Monster | null {
  const { name, lines } = block;

  // Find the type line (first italic line): "*Large Aberration, Lawful Evil*"
  let typeLineIdx = -1;
  let typeLine = '';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('*') && lines[i].endsWith('*') && !lines[i].startsWith('**') && !lines[i].startsWith('***')) {
      typeLineIdx = i;
      typeLine = lines[i].slice(1, -1); // Remove asterisks
      break;
    }
  }

  if (typeLineIdx === -1) {
    console.warn(`Could not find type line for monster: ${name}`);
    return null;
  }

  // Parse size, type, alignment from type line
  // Format: "Large Aberration, Lawful Evil" or "Huge Dragon (Chromatic), Chaotic Evil"
  const typeMatch = typeLine.match(/^(\w+)\s+(.+?),\s*(.+)$/);
  if (!typeMatch) {
    console.warn(`Could not parse type line for monster: ${name}: ${typeLine}`);
    return null;
  }

  const size = parseSize(typeMatch[1]);
  const { type: creatureType, tags } = parseCreatureType(typeMatch[2]);
  const alignment = typeMatch[3].trim();

  // Initialize monster with defaults
  const monster: Monster = {
    id: generateId(name),
    name,
    entityType: 'monster',
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
    actions: [],
  };

  // Parse bullet points
  for (const line of lines) {
    if (line.startsWith('- **Armor Class:**')) {
      monster.ac = parseAC(line.replace('- **Armor Class:**', '').trim());
    } else if (line.startsWith('- **Hit Points:**')) {
      const hpData = parseHP(line.replace('- **Hit Points:**', '').trim());
      monster.hp = { current: hpData.current, max: hpData.max };
      if (hpData.hitDice) {
        monster.hitDice = hpData.hitDice;
      }
    } else if (line.startsWith('- **Speed:**')) {
      monster.speed = parseSpeed(line.replace('- **Speed:**', '').trim());
    } else if (line.startsWith('- **Skills**:')) {
      monster.skillProficiencies = parseSkills(line.replace('- **Skills**:', '').trim());
    } else if (line.startsWith('- **Senses**:')) {
      monster.senses = parseSenses(line.replace('- **Senses**:', '').trim());
    } else if (line.startsWith('- **Languages**:')) {
      monster.languages = parseLanguages(line.replace('- **Languages**:', '').trim());
    } else if (line.startsWith('- **CR**')) {
      const crData = parseCR(line.replace('- **CR**', '').trim());
      monster.cr = crData.cr;
      if (crData.xp) monster.xp = crData.xp;
      if (crData.xpInLair) monster.xpInLair = crData.xpInLair;
    } else if (line.startsWith('- **Immunities**:')) {
      const immText = line.replace('- **Immunities**:', '').trim();
      const { damage, conditions } = parseImmunitiesResistances(immText);
      if (damage.length > 0) monster.immunities = damage;
      if (conditions.length > 0) monster.conditionImmunities = conditions;
    } else if (line.startsWith('- **Resistances**:')) {
      const resText = line.replace('- **Resistances**:', '').trim();
      const { damage } = parseImmunitiesResistances(resText);
      if (damage.length > 0) monster.resistances = damage;
    } else if (line.startsWith('- **Vulnerabilities**:')) {
      const vulnText = line.replace('- **Vulnerabilities**:', '').trim();
      const { damage } = parseImmunitiesResistances(vulnText);
      if (damage.length > 0) monster.vulnerabilities = damage;
    }
  }

  // Parse ability score table
  const tableLines = lines.filter((l) => l.startsWith('|') && l.includes('|'));
  const { scores, saveProficiencies } = parseAbilityScores(tableLines);
  monster.abilityScores = scores;
  monster.savingThrowProficiencies = saveProficiencies;

  // Find sections
  let currentSection = '';
  let currentItemName = '';
  let currentItemDesc = '';

  const traits: Trait[] = [];
  const actions: Action[] = [];
  const bonusActions: Action[] = [];
  const reactions: Reaction[] = [];
  const legendaryActions: LegendaryAction[] = [];

  const flushCurrentItem = () => {
    if (currentItemName && currentItemDesc) {
      const desc = currentItemDesc.trim();
      switch (currentSection) {
        case 'traits':
          traits.push(parseTrait(currentItemName, desc));
          break;
        case 'actions':
          actions.push(parseAction(currentItemName, desc));
          break;
        case 'bonus actions':
          bonusActions.push(parseAction(currentItemName, desc));
          break;
        case 'reactions':
          reactions.push({ id: generateUniqueId('reaction'), name: currentItemName, description: desc });
          break;
        case 'legendary actions':
          legendaryActions.push(parseLegendaryAction(currentItemName, desc));
          break;
      }
    }
    currentItemName = '';
    currentItemDesc = '';
  };

  for (const line of lines) {
    // Check for section headers
    if (line.startsWith('### Traits')) {
      flushCurrentItem();
      currentSection = 'traits';
    } else if (line.startsWith('### Actions')) {
      flushCurrentItem();
      currentSection = 'actions';
    } else if (line.startsWith('### Bonus Actions')) {
      flushCurrentItem();
      currentSection = 'bonus actions';
    } else if (line.startsWith('### Reactions')) {
      flushCurrentItem();
      currentSection = 'reactions';
    } else if (line.startsWith('### Legendary Actions')) {
      flushCurrentItem();
      currentSection = 'legendary actions';
    } else if (currentSection && line.startsWith('***') && line.includes('.***')) {
      // New item: "***Name.*** Description"
      flushCurrentItem();
      const itemMatch = line.match(/\*\*\*(.+?)\.\*\*\*\s*(.*)/);
      if (itemMatch) {
        currentItemName = itemMatch[1].trim();
        currentItemDesc = itemMatch[2];
      }
    } else if (currentSection && currentItemName && line.trim()) {
      // Continuation of current item
      currentItemDesc += ' ' + line.trim();
    }
  }

  flushCurrentItem();

  // Assign parsed sections
  if (traits.length > 0) monster.traits = traits;
  if (actions.length > 0) monster.actions = actions;
  if (bonusActions.length > 0) monster.bonusActions = bonusActions;
  if (reactions.length > 0) monster.reactions = reactions;
  if (legendaryActions.length > 0) {
    monster.legendaryActions = legendaryActions;
    // Check for legendary resistance in traits
    const legRes = traits.find((t) => t.name.toLowerCase().includes('legendary resistance'));
    if (legRes) {
      const resMatch = legRes.name.match(/(\d+)\/Day/i);
      if (resMatch) {
        monster.legendaryResistance = parseInt(resMatch[1], 10);
      }
    }
    // Default legendary action count is 3
    monster.legendaryActionCount = 3;
  }

  return monster;
}

function main() {
  // __dirname is dist/ when compiled, so go up and into src/
  const srcDir = path.join(__dirname, '..', 'src');
  const inputPath = path.join(srcDir, '12_MonstersA-Z.md');
  const outputPath = path.join(srcDir, 'monsters.json');

  console.log(`Reading monsters from: ${inputPath}`);

  const content = fs.readFileSync(inputPath, 'utf-8');
  const blocks = splitIntoMonsterBlocks(content);

  console.log(`Found ${blocks.length} monster blocks`);

  const monsters: Monster[] = [];

  for (const block of blocks) {
    const monster = parseMonsterBlock(block);
    if (monster) {
      monsters.push(monster);
    }
  }

  console.log(`Successfully parsed ${monsters.length} monsters`);

  fs.writeFileSync(outputPath, JSON.stringify(monsters, null, 2));
  console.log(`Wrote monsters to: ${outputPath}`);
}

main();
