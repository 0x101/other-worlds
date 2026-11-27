SELECT TOP 384 g.source_id AS gaia_source_id, g.ra, g.dec, g.ref_epoch, g.parallax, g.parallax_error, g.parallax_over_error, g.pmra, g.pmra_error, g.pmdec, g.pmdec_error, g.phot_g_mean_mag, g.bp_rp, g.ruwe, g.astrometric_params_solved, g.visibility_periods_used, g.ipd_frac_multi_peak, g.astrometric_sigma5d_max, d.r_med_geo, d.r_lo_geo, d.r_hi_geo
FROM gaiadr3.gaia_source AS g
JOIN gaiaedr3_complements.distances AS d ON d.source_id = g.source_id
WHERE g.parallax >= 50.0
AND g.parallax_over_error >= 20.0
AND g.ruwe <= 1.4
AND g.visibility_periods_used >= 10
AND g.astrometric_params_solved = 31
AND g.phot_g_mean_mag <= 12.0
AND g.bp_rp IS NOT NULL
AND g.pmra IS NOT NULL
AND g.pmdec IS NOT NULL
AND d.r_med_geo > 0
AND d.r_lo_geo > 0
AND d.r_hi_geo >= d.r_med_geo
AND d.r_med_geo >= d.r_lo_geo
ORDER BY parallax DESC, gaia_source_id ASC;
