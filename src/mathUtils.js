// output n-th root of a number
function nRoot(x, n) {
    return Math.pow(x, 1 / n);
}

// output the fractional part of a number
function fract(x) {
    return x - Math.floor(x);
}

// clamps a number ∈ [low, high]
export function clamp(x, low, high) {
    return Math.min(Math.max(x, low), high);
}

// output a number ∈ [a, b]; when n === 0, output a; when n === 1, output b
export function mix(a, b, n) {
    n = clamp(n, 0, 1);
    return a * (1 - n) + b * n;
}

// inverse function of mix(), output a number ∈ [0, 1]; when x === low, output 0; when x === b, output 1
function remap01(x, low, high) {
    return clamp((x - low) / (high - low), 0, 1);
}

// remaps x from [lowIn, highIn] to [lowOut, highOut]
function remap(x, lowIn, highIn, lowOut, highOut) {
    return mix(lowOut, highOut, remap01(x, lowIn, highIn));
}

function even2(a) { // make input a: 1. an even number; 2. at least 2
    return Math.ceil(Math.max(a, 2) / 2) * 2;
}

/**
 * function that generates an s-curve ∈ [0, 1], sort of like:
 __
 /
 |
 __/
 * a ∈ [2, 4, 6, 8, 10, ...]. a ↑ --> curve approaches y = x
 **/
function remap01CurveS(x, low, high, a = 2) {
    let r = remap01(x, low, high);
    a = even2(a);
    return (1 - r) * Math.pow(r, a) + r * (-Math.pow(r - 1, a) + 1);
}

function remapCurveS(x, lowIn, highIn, lowOut, highOut, a = 2) {
    return mix(lowOut, highOut, remap01CurveS(x, lowIn, highIn, a));
}

/**
 * function that generates a curve within [0, 1] that assends faster when approaching 1, sort of like:
 |
 |
 /
 __
 * a ∈ [2, 4, 6, 8, 10, ...]. a ↑ --> curve initial slope becomes smaller
 **/
function remap01CurveEaseIn1(x, low, high, a = 2) {
    let r = remap01(x, low, high);
    a = even2(a);
    return -nRoot(1 - r, a) + 1;
}

function remapCurveEaseIn1(x, lowIn, highIn, lowOut, highOut, a = 2) {
    return mix(lowOut, highOut, remap01CurveEaseIn1(x, lowIn, highIn, a));
}

function remap01CurveEaseIn2(x, low, high, a = 6) {
    let r = remap01(x, low, high);
    return -Math.pow(r - 1, a) + 1;
}
function remapCurveEaseIn2(x, lowIn, highIn, lowOut, highOut, a = 6) {
    return mix(lowOut, highOut, remap01CurveEaseIn2(x, lowIn, highIn, a));
}

/**
 * function that generates a curve within [0, 1] that tapers off, sort of like:
 __
 /
 |
 |
 * a ∈ [2, 4, 6, 8, 10, ...]. a ↑ --> curve initial slope becomes bigger
 **/
function remap01CurveEaseOut1(x, low, high, a = 2) {
    let r = remap01(x, low, high);
    a = even2(a);
    return -Math.pow(r - 1, a) + 1;
}
function remapCurveEaseOut1(x, lowIn, highIn, lowOut, highOut, a = 2) {
    return mix(lowOut, highOut, remap01CurveEaseOut1(x, lowIn, highIn, a));
}


function remap01CurveEaseOut2(x, low, high, a = 2) {
    let r = remap01(x, low, high);
    a = even2(a);
    return -Math.pow(r - 1, a) + 1;
}
export function remapCurveEaseOut2(x, lowIn, highIn, lowOut, highOut, a = 2) {
    return mix(lowOut, highOut, remap01CurveEaseOut2(x, lowIn, highIn, a));
}

function smoothstep(a, b, x) {
    let l = remap01(x, a, b);
    return 3 * l * l - 2 * l * l * l;
}

function expSustainedImpulse( x, f, k )
{
    let s = Math.max(x-f,0.0);
    return Math.min( x*x/(f*f), 1.0+(2.0/f)*s*Math.exp(-k*s));
}

function parabola(x, m) {
    x = clamp(x, 0, 1);
    return Math.pow(4 * x * (1 - x), m);
}

const mathUtilShader = `
    float Remap01 (float x, float low, float high) {
        return clamp((x - low) / (high - low), 0., 1.);
    }

    float Remap (float x, float lowIn, float highIn, float lowOut, float highOut) {
        return mix(lowOut, highOut, Remap01(x, lowIn, highIn));
    }
`;
