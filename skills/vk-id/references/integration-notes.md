# VK ID Integration Notes

- Keep auth and KYC as separate concepts.
- Request only the scopes needed for login, signup, or account linking.
- Preserve a clean fallback path if a user declines optional scopes.
- Use explicit confirmation before merging identities into an existing account.
