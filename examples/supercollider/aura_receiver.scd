// AURA-SPEC · SuperCollider receiver example
// Demonstrates the OSC address space produced by @aura-spec/osc-bridge.
// Run the studio relay (WebSocket → UDP 9000) or send directly from a Node bridge.

(
~auraPort = 9000;
~auraSources = IdentityDictionary.new;
~auraRenderer = IdentityDictionary.new;
~auraTransport = IdentityDictionary.new;

// Source position (metres, AURA world: +Z = 0° azimuth, Y up)
OSCdef(\aura_ambient_position, { |msg|
    if (~auraSources[\ambient].isNil) { ~auraSources[\ambient] = IdentityDictionary.new; };
    ~auraSources[\ambient][\position] = msg[1..3];
    // Example: map position to a PanAz index / elevation-aware panner here.
}, "/aura/v1/session/session-aura-demo/source/src-ambient/position");

OSCdef(\aura_ambient_gain, { |msg|
    if (~auraSources[\ambient].isNil) { ~auraSources[\ambient] = IdentityDictionary.new; };
    ~auraSources[\ambient][\gainDb] = msg[1];
}, "/aura/v1/session/session-aura-demo/source/src-ambient/gain");

OSCdef(\aura_ambient_spread, { |msg|
    if (~auraSources[\ambient].isNil) { ~auraSources[\ambient] = IdentityDictionary.new; };
    ~auraSources[\ambient][\spreadDeg] = msg[1];
}, "/aura/v1/session/session-aura-demo/source/src-ambient/spread");

OSCdef(\aura_renderer_order, { |msg|
    ~auraRenderer[\order] = msg[1];
}, "/aura/v1/session/session-aura-demo/renderer/order");

OSCdef(\aura_clock, { |msg|
    ~auraTransport[\beats] = msg[1];
    ~auraTransport[\bpm] = msg[2];
    ~auraTransport[\playing] = msg[3];
}, "/aura/v1/clock");

// Minimal 8-channel spatialisation sketch. Replace the oscillator with your source.
/*
SynthDef(\auraSource, { |out = 0, amp = 0.05, azimuth = 0, spread = 1|
    var sig = SinOsc.ar(220) * amp;
    var pan = PanAz.ar(8, sig, azimuth / pi, width: spread);
    Out.ar(out, pan);
}).add;

~auraVoice = Synth(\auraSource);
~auraVoice.set(\azimuth, 0);
*/

// Inspect state:
// ~auraSources.postln;
// ~auraRenderer.postln;
// ~auraTransport.postln;
)
