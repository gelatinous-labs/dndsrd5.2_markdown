/**
 * V2 unified item combiner: equipment.json + magicItems.v2.json → items.v2.json
 *
 * Transforms equipment entries from v1 format (with synthetic ids) into v2 format
 * with stable key/slug, then combines with magic items into a single artifact.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// V1 equipment types (matches equipment.json shapes)
// ---------------------------------------------------------------------------

interface V1DiceExpression {
  count: number;
  die: string;
  modifier: number;
}

interface V1Cost {
  amount: number;
  currency: string;
}

interface V1Equipment {
  id: string;
  name: string;
  itemType: 'equipment';
  equipmentCategory: 'weapon' | 'armor' | 'tool' | 'gear';
  weight?: number;
  cost?: V1Cost;
  description?: string;
  // Weapon fields
  weaponType?: string;
  attackType?: string;
  damage?: { dice: V1DiceExpression; type: string };
  versatileDamage?: { dice: V1DiceExpression; type: string };
  properties?: string[];
  range?: { normal: number; long: number };
  mastery?: string;
  // Armor fields
  armorType?: string;
  ac?: { base: number; dexBonus?: boolean | string };
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
  // Tool fields
  toolType?: string;
  ability?: string;
  utilizeAction?: string;
  craftItems?: string[];
  variants?: { name: string; cost: V1Cost; weight?: number }[];
  // Gear fields
  gearType?: string;
  capacity?: string;
  usageAction?: string;
  packContents?: string[];
  focusType?: string;
  quantity?: number;
  storage?: string;
}

// ---------------------------------------------------------------------------
// V2 unified item type
// ---------------------------------------------------------------------------

interface ItemV2 {
  key: string;
  slug: string;
  name: string;
  source: string;
  kind: 'equipment' | 'magicItem';
  /** Equipment payload (present when kind=equipment) */
  equipment?: Record<string, unknown>;
  /** Magic item payload (present when kind=magicItem) */
  magicItem?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Equipment transformation
// ---------------------------------------------------------------------------

function transformEquipment(v1: V1Equipment): ItemV2 {
  const slug = slugify(v1.name);

  // Build the equipment payload — everything except the synthetic id
  const payload: Record<string, unknown> = {
    equipmentCategory: v1.equipmentCategory,
  };

  // Copy all structured fields from v1 (excluding id, name, itemType, equipmentCategory)
  if (v1.weight !== undefined) payload.weight = v1.weight;
  if (v1.cost) payload.cost = v1.cost;
  if (v1.description) payload.description = v1.description;

  // Weapon fields
  if (v1.weaponType) payload.weaponType = v1.weaponType;
  if (v1.attackType) payload.attackType = v1.attackType;
  if (v1.damage) payload.damage = v1.damage;
  if (v1.versatileDamage) payload.versatileDamage = v1.versatileDamage;
  if (v1.properties) payload.properties = v1.properties;
  if (v1.range) payload.range = v1.range;
  if (v1.mastery) payload.mastery = v1.mastery;

  // Armor fields
  if (v1.armorType) payload.armorType = v1.armorType;
  if (v1.ac) payload.ac = v1.ac;
  if (v1.strengthRequirement !== undefined) payload.strengthRequirement = v1.strengthRequirement;
  if (v1.stealthDisadvantage !== undefined) payload.stealthDisadvantage = v1.stealthDisadvantage;

  // Tool fields
  if (v1.toolType) payload.toolType = v1.toolType;
  if (v1.ability) payload.ability = v1.ability;
  if (v1.utilizeAction) payload.utilizeAction = v1.utilizeAction;
  if (v1.craftItems) payload.craftItems = v1.craftItems;
  if (v1.variants) payload.variants = v1.variants;

  // Gear fields
  if (v1.gearType) payload.gearType = v1.gearType;
  if (v1.capacity) payload.capacity = v1.capacity;
  if (v1.usageAction) payload.usageAction = v1.usageAction;
  if (v1.packContents) payload.packContents = v1.packContents;
  if (v1.focusType) payload.focusType = v1.focusType;
  if (v1.quantity !== undefined) payload.quantity = v1.quantity;
  if (v1.storage) payload.storage = v1.storage;

  return {
    key: `item:${slug}`,
    slug,
    name: v1.name,
    source: 'srd',
    kind: 'equipment',
    equipment: payload,
  };
}

// ---------------------------------------------------------------------------
// Magic item transformation (already v2, just wrap in unified shape)
// ---------------------------------------------------------------------------

interface MagicItemV2Input {
  key: string;
  slug: string;
  name: string;
  source: string;
  [field: string]: unknown;
}

function transformMagicItem(mi: MagicItemV2Input): ItemV2 {
  // Extract the top-level v2 fields, put everything else in the magicItem payload
  const { key, slug, name, source, ...rest } = mi;

  return {
    key,
    slug,
    name,
    source,
    kind: 'magicItem',
    magicItem: rest,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const srcDir = path.join(__dirname, '..', 'src');
  const equipmentPath = path.resolve(srcDir, 'equipment.json');
  const magicItemsPath = path.resolve(srcDir, 'magicItems.v2.json');
  const outputPath = path.resolve(srcDir, 'items.v2.json');

  // Load equipment
  console.log(`Loading ${equipmentPath}...`);
  const equipmentRaw: V1Equipment[] = JSON.parse(
    fs.readFileSync(equipmentPath, 'utf-8'),
  );
  console.log(`  ${equipmentRaw.length} equipment items`);

  // Load magic items
  console.log(`Loading ${magicItemsPath}...`);
  const magicItemsRaw: MagicItemV2Input[] = JSON.parse(
    fs.readFileSync(magicItemsPath, 'utf-8'),
  );
  console.log(`  ${magicItemsRaw.length} magic items`);

  // Transform
  const equipmentV2 = equipmentRaw.map(transformEquipment);
  const magicItemsV2 = magicItemsRaw.map(transformMagicItem);

  // Build magic item key set for collision detection
  const magicItemKeys = new Set(magicItemsV2.map((mi) => mi.key));

  // Disambiguate equipment items that collide with magic items
  for (const eq of equipmentV2) {
    if (magicItemKeys.has(eq.key)) {
      const cat = (eq.equipment?.equipmentCategory as string) ?? 'equipment';
      eq.slug = `${eq.slug}-${cat}`;
      eq.key = `item:${eq.slug}`;
      console.log(`  Disambiguated equipment collision: ${eq.name} → ${eq.key}`);
    }
  }

  // Combine
  const allItems: ItemV2[] = [...equipmentV2, ...magicItemsV2];

  // Check for duplicate keys
  const keys = new Set<string>();
  let dupes = 0;
  for (const item of allItems) {
    if (keys.has(item.key)) {
      console.warn(`  ⚠ Duplicate key: ${item.key}`);
      dupes++;
    }
    keys.add(item.key);
  }

  console.log(`\nCombined: ${allItems.length} items (${equipmentV2.length} equipment + ${magicItemsV2.length} magic items)`);
  if (dupes > 0) {
    console.warn(`  ⚠ ${dupes} duplicate keys found`);
  }

  // Stats
  const byKind = new Map<string, number>();
  for (const item of allItems) {
    byKind.set(item.kind, (byKind.get(item.kind) ?? 0) + 1);
  }
  console.log('\nBy kind:');
  for (const [kind, count] of [...byKind.entries()].sort()) {
    console.log(`  ${kind}: ${count}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(allItems, null, 2) + '\n');
  console.log(`\nWrote ${outputPath}`);
}

main();
