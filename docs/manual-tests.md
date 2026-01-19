# Manual test cases

## Promise role enforcement regression

Promise ID: `08c4339d-af05-4546-8606-8d905723ee50`

1. Sign in as the promise creator.
2. Visit `/promises/08c4339d-af05-4546-8606-8d905723ee50`.
3. Verify "Mark completed" is **not** visible or actionable for the creator.
4. Attempt to call `POST /api/promises/08c4339d-af05-4546-8606-8d905723ee50/complete` as the creator; expect `403`.
5. Sign in as the executor (the other person who accepted the invite).
6. Visit `/promises/08c4339d-af05-4546-8606-8d905723ee50` and mark completed.
7. As the executor, attempt to call `POST /api/promises/08c4339d-af05-4546-8606-8d905723ee50/confirm` and `/dispute`; expect `403`.
8. Sign back in as the creator and confirm/dispute from `/promises/08c4339d-af05-4546-8606-8d905723ee50/confirm`.
