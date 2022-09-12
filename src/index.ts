import * as THREE from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader';
import {convertToLightWeightMaterial} from './utils/LightWeightMaterial';
import {WALK} from './constants/animations';

class InstancedAnimation {
  private vertexAnimationTexture: THREE.DataTexture | undefined;
  private durationAnimation: number = 0;
  private originalMesh: THREE.Mesh | undefined;
  private tHeight: number | undefined;
  private tWidth: number | undefined;
  private animations: THREE.AnimationClip[];
  private durationSum: number;
  private animOrder: Set<string>;
  private fullDuration: number;
  private createdGeometry: THREE.BufferGeometry;
  private createdMaterial: THREE.Material;
  private materialShader: THREE.Shader | undefined;
  private instanceCount: number;
  // mesh
  public instancedMesh: THREE.InstancedMesh;
  public previewMesh: THREE.Mesh;

  // Attributes
  private vertices: number[] = [];
  private uvs: number[] = [];
  private reference: number[] = [];
  private indices: number[] = [];
  private animSpeed: THREE.InstancedBufferAttribute;
  private animDuration: THREE.InstancedBufferAttribute;
  private animOffset: THREE.InstancedBufferAttribute;

  constructor(gltf: GLTF, instanceCount: number) {
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
      throw Error('originalMesh が Meth型ではありません');

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

  private createAnimOrder(originalMesh: THREE.Mesh) {
    const animOrder = new Set<string>();
    if (
      originalMesh.userData.targetNames &&
      Array.isArray(originalMesh.userData.targetNames)
    ) {
      const targetNames = originalMesh.userData.targetNames;
      targetNames.forEach((name: string) => {
        const animName = name.split('_')[0];
        animOrder.add(animName);
      });
    } else {
      throw Error('Mesh の userData に targetNames が存在しません');
    }
    return animOrder;
  }

  private getAnimDuration(animName: string) {
    const clip = this.animations.find(clip => clip.name === animName);
    if (!clip) throw Error('この名前の clip は存在しません');
    const duration = (clip.duration / this.durationSum) * this.fullDuration;
    // const test = Math.floor(duration * 1000000000) / 1000000000;
    // console.log('getAnimDuration', duration, test);
    // return test;
    return duration;
  }

  private getAnimOffset(animName: string) {
    const animOrder = Array.from(this.animOrder);
    let offset = 0;
    for (let i = 0; i < animOrder.length; i++) {
      const name = animOrder[i];
      if (animName === name) break;
      const duration = this.getAnimDuration(name);
      if (duration) offset += duration;
    }
    return offset;
  }

  private getAnimData(animName: string) {
    const duration = this.getAnimDuration(animName);
    const offset = this.getAnimOffset(animName);
    return {duration, offset};
  }

  private createAnimSpeedAttr = () => {
    const animData = this.getAnimData(WALK);
    const animSpeed = new THREE.InstancedBufferAttribute(
      new Float32Array(this.instanceCount * 1),
      1,
      false
    );
    for (let i = 0; i < this.instanceCount; i++) {
      animSpeed.setX(i, animData.duration);
    }
    return animSpeed;
  };

  private createAnimDurationAttr = () => {
    const animData = this.getAnimData(WALK);
    const animDuration = new THREE.InstancedBufferAttribute(
      new Float32Array(this.instanceCount * 1),
      1,
      false
    );
    for (let i = 0; i < this.instanceCount; i++) {
      animDuration.setX(i, animData.duration);
    }
    return animDuration;
  };

  private createAnimOffsetAttr = () => {
    const animData = this.getAnimData(WALK);
    const animOffset = new THREE.InstancedBufferAttribute(
      new Float32Array(this.instanceCount * 1),
      1,
      false
    );
    for (let i = 0; i < this.instanceCount; i++) {
      animOffset.setX(i, animData.offset);
    }
    return animOffset;
  };

  private createPreviewMesh = () => {
    console.log(
      'this.vertexAnimationTexture',
      this.vertexAnimationTexture?.image.width,
      this.vertexAnimationTexture?.image.height
    );
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

  private getAnimTextureSize(originalGeo: THREE.BufferGeometry) {
    const tHeight = this.nextPowerOf2(this.durationAnimation);
    const tWidth = this.nextPowerOf2(
      originalGeo.getAttribute('position').count
    );
    return {tHeight, tWidth};
  }

  private createAnimTexture = (
    originalGeo: THREE.BufferGeometry,
    tHeight: number,
    tWidth: number
  ) => {
    const morphAttributes = originalGeo.morphAttributes.position;
    const tData = new Float32Array(4 * tWidth * tHeight);
    for (let i = 0; i < tWidth; i++) {
      for (let j = 0; j < tHeight; j++) {
        const offset = j * tWidth * 4;

        const curMorph = Math.floor(
          (j / this.durationAnimation) * morphAttributes.length
        );
        const nextMorph =
          (Math.floor((j / this.durationAnimation) * morphAttributes.length) +
            1) %
          morphAttributes.length;
        const lerpAmount =
          ((j / this.durationAnimation) * morphAttributes.length) % 1;

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

    this.vertexAnimationTexture = new THREE.DataTexture(
      tData,
      tWidth,
      tHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.vertexAnimationTexture.needsUpdate = true;
  };

  private createVertices = (originalGeo: THREE.BufferGeometry) => {
    const totalVertices = originalGeo.getAttribute('position').count * 3;

    for (let i = 0; i < totalVertices; i++) {
      const bIndex = i % (originalGeo.getAttribute('position').count * 3);
      this.vertices.push(originalGeo.getAttribute('position').array[bIndex]);
      // color.push(originalGeo.getAttribute('color').array[bIndex]);
    }
  };

  private createUvs = (originalGeo: THREE.BufferGeometry) => {
    const totalVertices = originalGeo.getAttribute('position').count * 3;

    for (let i = 0; i < totalVertices; i++) {
      const bIndex = i % (originalGeo.getAttribute('uv').count * 2);
      this.uvs.push(originalGeo.getAttribute('uv').array[bIndex]);
      // color.push(originalGeo.getAttribute('color').array[bIndex]);
    }
  };

  private createReferenceAttr = (originalGeo: THREE.BufferGeometry) => {
    if (!(this.tWidth && this.tHeight)) {
      throw Error('tWidth tHeight が設定されていません');
    }

    console.log(
      'createReferenceAttr',
      this.tWidth,
      this.tHeight,
      this.durationAnimation,
      this.durationAnimation / this.tHeight
    );

    for (let i = 0; i < originalGeo.getAttribute('position').count; i++) {
      const bIndex = i % originalGeo.getAttribute('position').count;
      this.reference.push(
        bIndex / this.tWidth,
        this.durationAnimation / this.tHeight
      );
    }
  };

  private createIndices = (originalGeo: THREE.BufferGeometry) => {
    if (!originalGeo.index) throw Error('originalGeo.index がありません');

    for (let i = 0; i < originalGeo.index.array.length; i++) {
      const offset =
        Math.floor(i / originalGeo.index.array.length) *
        originalGeo.getAttribute('position').count;
      this.indices.push(
        originalGeo.index.array[i % originalGeo.index.array.length] + offset
      );
    }
  };

  private setAttributes = () => {
    this.createdGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.vertices), 3)
    );
    this.createdGeometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(this.uvs), 2)
    );
    this.createdGeometry.setAttribute(
      'reference',
      new THREE.BufferAttribute(new Float32Array(this.reference), 2)
    );
    this.createdGeometry.setIndex(this.indices);
    this.createdGeometry.setAttribute('animSpeed', this.animSpeed);
    this.createdGeometry.setAttribute('animDuration', this.animDuration);
    this.createdGeometry.setAttribute('animOffset', this.animOffset);
  };

  private createMaterial = () => {
    if (!this.originalMesh) throw Error('originalMesh が存在しません');
    if (!(this.originalMesh.material instanceof THREE.Material))
      throw Error('originalMesh.material が存在しません');

    const lightWeightMaterial = convertToLightWeightMaterial(
      this.originalMesh.material
    ) as THREE.Material;

    const material = lightWeightMaterial.clone();

    // const material = this.originalMesh.material.clone();

    console.log('material', material);

    material.onBeforeCompile = shader => {
      shader.uniforms.vertexAnimationTexture = {
        value: this.vertexAnimationTexture
      };
      shader.uniforms.time = {value: 1.0};
      shader.uniforms.size = {value: 10.0};
      shader.uniforms.delta = {value: 0.0};

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

  private nextPowerOf2 = (n: number) => {
    return Math.pow(2, Math.ceil(Math.log(n) / Math.log(2)));
  };

  private lerp = (value1: number, value2: number, amount: number) => {
    amount = Math.max(Math.min(amount, 1), 0);
    return value1 + (value2 - value1) * amount;
  };

  private getGeometry = () => {
    return this.createdGeometry;
  };

  private getMaterial = () => {
    return this.createdMaterial;
  };

  getVertexAnimationTexture = () => {
    return this.vertexAnimationTexture;
  };

  private createInstancedMesh() {
    const geometry = this.getGeometry();
    const material = this.getMaterial();
    return new THREE.InstancedMesh(geometry, material, this.instanceCount);
  }

  public playAnimation(targetIndex: number, animName: string) {
    if (!this.animOrder.has(animName)) return;
    const animData = this.getAnimData(animName);
    this.instancedMesh.geometry.attributes.animDuration.setX(
      targetIndex,
      animData.duration
    );
    this.instancedMesh.geometry.attributes.animDuration.needsUpdate = true;
    this.instancedMesh.geometry.attributes.animOffset.setX(
      targetIndex,
      animData.offset
    );
    this.instancedMesh.geometry.attributes.animOffset.needsUpdate = true;
  }
}

export default InstancedAnimation;
