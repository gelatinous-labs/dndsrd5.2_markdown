/**
 * V2 magic item parser: 10_MagicItems.md → magicItems.v2.json
 *
 * Produces a v2 artifact with:
 *   - stable key/slug/source fields
 *   - raw source blocks (sourceFile, startLine, endLine, markdown)
 *   - structured magic item data (category, rarity, attunement, charges, abilities)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  MagicItemCategory,
  MagicItemRarity,
  ActivationType,
} from './types';

// ---------------------------------------------------------------------------
// V2 output types
// ---------------------------------------------------------------------------

interface SourceTextBlock {
  sourceFile: string;
  startLine: number;
  endLine: number;
  markdown: string;
}

interface MagicItemChargesV2 {
  max: number;
  rechargeAmount?: string;
  rechargeCondition?: string;
}

interface MagicItemAbilityV2 {
  name: string;
  description: string;
  activation?: ActivationType;
  chargeCost?: number;
  /** If the ability casts a spell, reference it by key */
  spellKey?: string;
  /** Spell level if casting at a specific level */
  spellLevel?: number;
}

interface MagicItemV2 {
  key: string;
  slug: string;
  name: string;
  source: string;
  category: MagicItemCategory;
  rarity: MagicItemRarity;
  /** Variable rarity items have multiple rarities (e.g. +1/+2/+3 weapons) */
  variableRarity?: { rarity: MagicItemRarity; qualifier?: string }[];
  requiresAttunement: boolean;
  attunementPrerequisites?: string;
  /** Base item type restriction, e.g. "Any Medium or Heavy, Except Hide Armor" */
  baseItemRestriction?: string;
  /** Specific base item, e.g. "Plate Armor", "Dagger" */
  baseItem?: string;
  charges?: MagicItemChargesV2;
  abilities?: MagicItemAbilityV2[];
  description: string;
  raw: SourceTextBlock;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_FILE = '10_MagicItems.md';

const CATEGORY_MAP: Record<string, MagicItemCategory> = {
  'armor': 'armor',
  'potion': 'potion',
  'ring': 'ring',
  'rod': 'rod',
  'scroll': 'scroll',
  'staff': 'staff',
  'wand': 'wand',
  'weapon': 'weapon',
  'wondrous item': 'wondrousItem',
};

const RARITY_MAP: Record<string, MagicItemRarity> = {
  'common': 'common',
  'uncommon': 'uncommon',
  'rare': 'rare',
  'very rare': 'veryRare',
  'legendary': 'legendary',
  'artifact': 'artifact',
};

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function spellSlugFromName(spellName: string): string {
  return slugify(spellName);
}

// ---------------------------------------------------------------------------
// Block splitting
// ---------------------------------------------------------------------------

interface RawItemBlock {
  name: string;
  lines: string[];
  headerLineNumber: number;
  endLineNumber: number;
  rawMarkdown: string;
}

function splitIntoItemBlocks(content: string): RawItemBlock[] {
  const allLines = content.split('\n');
  const blocks: RawItemBlock[] = [];

  let inMagicItemsSection = false;
  let currentBlock: {
    name: string;
    headerLineNumber: number;
    headerText: string;
    lines: { text: string; lineNumber: number }[];
  } | null = null;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i]!;
    const lineNumber = i + 1;

    if (line.startsWith('## Magic Items A')) {
      inMagicItemsSection = true;
      continue;
    }

    if (!inMagicItemsSection) continue;

    // A new h2 or h3 would end the magic items section
    if (line.match(/^#{1,3}\s/) && !line.startsWith('####')) {
      // Flush current block and stop
      break;
    }

    // Item header: #### ItemName or #### **ItemName**
    const headerMatch = line.match(/^####\s+(?:\*\*)?(.+?)(?:\*\*)?$/);
    if (headerMatch) {
      if (currentBlock) {
        flushBlock(currentBlock, blocks);
      }
      currentBlock = {
        name: headerMatch[1]!.trim(),
        headerLineNumber: lineNumber,
        headerText: line,
        lines: [],
      };
    } else if (currentBlock) {
      currentBlock.lines.push({ text: line, lineNumber });
    }
  }

  // Flush final block
  if (currentBlock) {
    flushBlock(currentBlock, blocks);
  }

  return blocks;
}

function flushBlock(
  currentBlock: {
    name: string;
    headerLineNumber: number;
    headerText: string;
    lines: { text: string; lineNumber: number }[];
  },
  blocks: RawItemBlock[],
): void {
  // Trim trailing empty lines
  while (
    currentBlock.lines.length > 0 &&
    currentBlock.lines[currentBlock.lines.length - 1]!.text.trim() === ''
  ) {
    currentBlock.lines.pop();
  }

  const lastLine =
    currentBlock.lines.length > 0
      ? currentBlock.lines[currentBlock.lines.length - 1]!.lineNumber
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

// ---------------------------------------------------------------------------
// Category / rarity / attunement parsing
// ---------------------------------------------------------------------------

interface ParsedMetaLine {
  category: MagicItemCategory;
  rarity: MagicItemRarity;
  variableRarity?: { rarity: MagicItemRarity; qualifier?: string }[];
  requiresAttunement: boolean;
  attunementPrerequisites?: string;
  baseItemRestriction?: string;
  baseItem?: string;
  /** Any trailing text on the same line after the closing * of the meta line */
  trailingText?: string;
}

function parseMetaLine(line: string): ParsedMetaLine | null {
  // The meta line is wrapped in *...*
  // Sometimes there's trailing description text: *Meta* Description here
  const match = line.match(/^\*(.+?)\*\s*(.*)$/);
  if (!match) return null;

  const content = match[1]!.trim();

  // Parse attunement
  let requiresAttunement = false;
  let attunementPrerequisites: string | undefined;
  let contentWithoutAttunement = content;

  const attunementMatch = content.match(/\(Requires Attunement(?:\s+(.+?))?\)/i);
  if (attunementMatch) {
    requiresAttunement = true;
    if (attunementMatch[1]) {
      attunementPrerequisites = attunementMatch[1].replace(/^by\s+/i, '').trim();
    }
    contentWithoutAttunement = content.replace(/\s*\(Requires Attunement(?:\s+.+?)?\)/i, '').trim();
  }

  // Parse category — it's everything before the first comma that matches a known category
  // Patterns:
  //   "Armor (Any Medium or Heavy, Except Hide Armor), Uncommon"
  //   "Weapon (Dagger), Rare"
  //   "Wondrous Item, Rare"
  //   "Staff, Very Rare"
  //   "Wand, Uncommon"
  //   "Ring, Rare"

  let category: MagicItemCategory | undefined;
  let rarity: MagicItemRarity | undefined;
  let baseItemRestriction: string | undefined;
  let baseItem: string | undefined;
  let variableRarity: { rarity: MagicItemRarity; qualifier?: string }[] | undefined;

  // Try to match category with parenthesized base item info
  const categoryWithParenMatch = contentWithoutAttunement.match(
    /^(Armor|Weapon)\s*\((.+?)\)\s*,\s*(.+)$/i,
  );

  if (categoryWithParenMatch) {
    const catStr = categoryWithParenMatch[1]!.toLowerCase();
    category = CATEGORY_MAP[catStr];
    const baseInfo = categoryWithParenMatch[2]!.trim();
    const rarityStr = categoryWithParenMatch[3]!.trim();

    // Determine if this is a specific base item or a restriction
    if (baseInfo.toLowerCase().startsWith('any') || baseInfo.includes(',')) {
      baseItemRestriction = baseInfo;
    } else {
      // Could be multiple specific items: "Battleaxe, Greataxe, or Halberd"
      // or a single item: "Dagger", "Plate Armor"
      if (baseInfo.includes(' or ')) {
        baseItemRestriction = baseInfo;
      } else {
        baseItem = baseInfo;
      }
    }

    const parsedRarity = parseRarityString(rarityStr);
    rarity = parsedRarity.primary;
    variableRarity = parsedRarity.variable;
  } else {
    // Simple category, rarity pattern: "Wondrous Item, Rare" or "Staff, Very Rare"
    const simpleCategoryMatch = contentWithoutAttunement.match(/^(.+?),\s*(.+)$/);
    if (simpleCategoryMatch) {
      const catStr = simpleCategoryMatch[1]!.trim().toLowerCase();
      const rarityStr = simpleCategoryMatch[2]!.trim();

      category = CATEGORY_MAP[catStr];
      if (!category) {
        // Could still be "Armor (Shield)" without matching above — try harder
        const subMatch = catStr.match(/^(armor|weapon)\s*\((.+)\)$/i);
        if (subMatch) {
          category = CATEGORY_MAP[subMatch[1]!.toLowerCase()];
          const baseInfo = subMatch[2]!.trim();
          if (baseInfo.toLowerCase().startsWith('any') || baseInfo.includes(',')) {
            baseItemRestriction = baseInfo;
          } else if (baseInfo.includes(' or ')) {
            baseItemRestriction = baseInfo;
          } else {
            baseItem = baseInfo;
          }
        }
      }

      const parsedRarity = parseRarityString(rarityStr);
      rarity = parsedRarity.primary;
      variableRarity = parsedRarity.variable;
    }
  }

  // Handle "Rarity Varies" as a fallback
  if (!rarity) {
    if (contentWithoutAttunement.toLowerCase().includes('rarity varies')) {
      rarity = 'uncommon'; // default; the actual rarity is in a table
    }
  }

  if (!category || !rarity) return null;

  // Capture any trailing text after the closing *
  const trailingText = match[2] ? match[2].trim() : undefined;

  return {
    category,
    rarity,
    variableRarity,
    requiresAttunement,
    attunementPrerequisites,
    baseItemRestriction,
    baseItem,
    trailingText: trailingText || undefined,
  };
}

interface ParsedRarity {
  primary: MagicItemRarity;
  variable?: { rarity: MagicItemRarity; qualifier?: string }[];
}

function parseRarityString(str: string): ParsedRarity {
  const lower = str.toLowerCase().trim();

  // Check for "Rarity Varies"
  if (lower.includes('rarity varies')) {
    return { primary: 'uncommon' };
  }

  // Check for variable rarity: "Uncommon (+1), Rare (+2), or Very Rare (+3)"
  // Also handles: "Rare (+1), Very Rare (+2), or Legendary (+3)"
  const variableMatch = str.match(
    /(\w[\w\s]*?)\s*\(([^)]+)\)\s*,\s*(\w[\w\s]*?)\s*\(([^)]+)\)\s*,?\s*or\s+(\w[\w\s]*?)\s*\(([^)]+)\)/i,
  );
  if (variableMatch) {
    const entries: { rarity: MagicItemRarity; qualifier?: string }[] = [];
    const pairs = [
      [variableMatch[1]!, variableMatch[2]!],
      [variableMatch[3]!, variableMatch[4]!],
      [variableMatch[5]!, variableMatch[6]!],
    ] as const;

    for (const [rarStr, qual] of pairs) {
      const r = RARITY_MAP[rarStr.trim().toLowerCase()];
      if (r) {
        entries.push({ rarity: r, qualifier: qual.trim() });
      }
    }

    if (entries.length > 0) {
      return { primary: entries[0]!.rarity, variable: entries };
    }
  }

  // Simple rarity
  for (const [key, value] of Object.entries(RARITY_MAP)) {
    if (lower === key || lower.startsWith(key)) {
      return { primary: value };
    }
  }

  // Fallback: try matching each rarity anywhere in the string
  // Priority: longer names first to avoid "rare" matching before "very rare"
  const sortedRarities = Object.entries(RARITY_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [key, value] of sortedRarities) {
    if (lower.includes(key)) {
      return { primary: value };
    }
  }

  return { primary: 'uncommon' };
}

// ---------------------------------------------------------------------------
// Charges parsing
// ---------------------------------------------------------------------------

function parseCharges(description: string): MagicItemChargesV2 | undefined {
  // Match patterns like:
  //   "has 10 charges"
  //   "has 3 charges"
  //   "starts with 10 charges"
  //   "The staff has 10 charges"
  const chargesMatch = description.match(/(?:has|starts?\s+with)\s+(\d+)\s+charges?/i);
  if (!chargesMatch) return undefined;

  const max = parseInt(chargesMatch[1]!, 10);

  // Parse recharge: "regains 1d6 + 4 expended charges daily at dawn"
  // Also: "regains 1d3 expended charges daily at dawn"
  // Also: "regains all expended charges daily at dawn"
  // Also: "regains 1d4 expended charges daily at dawn"
  let rechargeAmount: string | undefined;
  let rechargeCondition: string | undefined;

  const rechargeMatch = description.match(
    /regains?\s+([\dd+\s]+|all)\s+expended\s+charges?\s+(daily\s+at\s+dawn|at\s+dawn|at\s+the\s+next\s+dawn)/i,
  );
  if (rechargeMatch) {
    rechargeAmount = rechargeMatch[1]!.replace(/\s+/g, '').trim();
    if (rechargeAmount.toLowerCase() === 'all') {
      rechargeAmount = 'all';
    }
    rechargeCondition = 'at dawn';
  }

  return { max, rechargeAmount, rechargeCondition };
}

// ---------------------------------------------------------------------------
// Ability parsing
// ---------------------------------------------------------------------------

function parseAbilities(lines: string[]): MagicItemAbilityV2[] {
  const abilities: MagicItemAbilityV2[] = [];
  const joined = lines.join('\n');

  // Look for bold-italic ability headers: **_Name._** or **_Name_**
  // These mark distinct named abilities
  const abilityPattern = /\*\*_([^_]+?)\.?_\*\*/g;
  let match: RegExpExecArray | null;
  const abilityPositions: { name: string; index: number }[] = [];

  while ((match = abilityPattern.exec(joined)) !== null) {
    abilityPositions.push({ name: match[1]!.trim(), index: match.index });
  }

  for (let i = 0; i < abilityPositions.length; i++) {
    const pos = abilityPositions[i]!;
    const nextPos = abilityPositions[i + 1];
    const endIndex = nextPos ? nextPos.index : joined.length;
    const fullText = joined.slice(pos.index, endIndex).trim();

    // Remove the header from description
    const headerEnd = fullText.indexOf('**', 3);
    const descriptionText =
      headerEnd >= 0 ? fullText.slice(headerEnd + 2).trim() : fullText;

    const ability: MagicItemAbilityV2 = {
      name: pos.name,
      description: descriptionText,
    };

    // Parse activation type from description
    ability.activation = parseActivationType(descriptionText);

    // Parse charge cost
    const chargeCostMatch = descriptionText.match(
      /expend\s+(\d+)\s+(?:of\s+(?:its|the)\s+)?charges?/i,
    );
    if (chargeCostMatch) {
      ability.chargeCost = parseInt(chargeCostMatch[1]!, 10);
    } else {
      // "expend 1 or more charges"
      const oneChargeMatch = descriptionText.match(/expend\s+1\s+charge/i);
      if (oneChargeMatch) {
        ability.chargeCost = 1;
      }
    }

    // Parse spell references: *SpellName* (italics that reference spells)
    const spellMatch = descriptionText.match(
      /cast\s+\*([^*]+)\*/i,
    );
    if (spellMatch) {
      ability.spellKey = `spell:${spellSlugFromName(spellMatch[1]!)}`;

      // Check for level version: "(level N version)"
      const levelMatch = descriptionText.match(
        /\*[^*]+\*\s*\(level\s+(\d+)\s+version\)/i,
      );
      if (levelMatch) {
        ability.spellLevel = parseInt(levelMatch[1]!, 10);
      }
    }

    abilities.push(ability);
  }

  return abilities;
}

function parseActivationType(text: string): ActivationType | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('magic action')) return 'magicAction';
  if (lower.includes('bonus action')) return 'bonusAction';
  if (lower.includes('reaction')) return 'reaction';
  if (lower.includes('utilize action') || lower.includes('take an action')) return 'action';
  return undefined;
}

// ---------------------------------------------------------------------------
// Spell table parsing (for charged items with spell lists)
// ---------------------------------------------------------------------------

interface SpellTableEntry {
  spellName: string;
  chargeCost: string;
  spellLevel?: number;
}

function parseSpellTable(lines: string[]): SpellTableEntry[] {
  const entries: SpellTableEntry[] = [];
  let inTable = false;
  let headerSeen = false;

  for (const line of lines) {
    if (line.includes('| Spell') && line.includes('Charge Cost')) {
      inTable = true;
      headerSeen = false;
      continue;
    }

    if (inTable && line.match(/^\|[-|]+\|$/)) {
      headerSeen = true;
      continue;
    }

    if (inTable && headerSeen && line.startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cells.length >= 2) {
        let spellName = cells[0]!;
        const chargeCost = cells[1]!;

        // Check for level version: "Fireball (level 5 version)"
        let spellLevel: number | undefined;
        const levelMatch = spellName.match(/^(.+?)\s*\(level\s+(\d+)\s+version\)/i);
        if (levelMatch) {
          spellName = levelMatch[1]!.trim();
          spellLevel = parseInt(levelMatch[2]!, 10);
        }

        // Check for save DC in spell name: "Scrying (save DC 18)"
        spellName = spellName.replace(/\s*\(save DC \d+\)/i, '').trim();

        // Strip any remaining parenthetical qualifiers:
        //   Command ("flee" or "grovel" only) → Command
        //   Fear (60-foot Cone) → Fear
        spellName = spellName.replace(/\s*\(.*\)\s*$/, '').trim();

        entries.push({ spellName, chargeCost, spellLevel });
      }
    } else if (inTable && headerSeen && !line.startsWith('|')) {
      inTable = false;
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main item parsing
// ---------------------------------------------------------------------------

function parseOneItem(block: RawItemBlock): MagicItemV2 | null {
  const { name, lines, headerLineNumber, endLineNumber, rawMarkdown } = block;

  // First non-empty line should be the meta line
  const metaLineIndex = lines.findIndex((l) => l.trim().length > 0);
  if (metaLineIndex < 0) return null;

  const metaLine = lines[metaLineIndex]!;
  const meta = parseMetaLine(metaLine);
  if (!meta) {
    console.warn(`  ⚠ Could not parse meta line for "${name}": ${metaLine}`);
    return null;
  }

  // Remaining lines after meta are the description
  const descriptionLines = lines.slice(metaLineIndex + 1);

  // If the meta line had trailing text (description on same line), prepend it
  if (meta.trailingText) {
    descriptionLines.unshift(meta.trailingText);
  }

  // Skip leading empty lines in description
  while (descriptionLines.length > 0 && descriptionLines[0]!.trim() === '') {
    descriptionLines.shift();
  }

  const fullDescription = descriptionLines.join('\n').trim();

  const slug = slugify(name);

  const item: MagicItemV2 = {
    key: `item:${slug}`,
    slug,
    name,
    source: 'srd',
    category: meta.category,
    rarity: meta.rarity,
    requiresAttunement: meta.requiresAttunement,
    description: fullDescription,
    raw: {
      sourceFile: SOURCE_FILE,
      startLine: headerLineNumber,
      endLine: endLineNumber,
      markdown: rawMarkdown,
    },
  };

  if (meta.variableRarity) {
    item.variableRarity = meta.variableRarity;
  }
  if (meta.attunementPrerequisites) {
    item.attunementPrerequisites = meta.attunementPrerequisites;
  }
  if (meta.baseItemRestriction) {
    item.baseItemRestriction = meta.baseItemRestriction;
  }
  if (meta.baseItem) {
    item.baseItem = meta.baseItem;
  }

  // Parse charges
  const charges = parseCharges(fullDescription);
  if (charges) {
    item.charges = charges;
  }

  // Parse spell table entries (for charged items)
  const spellTableEntries = parseSpellTable(descriptionLines);

  // Parse named abilities
  const abilities = parseAbilities(descriptionLines);

  // Convert spell table entries to abilities if they aren't already captured
  if (spellTableEntries.length > 0) {
    const existingSpellKeys = new Set(
      abilities.filter((a) => a.spellKey).map((a) => a.spellKey),
    );

    for (const entry of spellTableEntries) {
      const spellKey = `spell:${spellSlugFromName(entry.spellName)}`;
      if (!existingSpellKeys.has(spellKey)) {
        const cost = parseInt(entry.chargeCost, 10);
        abilities.push({
          name: entry.spellName,
          description: `Cast ${entry.spellName}${entry.spellLevel ? ` (level ${entry.spellLevel} version)` : ''}.`,
          activation: 'magicAction',
          chargeCost: isNaN(cost) ? undefined : cost,
          spellKey,
          spellLevel: entry.spellLevel,
        });
      }
    }
  }

  if (abilities.length > 0) {
    item.abilities = abilities;
  }

  return item;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const srcDir = path.join(__dirname, '..', 'src');
  const inputPath = path.resolve(srcDir, SOURCE_FILE);
  const outputPath = path.resolve(srcDir, 'magicItems.v2.json');

  console.log(`Reading ${inputPath}...`);
  const content = fs.readFileSync(inputPath, 'utf-8');

  console.log('Splitting into item blocks...');
  const blocks = splitIntoItemBlocks(content);
  console.log(`  Found ${blocks.length} item blocks`);

  const items: MagicItemV2[] = [];
  let skipped = 0;

  for (const block of blocks) {
    const item = parseOneItem(block);
    if (item) {
      items.push(item);
    } else {
      skipped++;
    }
  }

  console.log(`\nParsed ${items.length} magic items (${skipped} skipped)`);

  // Stats
  const byCategory = new Map<string, number>();
  const byRarity = new Map<string, number>();
  let withCharges = 0;
  let withAbilities = 0;
  let withAttunement = 0;

  for (const item of items) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
    byRarity.set(item.rarity, (byRarity.get(item.rarity) ?? 0) + 1);
    if (item.charges) withCharges++;
    if (item.abilities && item.abilities.length > 0) withAbilities++;
    if (item.requiresAttunement) withAttunement++;
  }

  console.log('\nBy category:');
  for (const [cat, count] of [...byCategory.entries()].sort()) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log('\nBy rarity:');
  for (const [rar, count] of [...byRarity.entries()].sort()) {
    console.log(`  ${rar}: ${count}`);
  }
  console.log(`\n  With charges: ${withCharges}`);
  console.log(`  With abilities: ${withAbilities}`);
  console.log(`  Requires attunement: ${withAttunement}`);

  // Check for duplicate keys
  const keys = new Set<string>();
  for (const item of items) {
    if (keys.has(item.key)) {
      console.warn(`  ⚠ Duplicate key: ${item.key}`);
    }
    keys.add(item.key);
  }

  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2) + '\n');
  console.log(`\nWrote ${outputPath}`);
}

main();
