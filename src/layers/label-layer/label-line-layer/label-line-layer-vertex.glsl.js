export default /*glsl*/`\
#version 300 es
#define SHADER_NAME line-layer-vertex-shader

in vec3 positions;
in vec3 instanceSourcePositions;
in vec3 instanceTargetPositions;
in vec3 instanceSourcePositions64Low;
in vec3 instanceTargetPositions64Low;
in vec2 instanceTargetPixelOffsets;
in vec4 instanceColors;
in vec3 instancePickingColors;
in vec4 instanceRects;
in float instanceSizes;
in float instanceWidths;
in float instanceRadius;
in float instanceSourceDashOffsets;
in float instanceDragged;

uniform float opacity;
uniform float widthScale;
uniform float widthMinPixels;
uniform float widthMaxPixels;
uniform float useShortestPath;
uniform int widthUnits;
uniform vec4 padding;
uniform float edgeMaxCoord;


out vec4 vColor;
out vec2 uv;

// offset vector by strokeWidth pixels
// offset_direction is -1 (left) or 1 (right)
vec2 getExtrusionOffset(vec2 line_clipspace, float offset_direction, float width) {
  // normalized direction of the line
  vec2 dir_screenspace = normalize(line_clipspace * project_uViewportSize);
  // rotate by 90 degrees
  dir_screenspace = vec2(-dir_screenspace.y, dir_screenspace.x);

  return dir_screenspace * offset_direction * width / 2.0;
}

vec3 splitLine(vec3 a, vec3 b, float x) {
  float t = (x - a.x) / (b.x - a.x);
  return vec3(x, mix(a.yz, b.yz, t));
}

void main(void) {
  geometry.worldPosition = instanceSourcePositions;
  geometry.worldPositionAlt = instanceTargetPositions;
  vec3 source_world = instanceSourcePositions;
  vec3 target_world = instanceTargetPositions;
  vec3 source_world_64low = instanceSourcePositions64Low;
  vec3 target_world_64low = instanceTargetPositions64Low;

  if (useShortestPath > 0.5 || useShortestPath < -0.5) {
    source_world.x = mod(source_world.x + 180., 360.0) - 180.;
    target_world.x = mod(target_world.x + 180., 360.0) - 180.;
    float deltaLng = target_world.x - source_world.x;

    if (deltaLng * useShortestPath > 180.) {
      source_world.x += 360. * useShortestPath;
      source_world = splitLine(source_world, target_world, 180. * useShortestPath);
      source_world_64low = vec3(0.0);
    } else if (deltaLng * useShortestPath < -180.) {
      target_world.x += 360. * useShortestPath;
      target_world = splitLine(source_world, target_world, 180. * useShortestPath);
      target_world_64low = vec3(0.0);
    } else if (useShortestPath < 0.) {
      // Line is not split, abort
      gl_Position = vec4(0.);
      return;
    }
  }

  // Position
  vec4 source_commonspace;
  vec4 target_commonspace;
  vec4 source = project_position_to_clipspace(source_world, source_world_64low, vec3(0.), source_commonspace);
  vec4 target = project_position_to_clipspace(target_world, target_world_64low, vec3(0.), target_commonspace);


  vec2 targetPixelOffsets = project_pixel_size_to_clipspace(instanceTargetPixelOffsets);

  vec2 dimensions = instanceRects.zw * instanceSizes + padding.xy; 
  vec2 clip_padd_right_bottom = project_pixel_size_to_clipspace(padding.zw);
  vec2 clip_dimensions = project_pixel_size_to_clipspace(dimensions);
  vec2 dimensions_wo_pad = instanceRects.zw * instanceSizes;
  vec2 clip_dimensions_wo_pad = project_pixel_size_to_clipspace(dimensions_wo_pad);


  //default pos switch on edge
  if (instanceDragged < 0.5) {
    vec2 clip_offset = abs(targetPixelOffsets);
    targetPixelOffsets += (vec2(1.0, 0.0) - step(vec2(-edgeMaxCoord, edgeMaxCoord), target.xy + targetPixelOffsets * vec2(1.0, -1.0) + vec2(-1.0, 1.0) * clip_dimensions)) * (clip_offset * 2.0 + clip_dimensions_wo_pad) * vec2(1.0,-1.0);
  }

  target.xy += targetPixelOffsets * vec2(1.0,-1.0);
  
  //edge check
  target.x = clamp(target.x, -edgeMaxCoord + clip_dimensions.x, edgeMaxCoord - clip_padd_right_bottom.x);
  target.y = clamp(target.y, -edgeMaxCoord + clip_padd_right_bottom.y, edgeMaxCoord - clip_dimensions.y);

  // 8point
  target.xy -= 0.5 * clip_dimensions_wo_pad * (step(0., vec2(1.0, -1.0) * (target.xy - source.xy)) + step(0., vec2(1.0, -1.0) * (target.xy - source.xy) - clip_dimensions_wo_pad)) * vec2(1.0, -1.0);

  //dash source offset
  vec2 line = target.xy - source.xy;
  float lineLength = length(line);
  vec2 clip_dash = project_pixel_size_to_clipspace(vec2(instanceSourceDashOffsets, instanceSourceDashOffsets));
  float dashOffset = min( lineLength / sqrt(pow(line.x / clip_dash.x, 2.0) + pow(line.y / clip_dash.y, 2.0)), lineLength ) / lineLength;
  source = mix(source, target, dashOffset);

  // linear interpolation of source & target to pick right coord
  float segmentIndex = positions.x;
  vec4 p = mix(source, target, segmentIndex);
  geometry.position = mix(source_commonspace, target_commonspace, segmentIndex);
  uv = positions.xy;
  geometry.uv = uv;
  geometry.pickingColor = instancePickingColors;

  // Multiply out width and clamp to limits
  float widthPixels = clamp(
    project_size_to_pixel(instanceWidths * widthScale, widthUnits),
    widthMinPixels, widthMaxPixels
  );

  // extrude
  vec3 offset = vec3(
    getExtrusionOffset(target.xy - source.xy, positions.y, widthPixels),
    0.0);
  DECKGL_FILTER_SIZE(offset, geometry);
  DECKGL_FILTER_GL_POSITION(p, geometry);
  gl_Position = p + vec4(project_pixel_size_to_clipspace(offset.xy), 0.0, 0.0);

  // Color
  vColor = vec4(instanceColors.rgb, instanceColors.a * opacity);
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
