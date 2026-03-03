import { markRaw } from 'vue';

export function use3DScene(appStore) {
    let _threeScene = null;
    let _threeCamera = null;
    let _threeRenderer = null;
    let _threeAnimationId = null;
    let _threeParticles = null;
    let _threeIcos = null;
    let _threePointer = { x: 0, y: 0 };
    let _threePointerTarget = { x: 0, y: 0 };
    let _threeResizeHandler = null;
    let _threePointerHandler = null;
    let _threePointerLeaveHandler = null;
    let _threePointerDownHandler = null;
    let _threeBurstUntil = 0;

    const animate3D = () => {
        if (!_threeRenderer || !_threeScene || !_threeCamera) return;
        _threeAnimationId = requestAnimationFrame(animate3D);

        const now = performance.now();
        const time = now * 0.001;
        const mode = appStore.focusVisualPreset || 'focus';
        const modeScale = mode === 'deep' ? 1.42 : mode === 'calm' ? 0.68 : 1;
        const burstScale = _threeBurstUntil > now ? 1.3 : 1;
        const pulse = modeScale * burstScale;

        _threePointer.x += (_threePointerTarget.x - _threePointer.x) * 0.06;
        _threePointer.y += (_threePointerTarget.y - _threePointer.y) * 0.06;
        _threeCamera.position.x = _threePointer.x * 0.58;
        _threeCamera.position.y = _threePointer.y * 0.36;
        _threeCamera.lookAt(0, 0, 0);

        if (_threeParticles) {
            _threeParticles.rotation.y = time * 0.08 * pulse;
            _threeParticles.rotation.x = Math.sin(time * 0.32) * 0.14;

            _threeParticles.material.uniforms.uTime.value = time;
            _threeParticles.material.uniforms.uPulse.value = pulse;
            _threeParticles.material.uniforms.uModeScale.value = modeScale;
        }

        if (_threeIcos) {
            _threeIcos.forEach((mesh, idx) => {
                mesh.rotation.x += 0.0014 * (1 + idx * 0.15) * pulse;
                mesh.rotation.y += 0.0012 * (1 + idx * 0.1) * pulse;
                mesh.position.y = mesh.userData.baseY + Math.sin(time * (0.9 + idx * 0.22)) * 0.16 * modeScale;
                const waveScale = 1 + Math.sin(time * (1.25 + idx * 0.12)) * 0.05 * pulse;
                mesh.scale.setScalar(waveScale);
            });
        }

        _threeRenderer.render(_threeScene, _threeCamera);
    };

    const init3DScene = async () => {
        if (_threeRenderer) {
            destroy3DScene();
        }

        const canvas = document.getElementById('bg-canvas-3d');
        if (!canvas) return;

        const THREE = await import('three');

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 5.3);

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: false,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearAlpha(0);

        const particleCount = 420;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const baseIndices = new Float32Array(particleCount);

        const goldColors = [
            [0.95, 0.77, 0.41],
            [0.83, 0.68, 0.21],
            [0.69, 0.55, 0.15],
            [0.95, 0.61, 0.07]
        ];

        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() - 0.5) * 14;
            const y = (Math.random() - 0.5) * 9;
            const z = (Math.random() - 0.5) * 10;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            baseIndices[i] = i;

            const color = goldColors[Math.floor(Math.random() * goldColors.length)];
            colors[i * 3] = color[0];
            colors[i * 3 + 1] = color[1];
            colors[i * 3 + 2] = color[2];
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('aIndex', new THREE.BufferAttribute(baseIndices, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPulse: { value: 1.0 },
                uModeScale: { value: 1.0 },
                uPointSize: { value: 0.055 * (window.devicePixelRatio || 1) }
            },
            vertexShader: `
                attribute float aIndex;
                varying vec3 vColor;
                uniform float uTime;
                uniform float uPulse;
                uniform float uModeScale;
                uniform float uPointSize;

                void main() {
                    vColor = color;
                    vec3 pos = position;
                    float offset = sin(uTime * uPulse + aIndex * 0.13 + pos.x * 0.35) * 0.04 * uModeScale;
                    pos.y += offset;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = uPointSize * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    if (dist > 0.5) discard;
                    gl_FragColor = vec4(vColor, 0.62);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        const icoGeo = new THREE.IcosahedronGeometry(0.66, 1);
        const icoMat = new THREE.MeshBasicMaterial({
            color: 0xd4af37,
            wireframe: true,
            transparent: true,
            opacity: 0.25
        });
        const ico1 = new THREE.Mesh(icoGeo, icoMat);
        ico1.position.set(-2.5, 1.5, -2);
        ico1.userData.baseY = ico1.position.y;
        scene.add(ico1);

        const ico2Geo = new THREE.IcosahedronGeometry(0.45, 1);
        const ico2Mat = new THREE.MeshBasicMaterial({
            color: 0xf3c669,
            wireframe: true,
            transparent: true,
            opacity: 0.22
        });
        const ico2 = new THREE.Mesh(ico2Geo, ico2Mat);
        ico2.position.set(2.8, -1.2, -1.5);
        ico2.userData.baseY = ico2.position.y;
        scene.add(ico2);

        const torusGeo = new THREE.TorusKnotGeometry(0.55, 0.14, 100, 12);
        const torusMat = new THREE.MeshBasicMaterial({
            color: 0xf39c12,
            wireframe: true,
            transparent: true,
            opacity: 0.16
        });
        const torus = new THREE.Mesh(torusGeo, torusMat);
        torus.position.set(3, 2, -3);
        torus.userData.baseY = torus.position.y;
        scene.add(torus);

        const ringGeo = new THREE.TorusGeometry(1.12, 0.02, 16, 120);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xb08d27,
            transparent: true,
            opacity: 0.18
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(-3.1, -1.9, -2.8);
        ring.rotation.x = Math.PI * 0.28;
        ring.userData.baseY = ring.position.y;
        scene.add(ring);

        _threeScene = markRaw(scene);
        _threeCamera = markRaw(camera);
        _threeRenderer = markRaw(renderer);
        _threeParticles = markRaw(particles);
        _threeIcos = markRaw([ico1, ico2, torus, ring]);

        _threeResizeHandler = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (_threeParticles && _threeParticles.material.uniforms) {
                _threeParticles.material.uniforms.uPointSize.value = 0.055 * (window.devicePixelRatio || 1);
            }
        };
        window.addEventListener('resize', _threeResizeHandler);

        _threePointerHandler = (event) => {
            _threePointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
            _threePointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
        };

        _threePointerLeaveHandler = () => {
            _threePointerTarget.x = 0;
            _threePointerTarget.y = 0;
        };

        _threePointerDownHandler = () => {
            _threeBurstUntil = performance.now() + 900;
        };

        window.addEventListener('pointermove', _threePointerHandler, { passive: true });
        window.addEventListener('pointerdown', _threePointerDownHandler, { passive: true });
        window.addEventListener('mouseout', _threePointerLeaveHandler);

        animate3D();
    };

    const destroy3DScene = () => {
        if (_threeAnimationId) {
            cancelAnimationFrame(_threeAnimationId);
            _threeAnimationId = null;
        }
        if (_threeResizeHandler) {
            window.removeEventListener('resize', _threeResizeHandler);
            _threeResizeHandler = null;
        }
        if (_threePointerHandler) {
            window.removeEventListener('pointermove', _threePointerHandler);
            _threePointerHandler = null;
        }
        if (_threePointerDownHandler) {
            window.removeEventListener('pointerdown', _threePointerDownHandler);
            _threePointerDownHandler = null;
        }
        if (_threePointerLeaveHandler) {
            window.removeEventListener('mouseout', _threePointerLeaveHandler);
            _threePointerLeaveHandler = null;
        }
        if (_threeParticles) {
            _threeParticles.geometry?.dispose();
            _threeParticles.material?.dispose();
            _threeParticles = null;
        }
        if (Array.isArray(_threeIcos)) {
            _threeIcos.forEach((mesh) => {
                mesh.geometry?.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((material) => material?.dispose?.());
                } else {
                    mesh.material?.dispose?.();
                }
            });
        }
        if (_threeRenderer) {
            _threeRenderer.forceContextLoss?.();
            _threeRenderer.dispose();
            _threeRenderer = null;
        }
        _threeScene = null;
        _threeCamera = null;
        _threeIcos = null;
        _threePointer = { x: 0, y: 0 };
        _threePointerTarget = { x: 0, y: 0 };
    };

    return {
        init3DScene,
        destroy3DScene
    };
}
