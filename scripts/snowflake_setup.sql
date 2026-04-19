-- BioScope Snowflake Setup
-- Run this after loading observations into THREATENED_SPECIES table

-- 1. Species interactions table (from GloBI + synthetic)
CREATE TABLE IF NOT EXISTS SPECIES_INTERACTIONS (
    source_species VARCHAR,
    target_species VARCHAR,
    interaction_type VARCHAR,
    strength FLOAT,
    data_source VARCHAR  -- 'globi' or 'modeled'
);

-- 2. Species metadata
CREATE TABLE IF NOT EXISTS SPECIES_METADATA (
    scientific_name VARCHAR PRIMARY KEY,
    common_name VARCHAR,
    trophic_level VARCHAR,
    iconic_taxon VARCHAR,
    taxon_order VARCHAR,
    family VARCHAR,
    observation_count INT,
    zone_count INT,
    decline_trend FLOAT,
    keystone_score FLOAT,
    habitat VARCHAR
);

-- 3. Cascade analysis view — for each species, count how many depend on it
CREATE OR REPLACE VIEW cascade_dependency_count AS
SELECT
    s.common_name,
    s.scientific_name,
    s.trophic_level,
    s.keystone_score,
    s.decline_trend,
    s.observation_count,
    COUNT(DISTINCT i.target_species) AS direct_dependents,
    CASE
        WHEN s.keystone_score >= 0.15 AND s.decline_trend < -10 THEN 'CRITICAL'
        WHEN s.keystone_score >= 0.1 OR s.decline_trend < -20 THEN 'HIGH'
        WHEN s.keystone_score > 0 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS priority
FROM SPECIES_METADATA s
LEFT JOIN SPECIES_INTERACTIONS i ON s.scientific_name = i.source_species
GROUP BY s.common_name, s.scientific_name, s.trophic_level,
         s.keystone_score, s.decline_trend, s.observation_count
ORDER BY s.keystone_score DESC;

-- 4. Interaction network view
CREATE OR REPLACE VIEW interaction_network AS
SELECT
    i.source_species,
    sm1.common_name AS source_name,
    sm1.trophic_level AS source_trophic,
    i.target_species,
    sm2.common_name AS target_name,
    sm2.trophic_level AS target_trophic,
    i.interaction_type,
    i.strength,
    i.data_source
FROM SPECIES_INTERACTIONS i
JOIN SPECIES_METADATA sm1 ON i.source_species = sm1.scientific_name
JOIN SPECIES_METADATA sm2 ON i.target_species = sm2.scientific_name;

-- 5. Ecosystem health summary
CREATE OR REPLACE VIEW ecosystem_health AS
SELECT
    CASE
        WHEN latitude BETWEEN 32.53 AND 32.63 THEN 'South'
        WHEN latitude BETWEEN 32.63 AND 32.73 THEN 'Central-South'
        WHEN latitude BETWEEN 32.73 AND 32.83 THEN 'Central'
        WHEN latitude BETWEEN 32.83 AND 32.93 THEN 'Central-North'
        WHEN latitude BETWEEN 32.93 AND 33.03 THEN 'North'
        ELSE 'Far North'
    END AS region,
    COUNT(DISTINCT scientific_name) AS species_count,
    COUNT(*) AS observation_count,
    COUNT(DISTINCT iconic_taxon_name) AS taxon_diversity,
    ROUND(AVG(CASE WHEN quality_grade = 'research' THEN 1.0 ELSE 0.5 END), 2) AS data_quality
FROM THREATENED_SPECIES
GROUP BY region
ORDER BY region;

-- 6. Cortex AI function for cascade impact analysis
CREATE OR REPLACE FUNCTION analyze_cascade_impact(
    species_name VARCHAR,
    keystone_score FLOAT,
    victim_count INT,
    trophic_levels_hit INT,
    ecosystem_name VARCHAR
)
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
    SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large',
        CONCAT(
            'You are a conservation ecologist analyzing cascade effects in San Diego County ecosystems. ',
            'Species: ', species_name, '. ',
            'Keystone score: ', keystone_score::VARCHAR, ' (0-1 scale, higher = more critical). ',
            'If removed, ', victim_count::VARCHAR, ' other species would collapse across ',
            trophic_levels_hit::VARCHAR, ' trophic levels. ',
            'Ecosystem: ', ecosystem_name, '. ',
            'Write a 2-3 sentence ecological impact assessment. Be specific about ecological functions lost. ',
            'End with one concrete conservation action. No headers or bullets, just flowing text.'
        )
    )
$$;

-- 7. Cortex AI function for zone risk assessment
CREATE OR REPLACE FUNCTION assess_zone_risk(
    zone_name VARCHAR,
    species_count INT,
    missing_levels VARCHAR,
    decline_pct FLOAT
)
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
    SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large',
        CONCAT(
            'You are a conservation ecologist. Zone: ', zone_name, ' in San Diego County. ',
            'Species count: ', species_count::VARCHAR, '. ',
            'Missing trophic levels: ', missing_levels, '. ',
            'Year-over-year decline: ', decline_pct::VARCHAR, '%. ',
            'Assess collapse risk in 2-3 sentences. Be specific about which ecological functions are failing ',
            'and what the real-world consequences are for this area. End with a priority recommendation.'
        )
    )
$$;
