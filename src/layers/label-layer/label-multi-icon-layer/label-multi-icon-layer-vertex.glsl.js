export default /*glsl*/`\
#version 300 es
#define SHADER_NAME label-icon-layer-vertex-shader

in vec2 positions;

in vec3 instancePositions;
in vec3 instancePositions64Low;
in float instanceSizes;
in float instanceAngles;
in vec4 instanceColors;
in vec3 instancePickingColors;
in vec4 instanceIconFrames;
in float instanceColorModes;
in vec2 instanceOffsets;
in vec2 instancePixelOffset;
in vec4 instanceRects;
in float instanceDragged;

uniform float sizeScale;
uniform vec2 iconsTextureDim;
uniform float sizeMinPixels;
uniform float sizeMaxPixels;
uniform bool billboard;
uniform int sizeUnits;
uniform vec4 padding;
uniform float edgeMaxCoord;

out float vColorMode;
out vec4 vColor;
out vec2 vTextureCoords;
out vec2 uv;

vec2 rotate_by_angle(vec2 vertex, float angle) {
  float angle_radian = angle * PI / 180.0;
  float cos_angle = cos(angle_radian);
  float sin_angle = sin(angle_radian);
  mat2 rotationMatrix = mat2(cos_angle, -sin_angle, sin_angle, cos_angle);
  return rotationMatrix * vertex;
}

void main(void) {
  geometry.worldPosition = instancePositions;
  geometry.uv = positions;
  geometry.pickingColor = instancePickingColors;
  uv = positions;

  vec2 iconSize = instanceIconFrames.zw;
  // convert size in meters to pixels, then scaled and clamp
 
  // project meters to pixels and clamp to limits 
  float sizePixels = clamp(
    project_size_to_pixel(instanceSizes * sizeScale, sizeUnits), 
    sizeMinPixels, sizeMaxPixels
  );

  // scale icon height to match instanceSize
  float instanceScale = iconSize.y == 0.0 ? 0.0 : sizePixels / iconSize.y;

  // scale and rotate vertex in "pixel" value and convert back to fraction in clipspace
  vec2 pixelOffset = positions / 2.0 * iconSize + instanceOffsets;
  pixelOffset = rotate_by_angle(pixelOffset, instanceAngles) * instanceScale;
  vec2 offset_icon = pixelOffset;
  pixelOffset += instancePixelOffset;
  pixelOffset.y *= -1.0;

  if (billboard)  {
    gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, vec3(0.0), geometry.position);
    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
    vec3 offset = vec3(pixelOffset, 0.0);
    DECKGL_FILTER_SIZE(offset, geometry);
    gl_Position.xy += project_pixel_size_to_clipspace(offset.xy);

  vec2 dimensions_wo_padd = instanceRects.zw * instanceSizes;
  vec2 clip_paddLT = project_pixel_size_to_clipspace(padding.xy);
  vec2 clip_paddRB = project_pixel_size_to_clipspace(padding.zw);
  vec2 positions0 = (positions + vec2(1.)) * 0.5;
  vec2 clip_offset_icon = project_pixel_size_to_clipspace(offset_icon);
  vec2 clip_dimensions_wo_padd = project_pixel_size_to_clipspace(dimensions_wo_padd);
  
  //default pos switch on edge
  if (instanceDragged < 0.5) {
    vec2 clip_offset = project_pixel_size_to_clipspace(abs(instancePixelOffset));
    gl_Position.x += (1.0 - step(-edgeMaxCoord + clip_paddLT.x, gl_Position.x - clip_dimensions_wo_padd.x - clip_offset_icon.x)) * (clip_offset.x * 2.0 + clip_dimensions_wo_padd.x);
    gl_Position.y += (-step(edgeMaxCoord - clip_paddLT.y, gl_Position.y + clip_dimensions_wo_padd.y + clip_offset_icon.y)) * (clip_offset.y * 2.0 + clip_dimensions_wo_padd.y);
  }

  //edge check

    vec2 a = vec2(0.);
    vec2 b = vec2(0.);

    a.x = clamp(gl_Position.x, -edgeMaxCoord + clip_paddLT.x + clip_dimensions_wo_padd.x + clip_offset_icon.x , edgeMaxCoord - clip_paddRB.x + clip_offset_icon.x);
    b.x = clamp(gl_Position.x, -edgeMaxCoord + clip_paddLT.x + clip_dimensions_wo_padd.x + clip_offset_icon.x , edgeMaxCoord - clip_paddRB.x + clip_offset_icon.x);

    a.y = clamp(gl_Position.y, -edgeMaxCoord + clip_paddRB.y - clip_offset_icon.y, edgeMaxCoord - clip_paddLT.y - clip_dimensions_wo_padd.y - clip_offset_icon.y);
    b.y = clamp(gl_Position.y, -edgeMaxCoord + clip_paddRB.y - clip_offset_icon.y, edgeMaxCoord - clip_paddLT.y - clip_dimensions_wo_padd.y - clip_offset_icon.y);

    gl_Position.x = mix(a.x, b.x, positions0.x);
    gl_Position.y = mix(a.y, b.y, 1. - positions0.y);
  
  } else {
    vec3 offset_common = vec3(project_pixel_size(pixelOffset), 0.0);
    DECKGL_FILTER_SIZE(offset_common, geometry);
    gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, offset_common, geometry.position); 
    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
  }

  vTextureCoords = mix(
    instanceIconFrames.xy,
    instanceIconFrames.xy + iconSize,
    (positions.xy + 1.0) / 2.0
  ) / iconsTextureDim;

  vColor = instanceColors;
  DECKGL_FILTER_COLOR(vColor, geometry);

  vColorMode = instanceColorModes;
}
`;
