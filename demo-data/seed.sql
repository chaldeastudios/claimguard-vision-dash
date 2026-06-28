-- =============================================================================
-- ClaimGuard × openIMIS — Kenyan Demo Data Seeds
-- =============================================================================
-- This script populates the openIMIS PostgreSQL database with realistic
-- Kenyan demo data for development and demonstration purposes.
--
-- Contents:
--   • 5 healthcare facilities (Kenyan hospitals)
--   • 12 insurees with Kenyan names
--   • 15 claims with KES amounts, ICD-10 diagnosis codes, various statuses
--   • 8 fraud score records with varying risk levels
--
-- Usage:
--   docker exec -i openimis-db psql -U postgres -d openimis < demo-data/seed.sql
--
-- Notes:
--   - Uses gen_random_uuid() for UUID generation (PostgreSQL 13+)
--   - All monetary amounts are in Kenyan Shillings (KES)
--   - ICD-10 codes: A09 (gastroenteritis), J06 (upper respiratory infection),
--     B54 (malaria), I10 (hypertension), E11 (type 2 diabetes), K35 (appendicitis),
--     J18 (pneumonia), O80 (single spontaneous delivery), S72 (femur fracture),
--     N39 (urinary tract infection)
-- =============================================================================

-- Ensure the pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. HEALTHCARE FACILITIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS tblHF (
    HfID          SERIAL PRIMARY KEY,
    HfUUID        UUID NOT NULL DEFAULT gen_random_uuid(),
    HfCode        VARCHAR(8) NOT NULL UNIQUE,
    HfName        VARCHAR(100) NOT NULL,
    HfLevel       VARCHAR(1) NOT NULL DEFAULT 'H',   -- H=Hospital, D=Dispensary, C=Centre
    HfAddress     VARCHAR(200),
    HfLocationID  INT,
    HfPhone       VARCHAR(50),
    ValidityFrom  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ValidityTo    TIMESTAMPTZ,
    LegalForm     VARCHAR(1) DEFAULT 'G',             -- G=Government, P=Private, M=Mission
    HfCareType    VARCHAR(1) DEFAULT 'B'              -- B=Both, I=In-patient, O=Out-patient
);

INSERT INTO tblHF (HfCode, HfName, HfLevel, HfAddress, HfPhone, LegalForm, HfCareType) VALUES
('KNH001', 'Kenyatta National Hospital',          'H', 'Hospital Rd, Nairobi',          '+254 20 2726300', 'G', 'B'),
('AKU002', 'Aga Khan University Hospital',         'H', '3rd Parklands Ave, Nairobi',    '+254 20 3662000', 'P', 'B'),
('NKR003', 'Nakuru Level 5 Hospital',              'H', 'Hospital Rd, Nakuru',           '+254 51 2211691', 'G', 'B'),
('MTR004', 'Moi Teaching and Referral Hospital',   'H', 'Nandi Rd, Eldoret',             '+254 53 2033471', 'G', 'B'),
('NBH005', 'Nairobi Hospital',                     'H', 'Argwings Kodhek Rd, Nairobi',   '+254 20 2845000', 'P', 'B');


-- =============================================================================
-- 2. INSUREES
-- =============================================================================
CREATE TABLE IF NOT EXISTS tblInsuree (
    InsureeID     SERIAL PRIMARY KEY,
    InsureeUUID   UUID NOT NULL DEFAULT gen_random_uuid(),
    CHFID         VARCHAR(12) NOT NULL UNIQUE,      -- Insurance number
    LastName      VARCHAR(100) NOT NULL,
    OtherNames    VARCHAR(100) NOT NULL,
    DOB           DATE NOT NULL,
    Gender        VARCHAR(1) NOT NULL DEFAULT 'M',  -- M=Male, F=Female
    Phone         VARCHAR(50),
    Email         VARCHAR(100),
    CurrentVillage VARCHAR(100),
    ValidityFrom  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ValidityTo    TIMESTAMPTZ
);

INSERT INTO tblInsuree (CHFID, LastName, OtherNames, DOB, Gender, Phone, CurrentVillage) VALUES
('KE070010001', 'Kamau',    'Wanjiku',    '1985-03-14', 'F', '+254 712 345678', 'Kiambu'),
('KE070010002', 'Otieno',   'Omondi',     '1990-07-22', 'M', '+254 723 456789', 'Kisumu'),
('KE070010003', 'Hassan',   'Amina',      '1978-11-05', 'F', '+254 734 567890', 'Mombasa'),
('KE070010004', 'Mwangi',   'James',      '1995-01-30', 'M', '+254 745 678901', 'Nyeri'),
('KE070010005', 'Njoroge',  'Grace',      '1988-06-18', 'F', '+254 756 789012', 'Nairobi'),
('KE070010006', 'Ochieng',  'Kevin',      '1992-09-10', 'M', '+254 767 890123', 'Siaya'),
('KE070010007', 'Wambui',   'Mary',       '1983-12-25', 'F', '+254 778 901234', 'Murang''a'),
('KE070010008', 'Kipchoge', 'Eliud',      '1980-04-02', 'M', '+254 789 012345', 'Nandi'),
('KE070010009', 'Nyambura', 'Faith',      '1997-08-15', 'F', '+254 790 123456', 'Thika'),
('KE070010010', 'Mutua',    'Daniel',     '1975-02-28', 'M', '+254 701 234567', 'Machakos'),
('KE070010011', 'Achieng',  'Linet',      '1993-05-20', 'F', '+254 712 098765', 'Homabay'),
('KE070010012', 'Barasa',   'Brian',      '2000-10-12', 'M', '+254 723 109876', 'Bungoma');


-- =============================================================================
-- 3. CLAIMS
-- =============================================================================
-- Status codes: 1=Entered, 2=Checked, 4=Processed, 8=Valuated, 16=Rejected
CREATE TABLE IF NOT EXISTS tblClaim (
    ClaimID       SERIAL PRIMARY KEY,
    ClaimUUID     UUID NOT NULL DEFAULT gen_random_uuid(),
    ClaimCode     VARCHAR(8) NOT NULL UNIQUE,
    InsureeID     INT NOT NULL REFERENCES tblInsuree(InsureeID),
    HfID          INT NOT NULL REFERENCES tblHF(HfID),
    ICDID         VARCHAR(10) NOT NULL,              -- ICD-10 diagnosis code
    ICDName       VARCHAR(255),                      -- Diagnosis description
    DateFrom      DATE NOT NULL,
    DateTo        DATE,
    DateClaimed   DATE NOT NULL,
    ClaimStatus   INT NOT NULL DEFAULT 1,
    Claimed       DECIMAL(18,2) NOT NULL,            -- Amount claimed (KES)
    Approved      DECIMAL(18,2),                     -- Amount approved (KES)
    Explanation   TEXT,
    ValidityFrom  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ValidityTo    TIMESTAMPTZ
);

INSERT INTO tblClaim (ClaimCode, InsureeID, HfID, ICDID, ICDName, DateFrom, DateTo, DateClaimed, ClaimStatus, Claimed, Approved, Explanation) VALUES
-- Normal processed claims
('CLM00001', 1,  1, 'J06',  'Acute upper respiratory infection',  '2025-06-01', '2025-06-01', '2025-06-02', 4,  4500.00,   4500.00,  'Outpatient visit for flu-like symptoms'),
('CLM00002', 2,  3, 'B54',  'Unspecified malaria',                '2025-06-03', '2025-06-05', '2025-06-06', 4,  12800.00,  12000.00, 'Inpatient treatment for malaria'),
('CLM00003', 3,  2, 'I10',  'Essential (primary) hypertension',   '2025-06-05', '2025-06-05', '2025-06-06', 4,  8200.00,   8200.00,  'Routine hypertension management'),
('CLM00004', 4,  4, 'A09',  'Infectious gastroenteritis and colitis', '2025-06-07', '2025-06-08', '2025-06-09', 4,  6700.00, 6500.00, 'Gastroenteritis with dehydration'),
('CLM00005', 5,  1, 'E11',  'Type 2 diabetes mellitus',           '2025-06-10', '2025-06-10', '2025-06-11', 8,  5300.00,   5300.00,  'Monthly diabetes checkup and insulin'),

-- Checked / in-process claims
('CLM00006', 6,  5, 'K35',  'Acute appendicitis',                 '2025-06-12', '2025-06-15', '2025-06-16', 2,  85000.00,  NULL,     'Emergency appendectomy'),
('CLM00007', 7,  1, 'J18',  'Pneumonia, unspecified organism',     '2025-06-14', '2025-06-18', '2025-06-19', 2,  32000.00,  NULL,     'Severe pneumonia requiring ICU'),

-- Recently entered claims
('CLM00008', 8,  4, 'O80',  'Single spontaneous delivery',        '2025-06-16', '2025-06-18', '2025-06-19', 1,  45000.00,  NULL,     'Normal delivery at maternity ward'),
('CLM00009', 9,  2, 'S72',  'Fracture of femur',                  '2025-06-18', '2025-06-25', '2025-06-26', 1,  120000.00, NULL,     'Open reduction internal fixation of femur'),
('CLM00010', 10, 3, 'N39',  'Urinary tract infection',            '2025-06-20', '2025-06-20', '2025-06-21', 4,  3800.00,   3500.00,  'Outpatient UTI treatment'),

-- Rejected claims
('CLM00011', 11, 5, 'J06',  'Acute upper respiratory infection',  '2025-06-22', '2025-06-22', '2025-06-23', 16, 350000.00, 0.00,     'Claimed amount grossly exceeds treatment norms'),
('CLM00012', 12, 1, 'B54',  'Unspecified malaria',                '2025-06-22', '2025-06-22', '2025-06-23', 16, 95000.00,  0.00,     'Duplicate claim — already reimbursed under CLM00002'),

-- High-value legitimate claims
('CLM00013', 1,  2, 'S72',  'Fracture of femur',                  '2025-06-24', '2025-07-01', '2025-07-02', 4,  185000.00, 175000.00, 'Complex femur surgery with titanium implant'),
('CLM00014', 3,  4, 'J18',  'Pneumonia, unspecified organism',     '2025-06-25', '2025-06-28', '2025-06-29', 4,  28000.00,  27500.00, 'Moderate pneumonia — 3-day admission'),
('CLM00015', 5,  3, 'E11',  'Type 2 diabetes mellitus',           '2025-06-26', '2025-06-26', '2025-06-27', 1,  6200.00,   NULL,     'Diabetic foot examination and labs');


-- =============================================================================
-- 4. FRAUD SCORES
-- =============================================================================
-- Risk levels: low (0.0–0.3), medium (0.3–0.6), high (0.6–0.8), critical (0.8–1.0)
CREATE TABLE IF NOT EXISTS claim_fraud_score (
    id            SERIAL PRIMARY KEY,
    score_uuid    UUID NOT NULL DEFAULT gen_random_uuid(),
    claim_id      INT NOT NULL REFERENCES tblClaim(ClaimID),
    fraud_score   DECIMAL(5,4) NOT NULL CHECK (fraud_score >= 0 AND fraud_score <= 1),
    risk_level    VARCHAR(10) NOT NULL,
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    flags         TEXT[],                             -- Array of triggered fraud indicators
    explanation   TEXT,
    scored_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO claim_fraud_score (claim_id, fraud_score, risk_level, model_version, flags, explanation) VALUES
-- Low-risk (legitimate claims)
(1,  0.0800, 'low',      'v1.0', ARRAY['none'],                                          'Standard outpatient visit — no anomalies detected'),
(3,  0.1200, 'low',      'v1.0', ARRAY['none'],                                          'Routine hypertension management within expected norms'),
(5,  0.1500, 'low',      'v1.0', ARRAY['none'],                                          'Regular diabetes follow-up — consistent with history'),

-- Medium-risk
(2,  0.4200, 'medium',   'v1.0', ARRAY['high_los', 'weekend_admission'],                 'Length of stay slightly above average for malaria treatment'),
(7,  0.5500, 'medium',   'v1.0', ARRAY['high_cost', 'icu_upgrade'],                      'ICU admission for pneumonia — review recommended'),

-- High-risk
(6,  0.7200, 'high',     'v1.0', ARRAY['cost_outlier', 'emergency_upcoding'],            'Appendectomy cost significantly above regional average'),
(9,  0.7800, 'high',     'v1.0', ARRAY['cost_outlier', 'phantom_services'],              'Femur surgery claim includes services not matching facility capabilities'),

-- Critical (likely fraudulent)
(11, 0.9500, 'critical', 'v1.0', ARRAY['cost_outlier', 'upcoding', 'phantom_services'],  'Claimed KES 350,000 for routine upper respiratory infection — extreme anomaly');


-- =============================================================================
-- DONE — Verify row counts
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== ClaimGuard Demo Data Loaded ===';
    RAISE NOTICE 'Facilities: %', (SELECT COUNT(*) FROM tblHF);
    RAISE NOTICE 'Insurees:   %', (SELECT COUNT(*) FROM tblInsuree);
    RAISE NOTICE 'Claims:     %', (SELECT COUNT(*) FROM tblClaim);
    RAISE NOTICE 'Fraud scores: %', (SELECT COUNT(*) FROM claim_fraud_score);
END $$;
