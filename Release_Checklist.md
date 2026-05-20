# Ethizo Home Health Care Release Checklist

## Code Readiness

- [ ] frontend build passes
- [ ] frontend lint passes
- [ ] backend tests pass
- [ ] local environment starts cleanly
- [ ] no local-only files are staged

## Product Validation

- [ ] patient intake verified
- [ ] referral intake verified
- [ ] referral to episode conversion verified
- [ ] SOC/OASIS flow verified
- [ ] SOC/OASIS speech capture verified
- [ ] clinician scheduling verified
- [ ] field check-in / check-out verified
- [ ] visit documentation and QA lock verified
- [ ] EVV workflow verified
- [ ] billing workflow verified
- [ ] lifecycle actions verified
- [ ] admin and audit workspace verified

## Data and Configuration

- [ ] production or target environment DB config prepared
- [ ] `backend/config/app_local.php` not committed
- [ ] migrations reviewed and ready
- [ ] required environment variables documented
- [ ] attachment/document storage path reviewed

## Repo and Delivery

- [ ] root README updated
- [ ] system test script available
- [ ] release checklist available
- [ ] CI workflow present and valid
- [ ] correct branch pushed to GitHub

## Go-Live Notes

- [ ] known limitations documented
- [ ] browser support expectations shared
- [ ] rollback plan defined
- [ ] primary tester signoff captured
- [ ] release owner signoff captured
