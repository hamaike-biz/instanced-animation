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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = __importStar(require("three"));
const LightWeightMaterial_1 = require("./utils/LightWeightMaterial");
const animations_1 = require("./constants/animations");
class InstancedAnimation {
    vertexAnimationTexture;
    durationAnimation = 0;
    originalMesh;
    tHeight;
    tWidth;
    animations;
    durationSum;
    animOrder;
    fullDuration;
    createdGeometry;
    createdMaterial;
    materialShader;
    instanceCount;
    // mesh
    instancedMesh;
    previewMesh;
    // Attributes
    vertices = [];
    uvs = [];
    reference = [];
    indices = [];
    animSpeed;
    animDuration;
    animOffset;
    constructor(gltf, instanceCount) {
        this.createdGeometry = new THREE.BufferGeometry();
        this.instanceCount = instanceCount;
        this.animations = gltf.animations;
        console.info('animations', this.animations);
        this.durationSum = 0;
        this.animations.forEach(item => {
            this.durationSum += item.duration;
        });
        this.animations.forEach(item => {
            const data = {
                name: item.name,
                durationRatio: item.duration / this.durationSum
            };
        });
        // this.durationAnimation = Math.round(animations[0].duration * 120);
        this.durationAnimation = Math.round(this.durationSum * 30);
        const originalMesh = gltf.scene.children[0];
        if (!(originalMesh instanceof THREE.Mesh))
            throw Error('Mesh could not be retrieved.');
        this.animOrder = this.createAnimOrder(originalMesh);
        console.info('animOrder', this.animOrder);
        this.originalMesh = originalMesh;
        const originalGeo = this.originalMesh.geometry.clone();
        const size = this.getAnimTextureSize(originalGeo);
        this.tHeight = size.tHeight;
        this.tWidth = size.tWidth;
        this.fullDuration = this.durationAnimation / this.tHeight;
        this.createAnimTexture(originalGeo, this.tHeight, this.tWidth);
        this.createVertices(originalGeo);
        this.createUvs(originalGeo);
        this.createReferenceAttr(originalGeo);
        this.createIndices(originalGeo);
        this.animSpeed = this.createAnimSpeedAttr();
        this.animDuration = this.createAnimDurationAttr();
        this.animOffset = this.createAnimOffsetAttr();
        this.setAttributes();
        this.createdMaterial = this.createMaterial();
        this.previewMesh = this.createPreviewMesh();
        this.instancedMesh = this.createInstancedMesh();
    }
    createAnimOrder(originalMesh) {
        const animOrder = new Set();
        if (originalMesh.userData.targetNames &&
            Array.isArray(originalMesh.userData.targetNames)) {
            const targetNames = originalMesh.userData.targetNames;
            targetNames.forEach((name) => {
                const animName = name.split('_')[0];
                animOrder.add(animName);
            });
        }
        else {
            throw Error('Mesh の userData に targetNames が存在しません');
        }
        return animOrder;
    }
    getAnimDuration(animName) {
        const clip = this.animations.find(clip => clip.name === animName);
        if (!clip)
            throw Error('この名前の clip は存在しません');
        const duration = (clip.duration / this.durationSum) * this.fullDuration;
        // const test = Math.floor(duration * 1000000000) / 1000000000;
        // console.log('getAnimDuration', duration, test);
        // return test;
        return duration;
    }
    getAnimOffset(animName) {
        const animOrder = Array.from(this.animOrder);
        let offset = 0;
        for (let i = 0; i < animOrder.length; i++) {
            const name = animOrder[i];
            if (animName === name)
                break;
            const duration = this.getAnimDuration(name);
            if (duration)
                offset += duration;
        }
        return offset;
    }
    getAnimData(animName) {
        const duration = this.getAnimDuration(animName);
        const offset = this.getAnimOffset(animName);
        return { duration, offset };
    }
    createAnimSpeedAttr = () => {
        const animData = this.getAnimData(animations_1.WALK);
        const animSpeed = new THREE.InstancedBufferAttribute(new Float32Array(this.instanceCount * 1), 1, false);
        for (let i = 0; i < this.instanceCount; i++) {
            animSpeed.setX(i, animData.duration);
        }
        return animSpeed;
    };
    createAnimDurationAttr = () => {
        const animData = this.getAnimData(animations_1.WALK);
        const animDuration = new THREE.InstancedBufferAttribute(new Float32Array(this.instanceCount * 1), 1, false);
        for (let i = 0; i < this.instanceCount; i++) {
            animDuration.setX(i, animData.duration);
        }
        return animDuration;
    };
    createAnimOffsetAttr = () => {
        const animData = this.getAnimData(animations_1.WALK);
        const animOffset = new THREE.InstancedBufferAttribute(new Float32Array(this.instanceCount * 1), 1, false);
        for (let i = 0; i < this.instanceCount; i++) {
            animOffset.setX(i, animData.offset);
        }
        return animOffset;
    };
    createPreviewMesh = () => {
        console.log('this.vertexAnimationTexture', this.vertexAnimationTexture?.image.width, this.vertexAnimationTexture?.image.height);
        const geometry = new THREE.PlaneGeometry(3, 3);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.FrontSide,
            map: this.vertexAnimationTexture
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(0, 2, -3);
        return plane;
    };
    getAnimTextureSize(originalGeo) {
        const tHeight = this.nextPowerOf2(this.durationAnimation);
        const tWidth = this.nextPowerOf2(originalGeo.getAttribute('position').count);
        return { tHeight, tWidth };
    }
    createAnimTexture = (originalGeo, tHeight, tWidth) => {
        const morphAttributes = originalGeo.morphAttributes.position;
        const tData = new Float32Array(4 * tWidth * tHeight);
        for (let i = 0; i < tWidth; i++) {
            for (let j = 0; j < tHeight; j++) {
                const offset = j * tWidth * 4;
                const curMorph = Math.floor((j / this.durationAnimation) * morphAttributes.length);
                const nextMorph = (Math.floor((j / this.durationAnimation) * morphAttributes.length) +
                    1) %
                    morphAttributes.length;
                const lerpAmount = ((j / this.durationAnimation) * morphAttributes.length) % 1;
                if (j < this.durationAnimation) {
                    let d0, d1;
                    d0 = morphAttributes[curMorph].array[i * 3];
                    d1 = morphAttributes[nextMorph].array[i * 3];
                    if (d0 !== undefined && d1 !== undefined)
                        tData[offset + i * 4] = this.lerp(d0, d1, lerpAmount);
                    d0 = morphAttributes[curMorph].array[i * 3 + 1];
                    d1 = morphAttributes[nextMorph].array[i * 3 + 1];
                    if (d0 !== undefined && d1 !== undefined)
                        tData[offset + i * 4 + 1] = this.lerp(d0, d1, lerpAmount);
                    d0 = morphAttributes[curMorph].array[i * 3 + 2];
                    d1 = morphAttributes[nextMorph].array[i * 3 + 2];
                    if (d0 !== undefined && d1 !== undefined)
                        tData[offset + i * 4 + 2] = this.lerp(d0, d1, lerpAmount);
                    tData[offset + i * 4 + 3] = 1;
                }
            }
        }
        this.vertexAnimationTexture = new THREE.DataTexture(tData, tWidth, tHeight, THREE.RGBAFormat, THREE.FloatType);
        this.vertexAnimationTexture.needsUpdate = true;
    };
    createVertices = (originalGeo) => {
        const totalVertices = originalGeo.getAttribute('position').count * 3;
        for (let i = 0; i < totalVertices; i++) {
            const bIndex = i % (originalGeo.getAttribute('position').count * 3);
            this.vertices.push(originalGeo.getAttribute('position').array[bIndex]);
            // color.push(originalGeo.getAttribute('color').array[bIndex]);
        }
    };
    createUvs = (originalGeo) => {
        const totalVertices = originalGeo.getAttribute('position').count * 3;
        for (let i = 0; i < totalVertices; i++) {
            const bIndex = i % (originalGeo.getAttribute('uv').count * 2);
            this.uvs.push(originalGeo.getAttribute('uv').array[bIndex]);
            // color.push(originalGeo.getAttribute('color').array[bIndex]);
        }
    };
    createReferenceAttr = (originalGeo) => {
        if (!(this.tWidth && this.tHeight)) {
            throw Error('tWidth tHeight が設定されていません');
        }
        console.log('createReferenceAttr', this.tWidth, this.tHeight, this.durationAnimation, this.durationAnimation / this.tHeight);
        for (let i = 0; i < originalGeo.getAttribute('position').count; i++) {
            const bIndex = i % originalGeo.getAttribute('position').count;
            this.reference.push(bIndex / this.tWidth, this.durationAnimation / this.tHeight);
        }
    };
    createIndices = (originalGeo) => {
        if (!originalGeo.index)
            throw Error('originalGeo.index がありません');
        for (let i = 0; i < originalGeo.index.array.length; i++) {
            const offset = Math.floor(i / originalGeo.index.array.length) *
                originalGeo.getAttribute('position').count;
            this.indices.push(originalGeo.index.array[i % originalGeo.index.array.length] + offset);
        }
    };
    setAttributes = () => {
        this.createdGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.vertices), 3));
        this.createdGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uvs), 2));
        this.createdGeometry.setAttribute('reference', new THREE.BufferAttribute(new Float32Array(this.reference), 2));
        this.createdGeometry.setIndex(this.indices);
        this.createdGeometry.setAttribute('animSpeed', this.animSpeed);
        this.createdGeometry.setAttribute('animDuration', this.animDuration);
        this.createdGeometry.setAttribute('animOffset', this.animOffset);
    };
    createMaterial = () => {
        if (!this.originalMesh)
            throw Error('originalMesh が存在しません');
        if (!(this.originalMesh.material instanceof THREE.Material))
            throw Error('originalMesh.material が存在しません');
        const lightWeightMaterial = (0, LightWeightMaterial_1.convertToLightWeightMaterial)(this.originalMesh.material);
        const material = lightWeightMaterial.clone();
        // const material = this.originalMesh.material.clone();
        console.log('material', material);
        material.onBeforeCompile = shader => {
            shader.uniforms.vertexAnimationTexture = {
                value: this.vertexAnimationTexture
            };
            shader.uniforms.time = { value: 1.0 };
            shader.uniforms.size = { value: 10.0 };
            shader.uniforms.delta = { value: 0.0 };
            // let token = '#define STANDARD';
            //
            // let insert = /* glsl */ `
            // 			attribute vec4 reference;
            // 			uniform sampler2D textureAnimation;
            // 			uniform float size;
            // 			uniform float time;
            // 		`;
            //
            // shader.vertexShader = shader.vertexShader.replace(token, token + insert);
            let token = '#include <common>';
            let insert = /* glsl */ `
						attribute vec2 reference;
						attribute float animSpeed;
						attribute float animDuration;
						attribute float animOffset;
						uniform sampler2D vertexAnimationTexture;
						uniform float size;
						uniform float time;
					`;
            shader.vertexShader = shader.vertexShader.replace(token, token + insert);
            token = '#include <begin_vertex>';
            // float yCoord = mod( time * animSpeed, reference.y );
            // vec3 aniPos = texture2D( textureAnimation, vec2( reference.x, yCoord ) ).xyz;
            insert = /* glsl */ `
            float result = mod( time * animSpeed, animDuration );
            float yCoord = animOffset + result;
						vec3 aniPos = texture2D( vertexAnimationTexture, vec2( reference.x, yCoord ) ).xyz;
						vec3 newPosition = position;
						newPosition = mat3( modelMatrix ) * ( newPosition + aniPos );
						newPosition *= size * 0.2;
						vec3 transformed = vec3( newPosition );
					`;
            shader.vertexShader = shader.vertexShader.replace(token, insert);
            this.materialShader = shader;
            // console.log(shader.vertexShader);
        };
        return material;
    };
    get shader() {
        return this.materialShader;
    }
    nextPowerOf2 = (n) => {
        return Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));
    };
    lerp = (value1, value2, amount) => {
        amount = Math.max(Math.min(amount, 1), 0);
        return value1 + (value2 - value1) * amount;
    };
    getGeometry = () => {
        return this.createdGeometry;
    };
    getMaterial = () => {
        return this.createdMaterial;
    };
    getVertexAnimationTexture = () => {
        return this.vertexAnimationTexture;
    };
    createInstancedMesh() {
        const geometry = this.getGeometry();
        const material = this.getMaterial();
        return new THREE.InstancedMesh(geometry, material, this.instanceCount);
    }
    playAnimation(targetIndex, animName) {
        if (!this.animOrder.has(animName))
            return;
        const animData = this.getAnimData(animName);
        this.instancedMesh.geometry.attributes.animDuration.setX(targetIndex, animData.duration);
        this.instancedMesh.geometry.attributes.animDuration.needsUpdate = true;
        this.instancedMesh.geometry.attributes.animOffset.setX(targetIndex, animData.offset);
        this.instancedMesh.geometry.attributes.animOffset.needsUpdate = true;
    }
}
exports.default = InstancedAnimation;
