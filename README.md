# Install
```
yarn add instanced-animation
```

# Usage
```
import InstancedAnimation from 'instanced-animation';

// create instance
const instancedAnimation = new InstancedAnimation(gltf, INSTANCE_COUNT);
scene.add(instancedAnimation.instancedMesh)

// play Animation
instancedAnimation.playAnimation(targetIndex, animName);

// "animName" can be set by using the Blender Addon
```

The following InstancedMesh features are still available.
```
object3D.updateMatrix();
instancedMesh.setMatrixAt(instanceIndex, object3D.matrix);
instancedMesh.instanceMatrix.needsUpdate = true;
```

# Blender Addon is here.
https://github.com/hamaike-biz/skinning2morph

# Release Memo
```
npm run build
npm publish
```
