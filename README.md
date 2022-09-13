# Overview
The goal of this module is to allow you to animate a large number of 3D models and control the animation.

By extending Three.js [InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh) to automatically generate textures that hold morph information, animations can be performed within the Shader.

### Attention
In order for this module to work, you need the Blender Addon that I developed separately.

https://github.com/hamaike-biz/skinning2morph

# Install
```
yarn add instanced-animation
```

# Usage
```javascript
import InstancedAnimation from 'instanced-animation';

// create instance
const instancedAnimation = new InstancedAnimation(gltf, INSTANCE_COUNT);
scene.add(instancedAnimation.instancedMesh)

// play Animation
instancedAnimation.playAnimation(targetIndex, animName);

// "animName" can be set by using the Blender Addon
```

The following InstancedMesh features are still available.
```javascript
object3D.updateMatrix();
instancedMesh.setMatrixAt(instanceIndex, object3D.matrix);
instancedMesh.instanceMatrix.needsUpdate = true;
```

# Methods
### playAnimation( targetIndex: number, animationName: string)

targetIndex: Index of the instance for which you want to play the animation.

animationName: Animation name set by Blender.

# Note
- The loaded GLTF is converted to MeshBasicMaterial because it may appear black on low-performance machines when used as StandardMesh.

# Blender Addon is here.
https://github.com/hamaike-biz/skinning2morph

