export default /*glsl*/`\
#version 300 es
#define SHADER_NAME label-text-background-layer-fragment-shader

precision highp float;

uniform bool stroked;
uniform float cornerRadius;

in vec4 vFillColor;
in vec4 vLineColor;
in float vLineWidth;
in float vGlowWidth;
in vec2 uv;
in vec2 dimensions;
in vec4 vGlowColor;

out vec4 fragColor;

float RectSDF(vec2 p, vec2 b, float r)
{
    vec2 d = abs(p) - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;   
}

void main() 
{
  geometry.uv = uv;

  vec2 pixelPosition = uv * dimensions;
        
  float fDist = RectSDF(pixelPosition-dimensions/2.0, dimensions/2.0 - vLineWidth/2.0-1.0 - vGlowWidth, cornerRadius);
  vec4 v4ToColor = (fDist < 0.0) ? vFillColor : vec4(0.0);

  if (stroked) {
    float fBlendAmount = smoothstep(-1.0, 1.0, abs(fDist) - vLineWidth / 2.0);

    vec4 v4FromColor = vLineColor;
    fragColor = mix(v4FromColor, v4ToColor, fBlendAmount);
  } else {
    fragColor = v4ToColor;
  }
        
  // Outer glow
  if (vGlowWidth > 0.0) {
    float glowFactor = (1.0 - smoothstep(0.3*vGlowWidth, vGlowWidth*1.3, fDist -  vLineWidth/2.0));
    fragColor = fragColor + vec4(vGlowColor.rgb, vGlowColor.a * glowFactor) * (1.0 - fragColor.a);
  }

  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
