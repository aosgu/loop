import * as THREE from "three";
import { DISPLACE, NOISE } from "./glsl";

export interface PlushConfig {
  color: string;
  color2: string;
  glow: string;
  fur?: number;
  wobble?: number;
  breath?: number;
  ember?: number;
  sparkle?: number;
  freq?: number;
  rate?: number;
  outline?: number;
  outlineColor?: string;
}

export interface PlushKit {
  body: THREE.ShaderMaterial;
  shell: THREE.ShaderMaterial;
  uniforms: {
    uTime: { value: number };
    uHover: { value: number };
    uSel: { value: number };
  };
}

const stdUniforms = (cfg: PlushConfig) => ({
  uTime: { value: 0 },
  uWobble: { value: cfg.wobble ?? 0.04 },
  uBreath: { value: cfg.breath ?? 0.012 },
  uFreq: { value: cfg.freq ?? 2.2 },
  uRate: { value: cfg.rate ?? 1.15 },
  uHover: { value: 0 },
  uSel: { value: 0 },
});

const PLUSH_VERT = /* glsl */ `
${NOISE}
${DISPLACE}
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 n;
  vec3 p = displaced(position, normalize(normal), n);
  vP = p;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vN = normalize(mat3(modelMatrix) * n);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const PLUSH_FRAG = /* glsl */ `
${NOISE}
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uGlow;
uniform float uTime;
uniform float uFur;
uniform float uEmber;
uniform float uSparkle;
uniform float uHover;
uniform float uSel;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
varying vec2 vUv;

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(vV);
  vec3 key = normalize(vec3(0.42, 0.88, 0.55));
  vec3 fill = normalize(vec3(-0.7, -0.18, 0.42));
  vec3 rimL = normalize(vec3(-0.15, 0.35, -0.95));

  float wrapD = clamp((dot(N, key) + 0.62) / 1.62, 0.0, 1.0);
  float fillD = clamp((dot(N, fill) + 0.8) / 1.8, 0.0, 1.0);
  float rimD  = clamp((dot(N, rimL) + 0.9) / 1.9, 0.0, 1.0);

  // woven fabric mottle
  float fibres = snoise(vP * 6.5) * 0.5 + 0.5;
  float fluff  = snoise(vP * 31.0 + vec3(0.0, uTime * 0.05, 0.0)) * 0.5 + 0.5;
  float grain  = snoise(vP * 88.0) * 0.5 + 0.5;

  vec3 base = mix(uColor, uColor2, smoothstep(0.34, 0.96, fibres * 0.72 + (1.0 - N.y * 0.5 - 0.5) * 0.5));
  base *= 0.84 + fibres * 0.3 + grain * 0.05;

  vec3 col = base * (wrapD * 1.02 + fillD * 0.26 + rimD * 0.18 + 0.13);

  // velvet: light scattered forward at the silhouette
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
  col += mix(base, vec3(1.0), 0.42) * fres * uFur * (0.42 + fluff * 0.72);

  // hot core for the smoulder
  col += uGlow * uEmber * pow(wrapD, 2.5) * (0.72 + 0.28 * sin(uTime * 2.7));

  // sugar glitter
  float sp = pow(max(snoise(vP * 96.0), 0.0), 13.0);
  float tw = 0.5 + 0.5 * sin(uTime * 5.5 + vP.x * 44.0 + vP.y * 31.0);
  col += vec3(1.0, 0.97, 0.86) * sp * tw * uSparkle * 3.0;

  // attention
  float att = clamp(uHover * 0.85 + uSel * 0.6, 0.0, 1.4);
  col += uGlow * fres * att * 1.1;
  col += base * att * 0.16;

  // contact shade toward the floor
  col *= mix(1.0, 0.6, smoothstep(0.15, -0.85, N.y) * 0.55);

  gl_FragColor = vec4(col, 1.0);
}
`;

const SHELL_VERT = /* glsl */ `
${NOISE}
${DISPLACE}
uniform float uThick;
varying vec3 vN;
varying vec3 vV;
void main(){
  vec3 n;
  vec3 p = displaced(position, normalize(normal), n);
  p += normalize(normal) * uThick;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vN = normalize(mat3(modelMatrix) * n);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SHELL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uHover;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
void main(){
  float f = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.1);
  vec3 col = uColor * (0.55 + f * 0.75 + uHover * 0.5);
  gl_FragColor = vec4(col, uOpacity);
}
`;

/** A soft toy: fuzzy velvet body + a darker inverted-hull "sticker" outline. */
export function makePlush(cfg: PlushConfig): PlushKit {
  const uniforms = stdUniforms(cfg);
  const body = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uColor: { value: new THREE.Color(cfg.color) },
      uColor2: { value: new THREE.Color(cfg.color2) },
      uGlow: { value: new THREE.Color(cfg.glow) },
      uFur: { value: cfg.fur ?? 0.8 },
      uEmber: { value: cfg.ember ?? 0 },
      uSparkle: { value: cfg.sparkle ?? 0 },
    },
    vertexShader: PLUSH_VERT,
    fragmentShader: PLUSH_FRAG,
  });
  const shell = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uWobble: uniforms.uWobble,
      uBreath: uniforms.uBreath,
      uFreq: uniforms.uFreq,
      uRate: uniforms.uRate,
      uHover: uniforms.uHover,
      uThick: { value: cfg.outline ?? 0.028 },
      uOpacity: { value: 0.9 },
      uColor: {
        value: new THREE.Color(cfg.outlineColor ?? cfg.color).multiplyScalar(0.24),
      },
    },
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    side: THREE.BackSide,
  });
  return { body, shell, uniforms };
}

/** Warm haze around a creature — heat, aura, sugar mist. */
export function makeHalo(color: string, power = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uHover: { value: 0 },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      ${NOISE}
      uniform float uTime;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main(){
        vec3 n = normalize(normal);
        vec3 p = position + n * (snoise(n * 2.4 + uTime * 0.35) * 0.055);
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vN = normalize(mat3(modelMatrix) * n);
        vV = normalize(cameraPosition - wp.xyz);
        vP = p;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uHover;
      uniform float uPower;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vP;
      void main(){
        float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 3.2);
        float lick = snoise(vP * 5.0 + vec3(0.0, -uTime * 0.9, 0.0)) * 0.5 + 0.5;
        float a = f * (0.28 + lick * 0.55) * uPower * (1.0 + uHover * 1.5);
        gl_FragColor = vec4(uColor * (1.2 + lick), a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

/** A causal conduit: dashed, flowing, and lit by a travelling signal packet. */
export function makeLink(colorA: string, colorB: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uSpeed: { value: 0.22 },
      uRepeat: { value: 9.0 },
      uPulse: { value: -1 },
      uDim: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSpeed, uRepeat, uPulse, uDim;
      uniform vec3 uColorA, uColorB;
      varying vec2 vUv;
      void main(){
        float t = vUv.x;
        vec3 c = mix(uColorA, uColorB, smoothstep(0.0, 1.0, t));
        float flow = fract(t * uRepeat - uTime * uSpeed);
        float dash = smoothstep(0.52, 0.18, abs(flow - 0.5));
        float seam = pow(abs(sin(vUv.y * 3.14159)), 0.55);
        float head = smoothstep(0.0, 0.012, t) * smoothstep(1.0, 0.985, t);
        float pulse = uPulse < 0.0 ? 0.0 : exp(-pow((t - uPulse) * 9.0, 2.0));
        float body = 0.1 + dash * 0.95 + pulse * 3.4;
        vec3 col = c * body * (0.3 + 0.7 * seam);
        col += vec3(1.0, 0.96, 0.88) * pulse * 0.9;
        float a = clamp((0.05 + dash * 0.62 + pulse) * (0.18 + 0.82 * seam), 0.0, 1.0) * head * uDim;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function makeGlow(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uPower;
      varying vec3 vN; varying vec3 vV;
      void main(){
        float f = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float core = pow(f, 1.6);
        float rim = pow(1.0 - f, 2.0) * 0.7;
        gl_FragColor = vec4(uColor * (core * 1.9 + rim) * uPower, (core + rim) * 0.95);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function makeDust() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 26 },
      uPR: { value: 1 },
      uColor: { value: new THREE.Color("#ffd9a8") },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uSize, uPR;
      varying float vTw;
      varying float vSeed;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * 0.07 * (0.35 + aSeed) + 7.0, 14.0) - 7.0;
        p.x += sin(uTime * 0.21 + aSeed * 14.0) * 0.35;
        p.z += cos(uTime * 0.17 + aSeed * 11.0) * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.25 + aSeed * 0.9) * uPR * (9.0 / max(-mv.z, 0.1));
        vTw = 0.35 + 0.65 * abs(sin(uTime * 1.3 + aSeed * 33.0));
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vTw;
      varying float vSeed;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.04, d);
        vec3 c = mix(uColor, vec3(0.55, 0.95, 0.85), step(0.72, vSeed));
        gl_FragColor = vec4(c * vTw * 1.4, a * 0.5 * vTw);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function makeBackdrop() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(vec3(0.006, 0.017, 0.015), vec3(0.035, 0.085, 0.072), smoothstep(-0.75, 0.06, h));
        col = mix(col, vec3(0.010, 0.030, 0.028), smoothstep(0.02, 0.95, h));
        float g1 = pow(max(dot(d, normalize(vec3(-0.72, 0.02, 0.55))), 0.0), 5.0);
        float g2 = pow(max(dot(d, normalize(vec3(0.78, -0.22, 0.4))), 0.0), 7.0);
        float g3 = pow(max(dot(d, normalize(vec3(0.05, 0.9, -0.35))), 0.0), 9.0);
        col += vec3(0.30, 0.085, 0.030) * g1 * 0.55;
        col += vec3(0.025, 0.20, 0.16) * g2 * 0.55;
        col += vec3(0.16, 0.13, 0.04) * g3 * 0.30;
        // slow caustic sweep
        float sw = snoise(d * 2.2 + vec3(0.0, uTime * 0.02, 0.0)) * 0.5 + 0.5;
        col += vec3(0.02, 0.045, 0.04) * sw;
        col += (hash21(gl_FragCoord.xy) - 0.5) * 0.014;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
}

/** Petri-dish stage: a pool of light + faint concentric rings under the loop. */
export function makeStage() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float pool = smoothstep(1.0, 0.05, r);
        float ring = smoothstep(0.012, 0.0, abs(r - 0.72)) * 0.5;
        ring += smoothstep(0.006, 0.0, abs(r - 0.46)) * 0.22;
        float sweep = 0.5 + 0.5 * sin(atan(p.y, p.x) * 3.0 + uTime * 0.12);
        vec3 col = mix(vec3(0.04, 0.16, 0.14), vec3(0.22, 0.10, 0.05), sweep) * (pool * 0.30 + ring);
        gl_FragColor = vec4(col, (pool * 0.34 + ring) * smoothstep(1.0, 0.7, r));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}
