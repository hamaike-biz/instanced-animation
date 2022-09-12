"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToLightWeightMaterial = exports.LightWeightMaterial = void 0;
const three_1 = require("three");
class LightWeightMaterial extends three_1.MeshBasicMaterial {
    static fromMeshStandardMaterial(source) {
        const material = new LightWeightMaterial();
        three_1.Material.prototype.copy.call(material, source);
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
    constructor({ emissive, emissiveMap, emissiveIntensity, ...rest } = {}) {
        super(rest);
    }
    copy(source) {
        super.copy(source);
        return this;
    }
}
exports.LightWeightMaterial = LightWeightMaterial;
function convertToLightWeightMaterial(source) {
    if (source instanceof three_1.MeshStandardMaterial) {
        return LightWeightMaterial.fromMeshStandardMaterial(source);
    }
    else {
        return source;
    }
}
exports.convertToLightWeightMaterial = convertToLightWeightMaterial;
