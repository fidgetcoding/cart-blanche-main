# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (`main`) | Yes |

## Reporting a Vulnerability

If you find a security problem in Cart Blanche, please report it privately:

1. **Don't open a public GitHub issue.**
2. Email **nate@lorecraft.io**, or use GitHub's private reporting: the repo's **Security** tab → **Report a vulnerability**, also at <https://github.com/fidgetcoding/cart-blanche-main/security/advisories/new>. Either way, only the maintainer sees it.
3. Include what you found, how to reproduce it, and what it could affect.
4. You'll hear back within 48 hours.

## What's worth reporting

Anything that lets someone read or change a store's data without being its merchant, get into an account that isn't theirs, or get around the rate limits on discount checks, signups and photo uploads. The database rules and functions in `supabase/` count too.
