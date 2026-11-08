\set ON_ERROR_STOP on
BEGIN;
INSERT INTO users(id,email,display_name,password_hash)
VALUES ('00000000-0000-0000-0000-000000000001','synthetic@example.invalid','Synthetic','test-only');
INSERT INTO cases(id,owner_id,reference,mouza,survey_type)
VALUES ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Synthetic','Example','RS');
DO $$
BEGIN
    IF (SELECT role FROM users WHERE id='00000000-0000-0000-0000-000000000001') <> 'buyer' THEN
        RAISE EXCEPTION 'Default role must be buyer';
    END IF;
    BEGIN
        INSERT INTO users(email,display_name,password_hash) VALUES ('SYNTHETIC@example.invalid','Duplicate','test-only');
        RAISE EXCEPTION 'Duplicate email accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO documents(case_id,document_type,object_key,sha256,byte_size)
        VALUES ('00000000-0000-0000-0000-000000000002','unknown','test',repeat('a',64),1);
        RAISE EXCEPTION 'Invalid document type accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
END $$;
ROLLBACK;
SELECT 'PASS: schema constraints and rollback' AS result;
