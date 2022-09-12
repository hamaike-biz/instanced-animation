import { Material, MeshBasicMaterial, MeshStandardMaterial } from 'three';
export declare class LightWeightMaterial extends MeshBasicMaterial {
    static fromMeshStandardMaterial(source: MeshStandardMaterial): LightWeightMaterial;
    constructor({ emissive, emissiveMap, emissiveIntensity, ...rest }?: any);
    copy(source: any): this;
}
export declare function convertToLightWeightMaterial(source: Material | Material[]): Material | Material[] | LightWeightMaterial;
//# sourceMappingURL=LightWeightMaterial.d.ts.map