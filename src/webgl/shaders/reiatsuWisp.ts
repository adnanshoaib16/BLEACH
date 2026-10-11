/**
 * Reiatsu wisps — tube geometry displaced in the vertex shader.
 *
 * The ribbon is a TubeGeometry built once on the CPU; the shader tapers it to
 * nothing at both ends and pushes it sideways with travelling waves, so a
 * handful of static tubes behave like spiritual pressure venting off-screen.
 */

export const reiatsuWispVertex = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  uniform float uRadius;
  uniform float uPhase;
  uniform float uAmplitude;

  varying float vAlong;
  varying float vRim;
  varying float vTwist;

  void main() {
    // TubeGeometry lays u along the curve and v around the circumference.
    float along  = uv.x;
    float around = uv.y;

    vAlong = along;
    vTwist = around;

    float t = uTime * 0.9 + uPhase;

    // Taper to a point at both tips. Collapsing along the normal keeps the
    // centre line intact, so the ribbon thins rather than shrinking inward.
    float taper = pow(sin(along * 3.14159265), 0.65);
    vec3 displaced = position - normal * uRadius * (1.0 - taper);

    // Travelling waves on three axes at incommensurate frequencies, so the
    // ribbon never returns to the same shape within a session.
    float amp = uAmplitude * (0.45 + uEnergy * 1.25) * taper;
    displaced.x += sin(along * 5.3 + t * 1.20) * amp;
    displaced.y += cos(along * 3.7 - t * 0.95) * amp * 1.15;
    displaced.z += sin(along * 7.1 + t * 1.55) * amp * 0.55;

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);

    // Rim term: the tube is brightest where its surface turns away from the
    // camera, which is what gives a thin ribbon its glassy edge.
    vec3 n = normalize(normalMatrix * normal);
    vRim = 1.0 - abs(dot(n, vec3(0.0, 0.0, 1.0)));

    gl_Position = projectionMatrix * mv;
  }
`;

export const reiatsuWispFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uEnergy;
  uniform float uPhase;
  uniform vec3  uColourCool;
  uniform vec3  uColourHot;

  varying float vAlong;
  varying float vRim;
  varying float vTwist;

  void main() {
    // A pulse running the length of the ribbon, like pressure finding an exit.
    float pulse = sin(vAlong * 14.0 - uTime * 2.6 + uPhase) * 0.5 + 0.5;
    pulse = pow(pulse, 1.7);

    // Soft heads so the tips dissolve instead of ending on a hard cap.
    float head = smoothstep(0.0, 0.18, vAlong) * (1.0 - smoothstep(0.80, 1.0, vAlong));

    // Faint banding around the circumference: the twist that separates a
    // ribbon from a plain glowing tube.
    float band = 0.78 + 0.22 * sin(vTwist * 18.8495559 + uTime * 1.3 + uPhase);

    float rim = pow(vRim, 1.4);
    vec3 colour = mix(uColourCool, uColourHot, clamp(pulse * 0.55 + uEnergy * 0.6, 0.0, 1.0));
    colour += vec3(rim) * 0.55;

    float alpha = head * (0.16 + 0.70 * pulse) * (0.30 + rim * 0.9) * (0.35 + uEnergy) * band;

    gl_FragColor = vec4(colour * alpha, alpha);
  }
`;
