# UNRELEASED
- [FIXED] Corrected `eslint` to be `devDependencies` instead of `dependencies`.

# 0.16.0 (2017-10-31)
- [UPGRADED] Use latest version of request@2.x.x.

# 0.15.0 (2017-10-30)
- [FIXED] Check `request` is defined before using in feed timeout handler.
- [FIXED] Update list of possible feed query parameters.

# 0.14.0 (2017-09-29)
- [NEW] Correctly construct feed URL for `feed.view`.

# 0.13.0 (2017-05-16)
- [FIXED] Retry changes feed if server sends `last_seq`.
