// A short, stable case number from the promise id ("3F9A2C"): no counter in the database, and the
// same for both sides. Collisions only matter at tens of thousands of cases.
export const caseNumber = (promiseId: string) => promiseId.replace(/-/g, "").slice(0, 6).toUpperCase();
