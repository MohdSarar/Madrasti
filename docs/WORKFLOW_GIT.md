# Git workflow (recommended)

## Branching
- `main`: always deployable, protected branch
- `feat/*`: feature branches (short-lived)
- `fix/*`: bugfix branches
- `chore/*`: infra/docs/tooling updates

## Commits
Use Conventional Commits:
- `feat(auth): add totp 2fa`
- `fix(auth): correct refresh rotation`
- `chore(ci): add node cache`

## Tags / versions
- Start with `v0.1.0` for Step 1 release.
- Tag every release that is deployed.

## PR rules
- CI must be green
- 1 review minimum
- Squash merge (keeps history clean)

## Typical dev loop
```bash
git checkout -b feat/auth-login
# work...
git add .
git commit -m "feat(auth): implement login endpoint"
git push -u origin feat/auth-login
# open PR -> squash merge
```
