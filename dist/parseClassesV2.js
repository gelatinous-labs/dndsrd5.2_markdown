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
function toDamageV2(dmg) {
    const { id: _id, ...rest } = dmg;
    return rest;
}
function toFeatureActionV2(action) {
    return {
        ...action,
        damage: action.damage?.map(toDamageV2),
    };
}
function toClassFeatureV2(feature) {
    return {
        ...feature,
        actions: feature.actions?.map(toFeatureActionV2),
    };
}
function toSubclassFeatureV2(feature) {
    return {
        ...feature,
        actions: feature.actions?.map(toFeatureActionV2),
    };
}
function toSubclassV2(subclass) {
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
function toClassV2(cls) {
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
    const classes = JSON.parse(raw);
    const v2 = classes.map(toClassV2).sort((a, b) => a.name.localeCompare(b.name));
    fs.writeFileSync(outputPath, JSON.stringify(v2, null, 2));
    console.log(`Wrote classes v2 to: ${outputPath}`);
}
main();
