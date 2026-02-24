import * as fs from 'fs';
import * as path from 'path';
import type {
  ClassDefinition,
  ClassFeature,
  ClassName,
  DamageInstance,
  DamageType,
  DiceExpression,
  FeatureAction,
  LevelProgression,
  Subclass,
  SubclassFeature,
  CoreClassTraits,
  ClassSpellcasting,
  ClassResource,
  ScalingValue,
  ClassOption,
} from './types';

// -----------------------------------------------------------------------------
// Classes V2 generator
// -----------------------------------------------------------------------------
//
// Purpose:
// - Provide a compendium artifact that distinguishes external keys from DB ids:
//   top-level `key` + `slug`, and no synthetic `id` fields on child lists.
// - Keep `classes.json` as the legacy artifact (for compatibility), while
//   emitting `classes.v2.json` for downstream ingestion.
//

export interface DamageInstanceV2 {
  dice: DiceExpression;
  type: DamageType;
  condition?: string;
}

export type FeatureActionV2 = Omit<FeatureAction, 'damage'> & {
  damage?: DamageInstanceV2[];
};

export type ClassFeatureV2 = Omit<ClassFeature, 'actions'> & {
  actions?: FeatureActionV2[];
};

export type SubclassFeatureV2 = Omit<SubclassFeature, 'actions'> & {
  actions?: FeatureActionV2[];
};

export interface SubclassV2 {
  key: string; // e.g. "subclass:paladin:oath-of-devotion"
  slug: string;
  name: string;
  classSlug: ClassName;
  description?: string;
  tenets?: string[];
  features: SubclassFeatureV2[];
  subclassSpells?: { level: number; spells: string[] }[];
}

export interface ClassDefinitionV2 {
  key: string; // e.g. "class:barbarian"
  slug: ClassName;
  name: string;
  source: 'srd';

  coreTraits: CoreClassTraits;
  spellcasting?: ClassSpellcasting;
  resources?: ClassResource[];
  scalingValues?: ScalingValue[];

  levelProgression: LevelProgression[];
  features: ClassFeatureV2[];
  subclasses: SubclassV2[];
  subclassFeatureLevels: number[];

  spellList?: Record<number, string[]>;
  classOptions?: ClassOption[];
}

function toDamageV2(dmg: DamageInstance): DamageInstanceV2 {
  const { id: _id, ...rest } = dmg;
  return rest;
}

function toFeatureActionV2(action: FeatureAction): FeatureActionV2 {
  return {
    ...action,
    damage: action.damage?.map(toDamageV2),
  };
}

function toClassFeatureV2(feature: ClassFeature): ClassFeatureV2 {
  return {
    ...feature,
    actions: feature.actions?.map(toFeatureActionV2),
  };
}

function toSubclassFeatureV2(feature: SubclassFeature): SubclassFeatureV2 {
  return {
    ...feature,
    actions: feature.actions?.map(toFeatureActionV2),
  };
}

function toSubclassV2(subclass: Subclass): SubclassV2 {
  const slug = subclass.id;
  return {
    key: `subclass:${subclass.className}:${slug}`,
    slug,
    name: subclass.name,
    classSlug: subclass.className,
    description: subclass.description,
    tenets: subclass.tenets,
    features: (subclass.features ?? []).map(toSubclassFeatureV2),
    subclassSpells: subclass.subclassSpells,
  };
}

function toClassV2(cls: ClassDefinition): ClassDefinitionV2 {
  return {
    key: `class:${cls.id}`,
    slug: cls.id,
    name: cls.name,
    source: 'srd',

    coreTraits: cls.coreTraits,
    spellcasting: cls.spellcasting,
    resources: cls.resources,
    scalingValues: cls.scalingValues,

    levelProgression: cls.levelProgression,
    features: cls.features.map(toClassFeatureV2),
    subclasses: cls.subclasses.map(toSubclassV2),
    subclassFeatureLevels: cls.subclassFeatureLevels,

    spellList: cls.spellList,
    classOptions: cls.classOptions,
  };
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const inputPath = path.join(srcDir, 'classes.json');
  const outputPath = path.join(srcDir, 'classes.v2.json');

  console.log(`Reading classes from: ${inputPath}`);

  const raw = fs.readFileSync(inputPath, 'utf-8');
  const classes = JSON.parse(raw) as ClassDefinition[];

  const v2 = classes.map(toClassV2).sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(outputPath, JSON.stringify(v2, null, 2));
  console.log(`Wrote classes v2 to: ${outputPath}`);
}

main();

