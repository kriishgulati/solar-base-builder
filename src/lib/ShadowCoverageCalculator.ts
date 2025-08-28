import * as THREE from 'three';

export interface ShadowCoverageOptions {
  rtSize?: number;
  eps?: number;
  cacheTTL?: number; // ms, 0 = no cache expiry
  debug?: boolean;
}

export interface ShadowCoverageResult {
  percent: number;
  totalPixels: number;
  shadowedPixels: number;
  at: number; // timestamp
}

export class ShadowCoverageCalculator {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private light: THREE.DirectionalLight;
  private options: Required<ShadowCoverageOptions>;
  private occluderRT: THREE.WebGLRenderTarget;
  private panelRT: THREE.WebGLRenderTarget;
  private depthMaterialAll: THREE.ShaderMaterial;
  private depthMaterialTop: THREE.ShaderMaterial;
  private cache: WeakMap<THREE.Object3D, ShadowCoverageResult> = new WeakMap();
  private debugCanvasA?: HTMLCanvasElement;
  private debugCanvasB?: HTMLCanvasElement;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, light: THREE.DirectionalLight, options: ShadowCoverageOptions = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.light = light;
    this.options = {
      rtSize: options.rtSize ?? 4096,
      eps: options.eps ?? 1e-4,
      cacheTTL: options.cacheTTL ?? 5000,
      debug: options.debug ?? false,
    };

    const size = this.options.rtSize;
    // Feature-detect float render targets
    const gl: WebGL2RenderingContext | WebGLRenderingContext = (this.renderer.getContext() as any);
    let rtType: THREE.TextureDataType = THREE.UnsignedByteType;
    const isWebGL2 = (gl as any).TEXTURE_BINDING_3D !== undefined;
    if (isWebGL2) {
      // Prefer full float if EXT_color_buffer_float is available; else try half float
      const hasFloatRT = this.renderer.capabilities.isWebGL2 && (gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float');
      const hasHalfFloatRT = this.renderer.capabilities.isWebGL2; // half float is core in WebGL2
      if (hasFloatRT) rtType = THREE.FloatType; else if (hasHalfFloatRT) rtType = THREE.HalfFloatType;
    } else {
      // WebGL1 fallbacks
      const halfExt = (gl as WebGLRenderingContext).getExtension('OES_texture_half_float');
      const halfRT = (gl as WebGLRenderingContext).getExtension('EXT_color_buffer_half_float');
      if (halfExt && halfRT) rtType = THREE.HalfFloatType; else rtType = THREE.UnsignedByteType;
    }
    const params = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: rtType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    } as const;

    this.occluderRT = new THREE.WebGLRenderTarget(size, size, params);
    this.panelRT = new THREE.WebGLRenderTarget(size, size, params);
    this.occluderRT.texture.generateMipmaps = false;
    this.panelRT.texture.generateMipmaps = false;

    // Depth for all faces
    this.depthMaterialAll = new THREE.ShaderMaterial({
      uniforms: {
        uNear: { value: 0.1 },
        uFar: { value: 1000.0 },
      },
      vertexShader: `
        varying float vDepth;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z; // view-space depth
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vDepth;
        uniform float uNear;
        uniform float uFar;
        void main(){
          float nd = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);
          gl_FragColor = vec4(nd, nd, nd, 1.0);
        }
      `,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    // Depth but only top-facing fragments (by normal alignment)
    this.depthMaterialTop = new THREE.ShaderMaterial({
      uniforms: {
        uNear: { value: 0.1 },
        uFar: { value: 1000.0 },
        uTopNormal: { value: new THREE.Vector3(0, 1, 0) },
        // Slightly stricter alignment to isolate the true top face
        uThreshold: { value: 0.7 },
      },
      vertexShader: `
        varying float vDepth;
        varying vec3 vWorldNormal;
        void main(){
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vec4 mv = viewMatrix * worldPos;
          vDepth = -mv.z;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vDepth;
        varying vec3 vWorldNormal;
        uniform float uNear;
        uniform float uFar;
        uniform vec3 uTopNormal;
        uniform float uThreshold;
        void main(){
          float align = dot(normalize(vWorldNormal), normalize(uTopNormal));
          if (align < uThreshold) discard;
          float nd = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);
          gl_FragColor = vec4(nd, nd, nd, 1.0);
        }
      `,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    if (this.options.debug) {
      this.debugCanvasA = document.createElement('canvas');
      this.debugCanvasA.width = size; this.debugCanvasA.height = size;
      this.debugCanvasA.style.position = 'absolute';
      this.debugCanvasA.style.bottom = '8px';
      this.debugCanvasA.style.left = '8px';
      this.debugCanvasA.style.border = '1px solid #999';
      this.debugCanvasA.style.zIndex = '10';
      document.body.appendChild(this.debugCanvasA);

      this.debugCanvasB = document.createElement('canvas');
      this.debugCanvasB.width = size; this.debugCanvasB.height = size;
      this.debugCanvasB.style.position = 'absolute';
      this.debugCanvasB.style.bottom = '8px';
      this.debugCanvasB.style.left = `${16 + Math.min(256, size)}px`;
      this.debugCanvasB.style.border = '1px solid #999';
      this.debugCanvasB.style.zIndex = '10';
      document.body.appendChild(this.debugCanvasB);
    }
  }

  getCachedCoverage(panel: THREE.Object3D): ShadowCoverageResult | null {
    const hit = this.cache.get(panel);
    if (!hit) return null;
    if (this.options.cacheTTL <= 0) return hit;
    const age = performance.now() - hit.at;
    return age <= this.options.cacheTTL ? hit : null;
  }

  invalidate(panel: THREE.Object3D | null) {
    if (!panel) {
      this.cache = new WeakMap();
    } else {
      this.cache.delete(panel);
    }
  }

  async computeCoverage(panel: THREE.Mesh): Promise<ShadowCoverageResult> {
    // If sun is below the horizon or effectively off, everything is shadowed
    if (this.light.position.y <= 0.0001 || this.light.intensity <= 1e-6) {
      const result: ShadowCoverageResult = { percent: 100, totalPixels: 1, shadowedPixels: 1, at: performance.now() };
      this.cache.set(panel, result);
      return result;
    }
    const cached = this.getCachedCoverage(panel);
    if (cached) return cached;

    // Build a dedicated orthographic camera aligned with the sun and tightly fit around the panel and occluders
    this.light.updateMatrixWorld(true);
    panel.updateWorldMatrix(true, false);
    const panelBox = new THREE.Box3().setFromObject(panel);
    const panelCenter = panelBox.getCenter(new THREE.Vector3());
    const tempCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    tempCam.position.copy(this.light.position);
    tempCam.up.set(0, 1, 0);
    tempCam.lookAt(panelCenter);
    tempCam.updateMatrixWorld(true);
    const view = tempCam.matrixWorldInverse.clone();

    // Collect bounds in camera view space for panel and occluders
    const expandBoundsWithBox = (box: THREE.Box3, bounds: { min: THREE.Vector3; max: THREE.Vector3 }, matrixWorld: THREE.Matrix4) => {
      const corners: THREE.Vector3[] = [];
      for (let ix = 0; ix < 2; ix++) {
        for (let iy = 0; iy < 2; iy++) {
          for (let iz = 0; iz < 2; iz++) {
            const v = new THREE.Vector3(
              ix ? box.max.x : box.min.x,
              iy ? box.max.y : box.min.y,
              iz ? box.max.z : box.min.z
            ).applyMatrix4(matrixWorld).applyMatrix4(view);
            corners.push(v);
          }
        }
      }
      corners.forEach((v) => {
        bounds.min.min(v);
        bounds.max.max(v);
      });
    };

    const bounds = { min: new THREE.Vector3(+Infinity, +Infinity, +Infinity), max: new THREE.Vector3(-Infinity, -Infinity, -Infinity) };
    expandBoundsWithBox(panelBox, bounds, panel.matrixWorld);
    const occluders: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if ((m as any).isMesh && m.castShadow && m !== panel) {
        const bx = new THREE.Box3().setFromObject(m);
        expandBoundsWithBox(bx, bounds, m.matrixWorld);
        occluders.push(m);
      }
    });

    // Convert view-space z to positive depth
    const depthMin = Math.max(0.1, -bounds.max.z - 0.5);
    const depthMax = Math.max(depthMin + 0.1, -bounds.min.z + 0.5);
    tempCam.left = bounds.min.x - 0.25;
    tempCam.right = bounds.max.x + 0.25;
    tempCam.bottom = bounds.min.y - 0.25;
    tempCam.top = bounds.max.y + 0.25;
    tempCam.near = depthMin;
    tempCam.far = depthMax;
    tempCam.updateProjectionMatrix();

    // Configure near/far
    const near = tempCam.near;
    const far = tempCam.far;
    this.depthMaterialAll.uniforms.uNear.value = near;
    this.depthMaterialAll.uniforms.uFar.value = far;
    this.depthMaterialTop.uniforms.uNear.value = near;
    this.depthMaterialTop.uniforms.uFar.value = far;

    // Save state
    const prev = {
      rt: this.renderer.getRenderTarget(),
      clearColor: this.renderer.getClearColor(new THREE.Color()).clone(),
      clearAlpha: this.renderer.getClearAlpha(),
      autoClear: this.renderer.autoClear,
      overrideMaterial: this.scene.overrideMaterial as THREE.Material | null,
      panelVisible: panel.visible,
    };

    // Occluders pass: render occluders inside a temporary scene so overrideMaterial is respected
    this.renderer.setRenderTarget(this.occluderRT);
    this.renderer.setClearColor(new THREE.Color(1, 1, 1), 1);
    this.renderer.clear(true, true, true);
    panel.visible = false;
    const tempSceneOccluders = new THREE.Scene();
    // Clone occluders into temp scene with baked world transforms to avoid reparenting
    occluders.forEach((obj) => {
      const mesh = obj as THREE.Mesh;
      const clone = new THREE.Mesh(mesh.geometry);
      clone.matrixAutoUpdate = false;
      clone.matrix.copy(mesh.matrixWorld);
      tempSceneOccluders.add(clone);
    });
    tempSceneOccluders.updateMatrixWorld(true);
    const prevOverrideA = tempSceneOccluders.overrideMaterial as THREE.Material | null;
    tempSceneOccluders.overrideMaterial = this.depthMaterialAll;
    this.renderer.render(tempSceneOccluders, tempCam);
    tempSceneOccluders.overrideMaterial = prevOverrideA as any;

    // Panel pass
    this.renderer.setRenderTarget(this.panelRT);
    this.renderer.setClearColor(new THREE.Color(1, 1, 1), 1);
    this.renderer.clear(true, true, true);
    panel.visible = true;
    // Estimate top normal from 3 points on panel (bbox-based heuristic for our panel geometry)
    // Estimate top (slanted) face normal from panel geometry points
    const bbox = new THREE.Box3().setFromObject(panel);
    const bboxSize = new THREE.Vector3();
    bbox.getSize(bboxSize);
    const length = 2, width = 1, h = bboxSize.y;
    const lv4 = new THREE.Vector3(-length/2, -h/2 + 0, -width/2);
    const lv5 = new THREE.Vector3( length/2, -h/2 + h, -width/2);
    const lv6 = new THREE.Vector3( length/2, -h/2 + h,  width/2);
    const w4 = lv4.clone().applyMatrix4(panel.matrixWorld);
    const w5 = lv5.clone().applyMatrix4(panel.matrixWorld);
    const w6 = lv6.clone().applyMatrix4(panel.matrixWorld);
    const topN = new THREE.Triangle(w4, w5, w6).getNormal(new THREE.Vector3()).normalize();
    this.depthMaterialTop.uniforms.uTopNormal.value.copy(topN);
    // Panel pass: render panel inside a temporary scene so overrideMaterial is respected
    const tempScenePanel = new THREE.Scene();
    const panelClone = new THREE.Mesh((panel as THREE.Mesh).geometry);
    panelClone.matrixAutoUpdate = false;
    panelClone.matrix.copy(panel.matrixWorld);
    tempScenePanel.add(panelClone);
    tempScenePanel.updateMatrixWorld(true);
    const prevOverride = tempScenePanel.overrideMaterial as THREE.Material | null;
    tempScenePanel.overrideMaterial = this.depthMaterialTop;
    this.renderer.render(tempScenePanel, tempCam);
    tempScenePanel.overrideMaterial = prevOverride as any;

    // Restore
    this.renderer.setRenderTarget(prev.rt);
    this.renderer.setClearColor(prev.clearColor, prev.clearAlpha);
    this.renderer.autoClear = prev.autoClear;
    this.scene.overrideMaterial = prev.overrideMaterial as any;
    panel.visible = prev.panelVisible;

    // Read back
    const rtSize = this.options.rtSize;
    const numPx = rtSize * rtSize;
    // Read float buffers for higher precision
    const bufferA = new Float32Array(numPx * 4);
    const bufferB = new Float32Array(numPx * 4);
    this.renderer.readRenderTargetPixels(this.panelRT, 0, 0, rtSize, rtSize, bufferA);
    this.renderer.readRenderTargetPixels(this.occluderRT, 0, 0, rtSize, rtSize, bufferB);

    // Optional debug dump
    if (this.options.debug && this.debugCanvasA && this.debugCanvasB) {
      const ctxA = this.debugCanvasA.getContext('2d')!;
      const ctxB = this.debugCanvasB.getContext('2d')!;
      const imgA = ctxA.createImageData(size, size);
      const imgB = ctxB.createImageData(size, size);
      for (let i = 0; i < numPx; i++) {
        const fA = bufferA[i * 4];
        const fB = bufferB[i * 4];
        const vA = Math.min(255, Math.max(0, Math.floor(fA * 255)));
        const vB = Math.min(255, Math.max(0, Math.floor(fB * 255)));
        imgA.data[i * 4 + 0] = vA; imgA.data[i * 4 + 1] = vA; imgA.data[i * 4 + 2] = vA; imgA.data[i * 4 + 3] = 255;
        imgB.data[i * 4 + 0] = vB; imgB.data[i * 4 + 1] = vB; imgB.data[i * 4 + 2] = vB; imgB.data[i * 4 + 3] = 255;
      }
      ctxA.putImageData(imgA, 0, 0);
      ctxB.putImageData(imgB, 0, 0);
      this.debugCanvasA.style.width = '256px'; this.debugCanvasA.style.height = '256px';
      this.debugCanvasB.style.width = '256px'; this.debugCanvasB.style.height = '256px';
    }

    // Compare
    const eps = this.options.eps;
    let total = 0;
    let shadowed = 0;
    for (let i = 0; i < numPx; i++) {
      const pDepth = bufferA[i * 4 + 0];
      // white clear = 1.0 means no draw
      if (pDepth >= 0.9999) continue; // panel not present at this texel
      const oDepth = bufferB[i * 4 + 0];
      total++;
      // If occluder depth exists and is closer (smaller normalized depth) than panel depth by epsilon -> shadowed
      if (oDepth <= (pDepth - eps)) shadowed++;
    }
    const percent = total > 0 ? Math.max(0, Math.min(100, (shadowed / total) * 100)) : 0;
    // Two-decimal precision for display accuracy
    const rounded = Math.round(percent * 100) / 100;
    const result: ShadowCoverageResult = { percent: rounded, totalPixels: total, shadowedPixels: shadowed, at: performance.now() } as ShadowCoverageResult;
    this.cache.set(panel, result);
    return result;
  }

  dispose() {
    this.occluderRT.dispose();
    this.panelRT.dispose();
    this.depthMaterialAll.dispose();
    this.depthMaterialTop.dispose();
    if (this.debugCanvasA && this.debugCanvasA.parentElement) this.debugCanvasA.parentElement.removeChild(this.debugCanvasA);
    if (this.debugCanvasB && this.debugCanvasB.parentElement) this.debugCanvasB.parentElement.removeChild(this.debugCanvasB);
  }
}

export default ShadowCoverageCalculator;


