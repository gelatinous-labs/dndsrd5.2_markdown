import type { ClassFeature, ClassName, DamageType, DiceExpression, FeatureAction, LevelProgression, SubclassFeature, CoreClassTraits, ClassSpellcasting, ClassResource, ScalingValue, ClassOption } from './types';
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
    key: string;
    slug: string;
    name: string;
    classSlug: ClassName;
    description?: string;
    tenets?: string[];
    features: SubclassFeatureV2[];
    subclassSpells?: {
        level: number;
        spells: string[];
    }[];
}
export interface ClassDefinitionV2 {
    key: string;
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
