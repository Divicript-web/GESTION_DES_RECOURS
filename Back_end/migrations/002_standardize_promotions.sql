UPDATE users
SET promotion = CASE
  WHEN upper(trim(coalesce(promotion, ''))) IN ('L1', 'L 1', 'LICENCE1', 'LICENCE 1') THEN 'LICENCE 1'
  WHEN upper(trim(coalesce(promotion, ''))) IN ('L2', 'L 2', 'LICENCE2', 'LICENCE 2') THEN 'LICENCE 2'
  WHEN upper(trim(coalesce(promotion, ''))) IN ('L3', 'L 3', 'LICENCE3', 'LICENCE 3') THEN 'LICENCE 3'
  WHEN upper(trim(coalesce(promotion, ''))) IN ('M1', 'M 1', 'MASTER1', 'MASTER 1') THEN 'MASTER 1'
  WHEN upper(trim(coalesce(promotion, ''))) IN ('M2', 'M 2', 'MASTER2', 'MASTER 2') THEN 'MASTER 2'
  WHEN role = 'etudiant' THEN 'LICENCE 1'
  ELSE NULL
END
WHERE role <> 'enseignant'
  AND (
    role = 'etudiant'
    OR coalesce(trim(promotion), '') <> ''
  );

WITH teacher_exploded AS (
  SELECT
    id,
    CASE
      WHEN upper(trim(value)) IN ('L1', 'L 1', 'LICENCE1', 'LICENCE 1') THEN 'LICENCE 1'
      WHEN upper(trim(value)) IN ('L2', 'L 2', 'LICENCE2', 'LICENCE 2') THEN 'LICENCE 2'
      WHEN upper(trim(value)) IN ('L3', 'L 3', 'LICENCE3', 'LICENCE 3') THEN 'LICENCE 3'
      WHEN upper(trim(value)) IN ('M1', 'M 1', 'MASTER1', 'MASTER 1') THEN 'MASTER 1'
      WHEN upper(trim(value)) IN ('M2', 'M 2', 'MASTER2', 'MASTER 2') THEN 'MASTER 2'
      ELSE NULL
    END AS normalized_promotion
  FROM users
  CROSS JOIN LATERAL unnest(string_to_array(coalesce(promotion, ''), ',')) AS value
  WHERE role = 'enseignant'
),
teacher_normalized AS (
  SELECT
    id,
    string_agg(DISTINCT normalized_promotion, ', ' ORDER BY normalized_promotion) AS promotion
  FROM teacher_exploded
  WHERE normalized_promotion IS NOT NULL
  GROUP BY id
)
UPDATE users
SET promotion = coalesce(teacher_normalized.promotion, 'LICENCE 1')
FROM teacher_normalized
WHERE users.id = teacher_normalized.id;

UPDATE users
SET promotion = 'LICENCE 1'
WHERE role = 'enseignant'
  AND (
    coalesce(trim(promotion), '') = ''
    OR promotion !~ '^(LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2)(, (LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2))*$'
  );

WITH exploded AS (
  SELECT
    id,
    CASE
      WHEN upper(trim(value)) IN ('L1', 'L 1', 'LICENCE1', 'LICENCE 1') THEN 'LICENCE 1'
      WHEN upper(trim(value)) IN ('L2', 'L 2', 'LICENCE2', 'LICENCE 2') THEN 'LICENCE 2'
      WHEN upper(trim(value)) IN ('L3', 'L 3', 'LICENCE3', 'LICENCE 3') THEN 'LICENCE 3'
      WHEN upper(trim(value)) IN ('M1', 'M 1', 'MASTER1', 'MASTER 1') THEN 'MASTER 1'
      WHEN upper(trim(value)) IN ('M2', 'M 2', 'MASTER2', 'MASTER 2') THEN 'MASTER 2'
      ELSE NULL
    END AS normalized_promotion
  FROM courses
  CROSS JOIN LATERAL unnest(string_to_array(coalesce(promotions, ''), ',')) AS value
),
normalized AS (
  SELECT
    id,
    string_agg(DISTINCT normalized_promotion, ', ' ORDER BY normalized_promotion) AS promotions
  FROM exploded
  WHERE normalized_promotion IS NOT NULL
  GROUP BY id
)
UPDATE courses
SET promotions = coalesce(normalized.promotions, 'LICENCE 1')
FROM normalized
WHERE courses.id = normalized.id;

UPDATE courses
SET promotions = 'LICENCE 1'
WHERE coalesce(trim(promotions), '') = ''
   OR promotions !~ '^(LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2)(, (LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2))*$';

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_etudiant_promotion_check;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_promotion_check;

ALTER TABLE users
ADD CONSTRAINT users_promotion_check
CHECK (
  (
    role = 'etudiant'
    AND promotion IN ('LICENCE 1', 'LICENCE 2', 'LICENCE 3', 'MASTER 1', 'MASTER 2')
  )
  OR (
    role = 'enseignant'
    AND promotion ~ '^(LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2)(, (LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2))*$'
  )
  OR role NOT IN ('etudiant', 'enseignant')
);

ALTER TABLE courses
ALTER COLUMN promotions SET NOT NULL;

ALTER TABLE courses
DROP CONSTRAINT IF EXISTS courses_promotions_check;

ALTER TABLE courses
ADD CONSTRAINT courses_promotions_check
CHECK (
  promotions ~ '^(LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2)(, (LICENCE 1|LICENCE 2|LICENCE 3|MASTER 1|MASTER 2))*$'
);
