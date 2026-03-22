# Security Policy

## Reporting a vulnerability

If you find a security issue in Russia.md, do not open a public issue first.

Send a report to `denis.gordeev@proton.me` with the subject prefix `[SECURITY]` and include:

1. A clear description of the issue
2. Reproduction steps or proof of concept
3. Likely impact
4. Suggested mitigation, if you have one

## Response targets

- Initial acknowledgement: within 72 hours
- Triage: within 7 days
- Fix timing: depends on severity and blast radius

## In scope

- Repository configuration and permissions
- GitHub Actions workflows
- Build and deploy pipeline behavior
- Third-party dependency vulnerabilities affecting the site or validation tooling
- Content-driven injection risks in the active site build

## Out of scope

- Pure factual disputes or sourcing disagreements
- Third-party platform vulnerabilities in GitHub or npm themselves
- Denial-of-service testing against hosted infrastructure
- Social engineering reports without a repository-specific exploit path

## Architecture notes

Russia.md is primarily a static Astro site with local build-time tooling. That reduces the attack surface because there is no application database or user account system in this repository.

The main practical risks are:

- Supply-chain compromise in npm dependencies
- Dangerous workflow permission changes
- Content or metadata that causes unsafe output during the build
- Accidental secret exposure in commits or automation

## Responsible disclosure

Please give maintainers a reasonable chance to investigate and patch before public disclosure.
