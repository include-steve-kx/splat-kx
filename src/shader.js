const commonShader = `
    float remap01(float x, float low, float high) {
        return clamp((x - low) / (high - low), 0., 1.);
    }
    
    float remap(float x, float lowIn, float highIn, float lowOut, float highOut) {
        return mix(lowOut, highOut, remap01(x, lowIn, highIn));
    }
    
    float nRoot(float x, float n) {
        return pow(x, 1. / n);
    }
    
    float even2(float a) {
        return ceil(max(a, 2.) / 2.) * 2.;
    }
    
    float remap01CurveEaseIn(float x, float low, float high, float a) {
        float r = remap01(x, low, high);
        a = even2(a);
        return -nRoot(1. - r, a) + 1.;
    }
    
    float remapCurveEaseIn(float x, float lowIn, float highIn, float lowOut, float highOut, float a) {
        return mix(lowOut, highOut, remap01CurveEaseIn(x, lowIn, highIn, a));
    }
    
    float remap01CurveEaseOut1(float x, float low, float high, float a) {
        float r = remap01(x, low, high);
        a = even2(a);
        return -pow(r - 1., a) + 1.;
    }
    
    float remapCurveEaseOut1(float x, float lowIn, float highIn, float lowOut, float highOut, float a) {
        return mix(lowOut, highOut, remap01CurveEaseOut1(x, lowIn, highIn, a));
    }
    
    float remap01CurveEaseOut2(float x, float low, float high, float a) {
        float r = remap01(x, low, high);
        a = even2(a);
        return -pow(r - 1., a) + 1.;
    }
    
    float remapCurveEaseOut2(float x, float lowIn, float highIn, float lowOut, float highOut, float a) {
        return mix(lowOut, highOut, remap01CurveEaseOut2(x, lowIn, highIn, a));
    }
    
    float expSustainedImpulse( float x, float f, float k )
    {
        float s = max(x-f,0.0);
        return min( x*x/(f*f), 1.0+(2.0/f)*s*exp(-k*s));
    }
`;

const helperShader = `
    mat3 correctRotation() {
        float ay = -3.14159 / 5.;
        float ax = 3.14159;
        mat3 rx = mat3(
            1., 0., 0.,
            0., cos(ax), -sin(ax),
            0., sin(ax), cos(ax)
        );
        mat3 ry = mat3(
            cos(ay), 0., -sin(ay),
            0., 1., 0.,
            sin(ay), 0., cos(ay)
        );
        // mat3 rz = mat3(
        //     cos(a), -sin(a), 0.,
        //     sin(a), cos(a), 0.,
        //     0., 0., 1.
        // );
        return ry * rx;
    }
    
    vec3 randomNoiseVec3(float index) {
        float x = fract(sin(index * 34.678) * 41.89);
        float y = fract(cos(sin(index + index * index) * 56.743 + 18.794) * 93.37);
        float z = fract(sin(cos(index * 89.32) * 23.167 + 28.842) * 84.273);
        return vec3(x, y, z);
    }
    
    vec3 randomPosition(float index, float t) {
        vec3 v = randomNoiseVec3(index);
        
        float xp = 0.3 * sin(t * 0.6 + index) * v.x;
        float yp = 0.2 * cos(t * 0.8 + index) * v.y;
        float zp = 0.4 * sin(t * 0.4 + index) * cos(t * 0.06) * v.z;
        return vec3(xp, yp, zp);
    }
`;

export const vertexShaderSource = `
#version 300 es
precision highp float;
precision highp int;

${commonShader}
${helperShader}

uniform highp usampler2D u_texture;
uniform mat4 projection, view;
uniform vec2 focal;
uniform vec2 viewport;

uniform vec2 uMouse;
uniform float uTime;

in vec2 position;
in int index;

out vec4 vColor;
out vec2 vPosition;

void main () {
    uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & 0x3ffu) << 1, uint(index) >> 10), 0);
    vec3 pos = uintBitsToFloat(cen.xyz);
    mat3 rot = correctRotation();
    pos = rot * pos;
    vec4 cam = view * vec4(pos, 1);
    vec4 pos2d = projection * cam;

    float clip = 1.2 * pos2d.w;
    if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) << 1) | 1u, uint(index) >> 10), 0);
    vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    mat3 J = mat3(
        focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z), 
        0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z), 
        0., 0., 0.
    );

    mat3 T = transpose(mat3(view) * rot) * J;
    mat3 cov2d = transpose(T) * Vrk * T;

    float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
    float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if(lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
    vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
    vPosition = position;

    vec2 vCenter = vec2(pos2d) / pos2d.w;
    
    
    float distance = length(uMouse - vCenter);
    float distanceThreshold = 0.5;
    float distanceAnimateFactor = smoothstep(distanceThreshold, 0., distance);
    
    float uAnimateScale = 1.;
    pos = pos + randomPosition(float(index), uTime * 2.) * distanceAnimateFactor * uAnimateScale;
    pos2d = projection * view * vec4(pos, 1.);
    vCenter = vec2(pos2d) / pos2d.w;

    gl_Position = vec4(
        vCenter 
        + position.x * majorAxis / viewport 
        + position.y * minorAxis / viewport, 0.0, 1.0);

}
`.trim();

export const fragmentShaderSource = `
#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vPosition;

uniform float uAnimateTime;

out vec4 fragColor;

void main () {
    float A = -dot(vPosition, vPosition);
    if (A < -4.0) discard;
    float B = exp(A) * vColor.a;
    vec3 color = B * vColor.rgb;
    float alpha = B;
    
    // 0. --> 1.
    // color: * 0.0001
    // alpha: * 0.0001
    float animateOffset = smoothstep(0.9, 1., uAnimateTime);
    float colorOffset = mix(1., 0., animateOffset);
    float alphaOffset = mix(1., 0., animateOffset);
    
    color *= colorOffset;
    alpha *= alphaOffset;
    
    fragColor = vec4(color, alpha);
}

`.trim();