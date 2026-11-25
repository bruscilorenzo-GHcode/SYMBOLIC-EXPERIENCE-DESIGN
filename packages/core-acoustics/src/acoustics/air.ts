export interface AirConditions {
  temperatureC: number
  humidityPct: number
  pressureKPa: number
}

export const STANDARD_AIR: AirConditions = {
  temperatureC: 20,
  humidityPct: 50,
  pressureKPa: 101.325,
}

/**
 * Atmospheric absorption per metre, based on the ISO 9613-1 formulation.
 * Returns dB/m (not dB/km).
 */
export function airAbsorptionDbPerM(frequencyHz: number, conditions: AirConditions = STANDARD_AIR): number {
  const f = Math.max(frequencyHz, 1)
  const temperatureK = Math.max(conditions.temperatureC + 273.15, 100)
  const referenceTemperatureK = 293.15
  const pressureKPa = Math.max(conditions.pressureKPa, 1)
  const referencePressureKPa = 101.325
  const humidity = Math.min(100, Math.max(0, conditions.humidityPct)) / 100

  const saturationVapourPressureKPa =
    0.61121 * Math.exp((17.502 * conditions.temperatureC) / (conditions.temperatureC + 240.97))
  // ISO 9613-1 expresses the molar water-vapour concentration in percent.
  const molarWaterVapour = humidity * (saturationVapourPressureKPa / pressureKPa) * 100

  const oxygenRelaxation =
    (pressureKPa / referencePressureKPa) *
    (24 + (4.04e4 * molarWaterVapour * (0.02 + molarWaterVapour)) / (0.391 + molarWaterVapour))

  const nitrogenRelaxation =
    (pressureKPa / referencePressureKPa) *
    (temperatureK / referenceTemperatureK) ** -0.5 *
    (9 +
      280 *
        molarWaterVapour *
        Math.exp(-4.17 * ((temperatureK / referenceTemperatureK) ** (-1 / 3) - 1)))

  const classical =
    1.84e-11 * (referencePressureKPa / pressureKPa) * Math.sqrt(temperatureK / referenceTemperatureK)
  const oxygenTerm =
    (0.01275 * Math.exp(-2239.1 / temperatureK)) /
    (oxygenRelaxation + (f * f) / oxygenRelaxation)
  const nitrogenTerm =
    (0.1068 * Math.exp(-3352 / temperatureK)) /
    (nitrogenRelaxation + (f * f) / nitrogenRelaxation)

  const attenuationNepersPerM =
    f *
    f *
    (classical +
      (temperatureK / referenceTemperatureK) ** -2.5 * (oxygenTerm + nitrogenTerm))

  return Math.max(0, 8.686 * attenuationNepersPerM)
}
