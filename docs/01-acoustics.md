# Acoustic and Spatialisation Mathematics

This document is the normative reference for `packages/core-acoustics`. It states the conventions, the equations and the engineering approximations. If code and document disagree, the code is wrong until reconciled.

---

## 1. Coordinates and units

- Right-handed Cartesian world, **metres**, **Y up**, **+Z = 0° azimuth**.
- Azimuth: `atan2(x, z)`, positive toward **+X**; range `[-180°, 180°)`.
- Elevation: `atan2(y, sqrt(x² + z²))`; range `[-90°, 90°]`.
- Speaker orientation: `[yaw, pitch, roll]` degrees, intrinsic **Y-X-Z**:
  - yaw around +Y,
  - pitch around +X,
  - roll around +Z.
- Frequency bands: 63 Hz–16 kHz, octave or third-octave.
- SPL: dB re 20 µPa. Electrical power: W. Voltage: V RMS. Distance: m. Time: s.

A local direction `u_local` is obtained from the world direction `u_world` by the inverse rotation:

```
u_world = R_y(yaw) R_x(pitch) R_z(roll) u_local
u_local = R^T u_world
```

The polar balloon is defined in the **local** frame. The on-axis direction is local +Z.

---

## 2. Directivity

A manufacturer balloon is represented as:

```
D_dB(θ, φ, f) = 20 log10 D(θ, φ, f)
```

with `D ∈ [0, 1]` normalised so that `D(0, 0, f) = 1` (0 dB on axis). A rigorously normalised directivity may instead be stored as absolute dB; the sampler subtracts the on-axis value before propagation.

Three representations are supported:

1. **Measured grid** — `PolarGrid` with azimuth/elevation/frequency axes and dB values.
2. **Real spherical harmonics** — coefficients fitted from the grid; smooth, compact, GPU-friendly.
3. **Parametric** — omni, cardioid, supercardioid, acoustic lens, line array. These are engineering models, not manufacturer claims.

Sampling uses bilinear interpolation on the sphere and linear interpolation in **log-frequency**:

```
D_dB(θ, φ, f) = interp_logf(
  bilinear_sphere(grid, θ, φ, f_lo),
  bilinear_sphere(grid, θ, φ, f_hi),
  f
)
```

Azimuth wraps; elevation is clamped to the measured cap. Outside the measured region the parser warns rather than silently extrapolating.

### 2.1 Real spherical harmonics

The real orthonormal basis is used up to order `N`:

```
Y_l^0(θ,φ) = K_l^0 P_l(cos θ)
Y_l^m(θ,φ) = √2 K_l^m P_l^m(cos θ) cos(mφ),  m > 0
Y_l^{-m}(θ,φ) = √2 K_l^m P_l^m(cos θ) sin(mφ), m > 0

K_l^m = sqrt( (2l+1)/(4π) · (l−m)!/(l+m)! )
```

The fit is a regularised least-squares solve per band:

```
min_c || A c − y ||² + λ ||c||²
(AᵀA + λI) c = Aᵀ y
```

with `A` the sampled basis matrix and `y` the measured dB values. `λ` is small (≈1e-6) and exists to stabilise sparse grids. Coefficient ordering is `l = 0..N`, `m = −l..l`.

---

## 3. Direct SPL at a receiver

Let:

- source position `s = (x_s, y_s, z_s)`,
- receiver position `r = (x, y, z)`,
- source orientation `(yaw, pitch, roll)`,
- band frequency `f`,
- distance `d = ||r − s||`,
- reference distance `d₀ = 1 m` (sensitivity reference),
- on-axis sensitivity `L_sens(f)` in dB SPL at `d₀` for electrical reference power `P_ref` (usually 1 W),
- electrical input power `P`,
- directivity `D(θ, φ, f)` (linear, on-axis 1),
- gain trim `G` (dB),
- atmospheric absorption `α(f)` (dB/m),
- occlusion/insertion loss `A_occ` (dB).

Then:

```
u = (r − s) / d
u_local = R^T u
θ = atan2(u_local,x, u_local,z)
φ = asin(u_local,y)

L(f) = L_sens(f)
     + 10 log10(P / P_ref)
     + 20 log10 D(θ, φ, f)
     − 20 log10(d / d₀)
     − α(f) · (d − d₀)
     + G
     − A_occ
```

The `(d − d₀)` term avoids double-counting the 1 m reference atmosphere already embedded in the sensitivity. For `d < d₀`, the absorption term is clamped to zero.

The implementation is in `packages/core-acoustics/src/acoustics/spl.ts` (`computeSourceSpl`, `splAtReceiver`).

### 3.1 Voltage sensitivity

If the manufacturer specifies `dB SPL @ 2.83 V / 1 m` instead of 1 W, convert using the nominal impedance `Z`:

```
L_sens,1W = L_sens,2.83V − 10 log10( (2.83² / Z) / 1 W )
```

For `Z = 8 Ω`, `2.83² / 8 ≈ 1 W`, so the numerical difference is small; for other impedances it is not. The schema keeps sensitivity and impedance as band series so the conversion can be band-specific.

### 3.2 Worked example

A point source with `L_sens = 100 dB @ 1 W / 1 m`, `P = 10 W`, `D = −6 dB` at the receiver angle, `d = 10 m`, `G = 0`, `α = 0.005 dB/m`, `A_occ = 0`:

```
L = 100 + 10 log10(10) − 6 − 20 log10(10) − 0.005·9
  = 100 + 10 − 6 − 20 − 0.045
  = 83.955 dB SPL
```

### 3.3 Incoherent and coherent summation

Independent sources (different programs, decorrelated reverberation, or architectural coverage studies) sum in energy:

```
L_total = 10 log10 Σ_i 10^(L_i / 10)
```

Phase-aligned sources at low frequency sum as complex pressure:

```
p_i = p_ref · 10^(L_i / 20) · e^{j(−k d_i + φ_i)}
L_total = 20 log10( |Σ_i p_i| / p_ref )
k = 2π f / c
```

`φ_i` includes polarity and delay:

```
φ_i = π · polarity_i − 2π f · delay_i
```

Coherent summation is appropriate for subwoofer arrays, delay-ring alignment studies and low-frequency overlap. It is not a substitute for a full room simulation at mid/high frequency.

---

## 4. Line arrays and beam steering

### 4.1 Cylindrical-to-spherical transition

For a line source of length `L` at frequency `f`:

```
d_nf = L² f / (2c)
```

Inside `d_nf`, the wavefront is approximately cylindrical; outside, it becomes spherical. A smooth engineering model is:

```
L_geom(d) = 10 log10(d/d₀) + 10 log10(1 + d/d_nf)
```

- `d << d_nf`: `L_geom ≈ 10 log10(d/d₀)` → **−3 dB per doubling**.
- `d >> d_nf`: `L_geom ≈ 20 log10(d/d₀) − 10 log10(d_nf/d₀)` → **−6 dB per doubling**.

The implementation is `lineSourceAttenuationDb` in `line-array.ts`. It is a design approximation; measured line arrays have frequency-dependent near-field behaviour, sidelobes and enclosure diffraction.

### 4.2 Array factor

For `N` uniformly spaced elements, spacing `s`, steering angle `θ_s`, observation angle `θ`:

```
ψ = k s (sin θ − sin θ_s)
AF(ψ) = | sin(Nψ/2) / (N sin(ψ/2)) |
```

The main lobe is 0 dB at `θ = θ_s`. The first null occurs when `Nψ/2 = π`.

### 4.3 Steering delays

```
τ_n = n · s · sin θ_s / c,   n = 0..N−1
```

Apply `τ_n` as an electronic delay per element (or an equivalent phase shift at a single frequency). The far-field pattern is only valid above the near-field transition and below the spatial aliasing limit.

### 4.4 Grating lobes

Uniform spacing must satisfy:

```
s ≤ λ_min / 2   →   f_max = c / (2s)
```

At 343 m/s and `s = 0.15 m`, `f_max ≈ 1143 Hz`; above this, steering produces grating lobes. Real line arrays use amplitude shading, unequal spacing or DSP to mitigate this. The platform must surface the aliasing frequency in the UI when the user steers a line array.

### 4.5 Example

`L = 2 m`, `f = 1 kHz`, `c = 343 m/s`:

```
d_nf = 4 · 1000 / 686 ≈ 5.83 m
```

At 2 m → 4 m, the model gives approximately **4.0 dB** loss instead of the point-source **6.0 dB** loss. This is the audible/measurable advantage of a line source in its near field.

---

## 5. Atmospheric absorption

`airAbsorptionDbPerM(f, T, RH, p)` follows the ISO 9613-1 formulation:

```
T  = temperature [K]
T₀ = 293.15 K
p  = pressure [kPa]
p₀ = 101.325 kPa
h  = molar water-vapour concentration [%]
```

Relaxation frequencies:

```
f_rO = (p/p₀) · (24 + 4.04×10⁴ · h · (0.02 + h)/(0.391 + h))
f_rN = (p/p₀) · (T/T₀)^(−1/2) · (9 + 280 h · exp(−4.17[(T/T₀)^(−1/3) − 1]))
```

Absorption:

```
α = 8.686 f² [
      1.84×10⁻¹¹ (p₀/p) √(T/T₀)
    + (T/T₀)^(−5/2) (
        0.01275 exp(−2239.1/T) / (f_rO + f²/f_rO)
      + 0.1068  exp(−3352/T)  / (f_rN + f²/f_rN)
      )
    ]
```

`α` is returned in **dB/m**. At 20 °C, 50 % RH, 101.325 kPa, the implementation gives approximately:

| f | α (dB/m) |
|---|---|
| 1 kHz | ≈ 0.0045 |
| 8 kHz | ≈ 0.09 |

These are engineering values for design; commissioned measurements should use on-site temperature, humidity and wind.

---

## 6. Room acoustics and D/R

### 6.1 Sabine and Eyring

```
T60_Sabine = 0.161 V / (S ᾱ)
T60_Eyring = 0.161 V / (−S ln(1 − ᾱ))
```

- `V` volume [m³],
- `S` total surface area [m²],
- `ᾱ` area-weighted mean absorption.

Sabine is adequate for `ᾱ < 0.2`; Eyring is preferable for heavily treated rooms.

### 6.2 Room constant and critical distance

```
R = S ᾱ / (1 − ᾱ)          [m² sabins]
r_c = sqrt(Q R / (16π))     [m]
```

`Q` is the source directivity factor (`Q = 1` for omnidirectional).

### 6.3 Direct-to-reverberant ratio

```
D/R(d) = 10 log10( Q R / (16π d²) )
```

At the critical distance, `D/R = 0 dB`. The diffuse-field level relative to the 1 m free-field level is:

```
L_rev = L_1m + 10 log10(4/R)
```

The implementation exposes `directToReverberantDb`, `criticalDistanceM`, `roomConstantM2` and `sabineT60`.

### 6.4 Limits

This is a statistical room model, not a geometrical acoustic simulation. It assumes a diffuse field, uniform absorption and a steady state. For coupled volumes, courtyards, façades and vegetated spaces, use ray tracing or measured impulse responses in M2+.

---

## 7. Intelligibility, clarity and phase

### 7.1 STI engineering estimate

A full STI measurement requires modulated test signals and octave-band analysis per IEC 60268-16. The scaffold provides a deterministic **engineering estimate** from T60 and SNR:

```
m_rev(F) = 1 / sqrt(1 + (2π F T60 / 13.8)²)
m_noise  = 1 / (1 + 10^(−SNR/10))
m(F)     = m_rev(F) · m_noise
SNR_eff  = 10 log10( m / (1 − m) )
TI       = clamp( (SNR_eff + 15) / 30, 0, 1 )
STI      = Σ_band w_band · mean_F(TI)
```

Modulation frequencies: 0.63–12.5 Hz (14 values). Octave bands: 125–8000 Hz. Male weights: `[0.129, 0.143, 0.114, 0.114, 0.186, 0.171, 0.143]`.

The result is labelled `method: "engineering-estimate"`. Never present it as a certified STI.

### 7.2 Clarity

```
C50 = 10 log10( E_0–50ms / E_50ms–∞ )
```

The implementation accepts early and late energies. A future impulse-response module will compute it from measured or simulated RIRs.

### 7.3 Phase alignment

For arrivals at one receiver:

```
coherence = | Σ a_i e^{−j(k d_i + φ_i)} | / Σ a_i
```

`coherence = 1` means perfect alignment; `0` means complete cancellation. This is used for delay-ring and subwoofer alignment displays. It is not a substitute for a complex transfer-function measurement.

---

## 8. Coverage heatmaps

A listener plane is a polygon at height `h`, sampled on a regular grid of resolution `Δ`:

```
(x, z) ∈ bbox(footprint), step Δ
inside = point-in-polygon((x, z), footprint)
L(x,z) = incoherent_sum_i SPL_i(receiver = (x, h, z), f)
```

Statistics:

- min / max / mean,
- standard deviation,
- percentage within ±tolerance of the mean (default ±3 dB).

The implementation returns a row-major `Float32Array` plus a mask, which maps directly to a `DataTexture` in the Three.js studio. The MVP uses incoherent summation; the request exposes a `coherent` flag for low-frequency studies.

### 8.1 What a heatmap does not show

- temporal texture, diffusion and envelopment,
- speech intelligibility in occupied conditions,
- wind, temperature gradients and vegetation,
- structural vibration and flanking,
- listener orientation and binaural cues,
- artistic intent.

The UI should always pair a coverage map with the underlying assumptions.

---

## 9. Calibration and validation

Before a project is approved:

1. **Units** — verify CAD/raster scale against a known dimension; store the calibration method and confidence.
2. **Polar data** — verify the on-axis normalisation, angle convention and frequency bands against the manufacturer file.
3. **Sensitivity** — verify 1 W vs 2.83 V and the impedance reference.
4. **Geometry** — verify surface areas and material assignment; check openings and coupled volumes.
5. **Weather** — use site temperature, humidity and pressure; flag wind as a separate uncertainty.
6. **SPL** — spot-check with a calibrated sound level meter at 3–5 positions.
7. **Phase** — verify subwoofer/delay alignment with a dual-channel FFT.
8. **Network/audio** — verify Dante/AES67 clocking, latency and channel map in the venue.

The deterministic core makes these checks repeatable. Store the measurement, the model version and the delta.

---

## 10. Numerical notes

- Clamp distances to a small positive value to avoid division by zero.
- Use log-frequency interpolation for band data; linear interpolation over octaves biases the midpoint.
- Clamp `D` to a floor (e.g., `1e-6`) before taking dB.
- Treat `NaN`/`Infinity` as invalid in project JSON; the heatmap uses `NaN` only internally for “outside the footprint”.
- Prefer `Float32Array` for GPU-bound grids and `number` for scalar APIs.
- Avoid accumulating dB values; convert to power or pressure, sum, then convert back.

---

## 11. References and standards

- ISO 9613-1 — atmospheric absorption.
- ISO 3382 — room acoustic parameters.
- IEC 60268-16 — speech intelligibility (STI).
- Beranek, *Acoustics* — room constant and critical distance.
- Vorländer, *Auralization* — room simulation and rendering.
- Zotter & Frank, *Ambisonics* — HOA conventions and decoding.
- Pulkki, *Spatial Sound Generation and Perception* — VBAP and amplitude panning.
- Standard line-array texts for near-field/far-field transitions and grating lobes.

The code is an engineering implementation, not a certified measurement system.
