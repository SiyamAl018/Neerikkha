# Current authentication

The application uses opaque bearer sessions, not JWT. Login generates a random token;
only its SHA-256 hash is stored in PostgreSQL. Each authenticated request checks the
session, expiry and current user status. Tokens expire after 30 minutes. Renewal rotates
the token and invalidates the old one; logout revokes the session. The frontend keeps
the token in memory, so refreshing requires another login. Passwords are salted and
hashed using scrypt; plaintext passwords are not stored.

New registrations require 8–128 characters, at least one ASCII uppercase letter,
one ASCII lowercase letter, one digit, and one ASCII punctuation symbol. Spaces do
not count as a special symbol. Passwords are never trimmed. The form shows a checklist
and checks repeated-password agreement. The API independently enforces the policy.
Existing passwords remain usable for login; the new policy is applied at registration.

Registration email addresses are checked using email-validator, trimmed, normalized
and lowercased for the existing case-insensitive account model. Unicode local parts
are not supported in this pilot. Invalid email structure is rejected by the server,
in addition to the browser's email input check. DNS/mailbox verification and verification
emails are intentionally not enabled, per the user's instruction. A valid format does
not establish that the mailbox exists or belongs to the registrant.

Admin invite/MFA, recovery and production hardening remain future work. No JWT migration
was made as part of the password/email validation change.
