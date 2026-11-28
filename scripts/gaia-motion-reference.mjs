// Independent validation reference: tangent basis vectors, not application imports.
export const BARNARD_SOURCE_ID = '4472832130942575872';
const DEG_TO_RAD = Math.PI / 180;
const MAS_TO_RAD = Math.PI / (180 * 3600 * 1000);

export function independentGaiaState(star, yearOffset) {
  if (!Number.isSafeInteger(yearOffset) || yearOffset < -10000 || yearOffset > 10000) throw new Error('Invalid independent Gaia year offset.');
  const ra = star.ra * DEG_TO_RAD;
  const dec = star.dec * DEG_TO_RAD;
  const sinRa = Math.sin(ra);
  const cosRa = Math.cos(ra);
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const radial = [cosDec * cosRa, sinDec, cosDec * sinRa];
  const east = [-sinRa, 0, cosRa];
  const north = [-sinDec * cosRa, cosDec, -sinDec * sinRa];
  const transverseScale = star.r_med_geo * MAS_TO_RAD * yearOffset;
  const positionPc = radial.map((component, index) => star.r_med_geo * component + transverseScale * (star.pmra * east[index] + star.pmdec * north[index]));
  const distancePc = Math.hypot(...positionPc);
  const unit = positionPc.map((component) => component / distancePc);
  const displayRadius = 5 + 13 * Math.log10(star.r_med_geo + 1);
  return {
    ra: (Math.atan2(unit[2], unit[0]) / DEG_TO_RAD + 360) % 360,
    dec: Math.asin(Math.max(-1, Math.min(1, unit[1]))) / DEG_TO_RAD,
    positionPc,
    distancePc,
    displayRadius,
    displayPosition: unit.map((component) => component * displayRadius),
  };
}
