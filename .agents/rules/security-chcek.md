---
trigger: always_on
---

Always follow strict security best practices throughout this project.

Never expose, hard-code, commit, or push API keys, secrets, credentials, private keys, service-role keys, database passwords, authentication secrets, tokens, or sensitive user data to a public GitHub repository.

Keep all server-side secrets and sensitive credentials on the server/backend side. Use environment variables or the appropriate secure secret-management mechanism where required. Never place a secret in client-side code or any value that will be bundled and exposed to the browser.

Before ANY `git add`, commit, or push operation:
1. Verify the `.gitignore` rules.
2. Inspect the files that will be staged.
3. Check for hard-coded secrets, credentials, tokens, private keys, database credentials, and sensitive user data.
4. Confirm that only files safe for the public GitHub repository are being staged.
5. Explicitly report any potentially sensitive file or value you find.

If you are unsure whether a file, value, credential, environment variable, or piece of code is safe to expose publicly, STOP and ask for my confirmation before staging, committing, or pushing it.

Do not assume that something is safe simply because it is stored in an environment variable or because it has a public-looking name. Consider whether the value will be exposed to the browser or bundled into the client-side application.

Apply this rule every time you modify the project and especially before every public GitHub push.