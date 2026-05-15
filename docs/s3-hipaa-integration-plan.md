# S3 HIPAA Integration Plan

> **Status:** Pending — S3 is not yet implemented in TeleCare.
> **Delete this file** once S3 has been fully integrated and all items below are complete.
>
> Files are currently stored in the PostgreSQL database (`File.data Bytes`). The encryption and integrity controls for DB-backed files are covered in [`hipaa-plan.md`](./hipaa-plan.md) Phase 1.3. When S3 is adopted, the tasks below must be completed **before** PHI is stored in S3 in any environment.

---

## 1. Encryption — do not rely on SSE-S3 alone

SSE-S3 is AWS-managed encryption. It does not satisfy the HIPAA requirement for **key control** because AWS holds the keys.

**Required approach:** Client-side encryption before upload (same AES-256-GCM envelope scheme already used for DB-backed files).

Changes needed in `backend/src/modules/files/files.service.ts`:
- Encrypt the buffer with `encryptField()` from `backend/src/utils/crypto.ts` **before** passing it to the S3 SDK.
- Store `iv`, `tag`, `keyId` alongside the S3 object (in S3 object metadata or a DB record pointing to the S3 key).
- On download: fetch from S3 → decrypt with `decryptField()` → stream to client.

**Never** enable public-read ACLs on the PHI bucket. Bucket policy must deny any principal except the backend service role.

---

## 2. Bucket configuration checklist

| Setting | Required value |
|---|---|
| Block all public access | ✅ enabled |
| Server-side encryption (SSE-KMS) | ✅ enabled as defence-in-depth (app-layer crypto is primary) |
| Versioning | ✅ enabled (supports audit and point-in-time recovery) |
| Object Lock / MFA delete | Consider for audit logs bucket |
| Bucket logging | ✅ enabled → log to a separate audit bucket |
| Lifecycle policy | Define retention per HIPAA (6 years minimum for medical records) |
| Replication | Optional — cross-region for disaster recovery |
| HTTPS-only bucket policy | ✅ `aws:SecureTransport: false → Deny` |

---

## 3. Encrypted backups to S3

The current backup plan (`hipaa-plan.md` Phase 3.5) targets a local path. When S3 is available:

Update `backup.sh`:
```bash
# After pg_dump + app-layer encryption:
aws s3 cp "$ENCRYPTED_DUMP" "s3://${BACKUP_BUCKET}/db-backups/$(date +%Y/%m/%d)/dump-$(date +%H%M%S).enc" \
  --sse aws:kms --sse-kms-key-id "$KMS_KEY_ID"
```

Add env vars to `.env.example`:
```
BACKUP_BUCKET=
AWS_REGION=
KMS_KEY_ID=        # For SSE-KMS on backup bucket
```

---

## 4. BAA with AWS

Before storing any PHI in S3 (or any AWS service):

- Sign a **Business Associate Agreement (BAA)** with AWS. AWS Health provides a standard BAA that covers S3, EC2, RDS, KMS, and other services under the AWS HIPAA Eligible Services list.
- Verify S3 is on the current [AWS HIPAA Eligible Services list](https://aws.amazon.com/compliance/hipaa-eligible-services-reference/) at time of implementation.

---

## 5. Audit logging updates

Once files move from DB to S3, update the audit middleware:

- `AccessLog` entries for file actions must capture the S3 object key (not the DB row ID).
- Add `resourceLocation: 's3'` to the `metadata` JSON field so auditors can distinguish DB vs. S3 PHI access.
- Ensure S3 bucket access logs (CloudTrail / S3 server-access logging) are enabled and retained for 6 years.

---

## 6. Migration from DB to S3

When migrating existing `File.data Bytes` records:

1. Write a one-off migration script `backend/scripts/migrate-files-to-s3.ts`.
2. For each `File` row:
   - Decrypt the DB blob (if already encrypted via Phase 1.3).
   - Re-encrypt with the same key (or a new S3-specific DEK).
   - Upload to S3 with correct metadata (`iv`, `tag`, `keyId`).
   - Store the returned S3 key in a new `File.s3Key String?` column.
   - Null out `File.data` after verifying the S3 object is accessible.
3. Run in batches; make idempotent (skip rows where `s3Key` is already set).
4. Keep DB blobs until 100% of rows are migrated and verified.
5. Drop `File.data` column in a follow-up migration once all rows are confirmed migrated.

---

## 7. Env vars to add

```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_PHI_BUCKET=          # Bucket for file uploads (PHI)
S3_BACKUP_BUCKET=       # Separate bucket for encrypted DB backups
KMS_KEY_ID=             # KMS key ARN for SSE-KMS
```

Add all of the above to `backend/.env.example` with placeholder values.

---

## 8. Verification checklist

- [ ] No object in the PHI bucket is publicly readable.
- [ ] Download a file via API → confirm correct decrypted content arrives.
- [ ] Inspect the S3 object directly (AWS console) → confirm it is ciphertext.
- [ ] AccessLog row created for every S3 file access.
- [ ] Backup restore drill succeeds from an S3-sourced backup.
- [ ] BAA with AWS is signed and on file.
