/**
 * GLSL chunk for the equirectangular float atlas produced by `bakePolarAtlas`.
 *
 * Expected uniforms:
 *   sampler2D uPolarAtlas;   // R32F or R16F atlas, NEAREST filtering
 *   float     uPolarWidth;   // atlas width in texels
 *   float     uPolarHeight;  // one band's height in texels
 *   int       uPolarBands;   // number of bands
 *   int       uPolarBand;    // current band index
 *   float     uPolarMinDb;   // decode range
 *   float     uPolarMaxDb;
 *
 * The function performs manual bilinear interpolation so that linear filtering
 * cannot bleed between adjacent bands in the atlas.
 */
export const POLAR_TEXTURE_GLSL = /* glsl */ `
uniform sampler2D uPolarAtlas;
uniform float uPolarWidth;
uniform float uPolarHeight;
uniform int uPolarBands;
uniform int uPolarBand;
uniform float uPolarMinDb;
uniform float uPolarMaxDb;

float auraAtlasTexel(int col, int row, int band) {
  float u = (float(col) + 0.5) / uPolarWidth;
  float v = (float(row) + float(band) * uPolarHeight + 0.5) / (uPolarHeight * float(uPolarBands));
  float encoded = texture2D(uPolarAtlas, vec2(u, v)).r;
  return mix(uPolarMinDb, uPolarMaxDb, encoded);
}

// azElDeg: x = azimuth [-180,180], y = elevation [-90,90].
float auraPolarDb(vec2 azElDeg) {
  float az = mod(azElDeg.x + 180.0, 360.0) / 360.0 * uPolarWidth - 0.5;
  float el = (90.0 - clamp(azElDeg.y, -90.0, 90.0)) / 180.0 * uPolarHeight - 0.5;
  int c0 = int(floor(az));
  int r0 = int(floor(el));
  float tx = fract(az);
  float ty = fract(el);
  int c1 = c0 + 1;
  if (c1 >= int(uPolarWidth)) c1 = 0;
  int r1 = min(r0 + 1, int(uPolarHeight) - 1);
  c0 = max(c0, 0);
  r0 = max(r0, 0);

  float q00 = auraAtlasTexel(c0, r0, uPolarBand);
  float q10 = auraAtlasTexel(c1, r0, uPolarBand);
  float q01 = auraAtlasTexel(c0, r1, uPolarBand);
  float q11 = auraAtlasTexel(c1, r1, uPolarBand);
  return mix(mix(q00, q10, tx), mix(q01, q11, tx), ty);
}

float auraPolarLinear(vec2 azElDeg) {
  return pow(10.0, auraPolarDb(azElDeg) / 20.0);
}

vec3 auraPolarColor(float db) {
  float t = clamp((db + 36.0) / 36.0, 0.0, 1.0);
  vec3 cold = vec3(0.04, 0.12, 0.42);
  vec3 mid = vec3(0.00, 0.78, 0.72);
  vec3 hot = vec3(1.00, 0.78, 0.12);
  return t < 0.5 ? mix(cold, mid, t * 2.0) : mix(mid, hot, (t - 0.5) * 2.0);
}
`

/**
 * GLSL vertex displacement for a unit sphere balloon:
 * r(θ, φ) = 0.25 + 0.75 · D_linear(θ, φ), so the on-axis lobe reaches r = 1.
 */
export const POLAR_BALLOON_GLSL = /* glsl */ `
${POLAR_TEXTURE_GLSL}

vec3 auraBalloonPosition(vec3 unitDirection) {
  float azimuth = degrees(atan(unitDirection.x, unitDirection.z));
  float elevation = degrees(asin(clamp(unitDirection.y, -1.0, 1.0)));
  float gain = auraPolarLinear(vec2(azimuth, elevation));
  float radius = 0.25 + 0.75 * gain;
  return unitDirection * radius;
}
`
