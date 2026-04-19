-- BioScope Snowflake Setup
-- Run these statements in order in your Snowflake worksheet
-- Account: otipiuk-tmb54945

-- ============================================
-- STEP 1: Create database and schema
-- ============================================
CREATE DATABASE IF NOT EXISTS BIOSCOPE;
USE DATABASE BIOSCOPE;
USE SCHEMA PUBLIC;

-- ============================================
-- STEP 2: Create file format for CSV uploads
-- ============================================
CREATE OR REPLACE FILE FORMAT bioscope_csv
  TYPE = 'CSV'
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  SKIP_HEADER = 1
  NULL_IF = ('', 'NULL');

-- ============================================
-- STEP 3: Create tables
-- ============================================

-- Zone-level biodiversity metrics (49 zones in San Diego County)
CREATE OR REPLACE TABLE regional_biodiversity (
  region VARCHAR,
  total_observations INT,
  unique_species INT,
  shannon_index FLOAT,
  biodiversity_score FLOAT
);

-- Temporal trends per zone per year
CREATE OR REPLACE TABLE temporal_trends (
  region VARCHAR,
  year INT,
  year_month VARCHAR,
  unique_species INT,
  observation_count INT
);

-- Species dependency graph (food web edges)
CREATE OR REPLACE TABLE species_dependencies (
  source VARCHAR,
  target VARCHAR,
  relationship_type VARCHAR,
  strength FLOAT
);

-- Raw threatened species observations (large dataset)
CREATE OR REPLACE TABLE threatened_species (
  id INT,
  observed_on DATE,
  quality_grade VARCHAR,
  captive_cultivated BOOLEAN,
  place_guess VARCHAR,
  latitude FLOAT,
  longitude FLOAT,
  place_county_name VARCHAR,
  scientific_name VARCHAR,
  common_name VARCHAR,
  iconic_taxon_name VARCHAR,
  taxon_id INT,
  taxon_kingdom_name VARCHAR,
  taxon_class_name VARCHAR,
  taxon_order_name VARCHAR,
  taxon_family_name VARCHAR
);

-- ============================================
-- STEP 4: Load data from CSV files
-- Use Snowflake UI: Data > Add Data > Load Files
-- Or use PUT + COPY INTO as shown below
-- ============================================

-- Option A: Using internal stage (easiest for hackathon)
CREATE OR REPLACE STAGE bioscope_stage
  FILE_FORMAT = bioscope_csv;

-- After uploading files via Snowflake UI or snowsql PUT:
-- PUT file:///path/to/regional_biodiversity.csv @bioscope_stage;
-- PUT file:///path/to/temporal_trends.csv @bioscope_stage;
-- PUT file:///path/to/species_dependencies.csv @bioscope_stage;
-- PUT file:///path/to/threatened_species.csv @bioscope_stage;

COPY INTO regional_biodiversity
FROM @bioscope_stage/regional_biodiversity.csv
FILE_FORMAT = bioscope_csv
ON_ERROR = 'CONTINUE';

COPY INTO temporal_trends
FROM @bioscope_stage/temporal_trends.csv
FILE_FORMAT = bioscope_csv
ON_ERROR = 'CONTINUE';

COPY INTO species_dependencies
FROM @bioscope_stage/species_dependencies.csv
FILE_FORMAT = bioscope_csv
ON_ERROR = 'CONTINUE';

COPY INTO threatened_species
FROM @bioscope_stage/threatened_species.csv
FILE_FORMAT = bioscope_csv
ON_ERROR = 'CONTINUE';

-- ============================================
-- STEP 5: Verify data loaded
-- ============================================
SELECT 'regional_biodiversity' AS tbl, COUNT(*) AS rows FROM regional_biodiversity
UNION ALL
SELECT 'temporal_trends', COUNT(*) FROM temporal_trends
UNION ALL
SELECT 'species_dependencies', COUNT(*) FROM species_dependencies
UNION ALL
SELECT 'threatened_species', COUNT(*) FROM threatened_species;

-- ============================================
-- STEP 6: Analytical views
-- ============================================

-- Zone rankings by biodiversity score
CREATE OR REPLACE VIEW zone_rankings AS
SELECT region,
  biodiversity_score,
  unique_species,
  total_observations,
  RANK() OVER (ORDER BY biodiversity_score DESC) AS rank
FROM regional_biodiversity
ORDER BY rank;

-- Declining zones (comparing first vs last year of data)
CREATE OR REPLACE VIEW declining_zones AS
WITH yearly AS (
  SELECT region, year, SUM(unique_species) AS yearly_species
  FROM temporal_trends
  GROUP BY region, year
),
first_last AS (
  SELECT region,
    MAX(CASE WHEN year = (SELECT MIN(year) FROM yearly) THEN yearly_species END) AS first_year_species,
    MAX(CASE WHEN year = (SELECT MAX(year) FROM yearly) THEN yearly_species END) AS last_year_species
  FROM yearly
  GROUP BY region
)
SELECT region,
  first_year_species,
  last_year_species,
  last_year_species - first_year_species AS species_change,
  ROUND((last_year_species - first_year_species)::FLOAT / NULLIF(first_year_species, 0) * 100, 2) AS pct_change
FROM first_last
WHERE first_year_species IS NOT NULL AND last_year_species IS NOT NULL
ORDER BY pct_change ASC;

-- Monthly trend summary across all zones
CREATE OR REPLACE VIEW monthly_trends AS
SELECT year_month,
  SUM(unique_species) AS total_unique_species,
  SUM(observation_count) AS total_observations,
  COUNT(DISTINCT region) AS zones_reporting
FROM temporal_trends
GROUP BY year_month
ORDER BY year_month;

-- Keystone species: most connected in the dependency graph
CREATE OR REPLACE VIEW keystone_species AS
WITH outgoing AS (
  SELECT source AS species, COUNT(*) AS dependents
  FROM species_dependencies
  GROUP BY source
),
incoming AS (
  SELECT target AS species, COUNT(*) AS dependencies
  FROM species_dependencies
  GROUP BY target
)
SELECT COALESCE(o.species, i.species) AS species,
  COALESCE(o.dependents, 0) AS dependents,
  COALESCE(i.dependencies, 0) AS dependencies,
  COALESCE(o.dependents, 0) + COALESCE(i.dependencies, 0) AS total_connections
FROM outgoing o
FULL OUTER JOIN incoming i ON o.species = i.species
ORDER BY total_connections DESC;

-- Species observation hotspots
CREATE OR REPLACE VIEW species_by_zone AS
SELECT place_county_name AS zone,
  scientific_name,
  common_name,
  iconic_taxon_name AS taxon_group,
  COUNT(*) AS observation_count,
  MIN(observed_on) AS first_observed,
  MAX(observed_on) AS last_observed
FROM threatened_species
WHERE quality_grade = 'research'
GROUP BY zone, scientific_name, common_name, iconic_taxon_name
ORDER BY observation_count DESC;

-- Taxonomic breakdown per zone
CREATE OR REPLACE VIEW taxonomic_breakdown AS
SELECT iconic_taxon_name AS taxon_group,
  COUNT(DISTINCT scientific_name) AS species_count,
  COUNT(*) AS total_observations
FROM threatened_species
WHERE quality_grade = 'research'
GROUP BY iconic_taxon_name
ORDER BY species_count DESC;

-- ============================================
-- STEP 7: Snowflake Cortex AI (test availability)
-- Run this to check if Cortex works on your account
-- ============================================
SELECT SNOWFLAKE.CORTEX.COMPLETE(
  'mistral-7b',
  'Summarize in one sentence: San Diego County has 49 ecological zones with 60 threatened species tracked.'
) AS cortex_test;

-- Cortex-powered ecological analysis for a zone
-- This is what we'll call from the API
CREATE OR REPLACE FUNCTION analyze_zone(zone_name VARCHAR)
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
  SELECT SNOWFLAKE.CORTEX.COMPLETE(
    'mistral-large',
    CONCAT(
      'You are an ecologist analyzing biodiversity in San Diego County. ',
      'Analyze this zone briefly (under 150 words): ',
      zone_name,
      '. Biodiversity score: ',
      (SELECT biodiversity_score::VARCHAR FROM regional_biodiversity WHERE region = zone_name),
      '. Unique species: ',
      (SELECT unique_species::VARCHAR FROM regional_biodiversity WHERE region = zone_name),
      '. Total observations: ',
      (SELECT total_observations::VARCHAR FROM regional_biodiversity WHERE region = zone_name),
      '. Key connected species in food web: ',
      (SELECT LISTAGG(DISTINCT source, ', ') WITHIN GROUP (ORDER BY source)
       FROM species_dependencies
       WHERE target IN (SELECT scientific_name FROM threatened_species WHERE place_guess LIKE CONCAT('%', zone_name, '%') LIMIT 5)),
      '. Provide ecological assessment and conservation priority.'
    )
  )
$$;
