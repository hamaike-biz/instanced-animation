import {Material, MeshBasicMaterial, MeshStandardMaterial} from 'three';

export class LightWeightMaterial extends MeshBasicMaterial {
  static fromMeshStandardMaterial(source: MeshStandardMaterial) {
    const material = new LightWeightMaterial();

    Material.prototype.copy.call(material, source);

    material.color.copy(source.color);

    material.map = source.map;
    // @ts-ignore
    material.lightMap = source.lightMap;
    // @ts-ignore
    material.lightMapIntensity = source.lightMapIntensity;

    material.aoMap = source.aoMap;
    material.aoMapIntensity = source.aoMapIntensity;

    material.alphaMap = source.alphaMap;

    material.wireframe = source.wireframe;
    material.wireframeLinewidth = source.wireframeLinewidth;
    material.wireframeLinecap = source.wireframeLinecap;
    material.wireframeLinejoin = source.wireframeLinejoin;

    material.visible = source.visible;

    return material;
  }

  constructor({emissive, emissiveMap, emissiveIntensity, ...rest}: any = {}) {
    super(rest);
  }

  copy(source: any) {
    super.copy(source);
    return this;
  }
}

export function convertToLightWeightMaterial(source: Material | Material[]) {
  if (source instanceof MeshStandardMaterial) {
    return LightWeightMaterial.fromMeshStandardMaterial(source);
  } else {
    return source;
  }
}
