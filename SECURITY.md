# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the INHERIT standard or its tooling, please report it responsibly.

**Do NOT open a public issue.** Instead, email **security@openinherit.org** with:

- A description of the vulnerability
- Steps to reproduce
- The potential impact
- Any suggested fix (if you have one)

## Response Time

We aim to acknowledge reports within **48 hours** and provide an initial assessment within **5 working days**.

## Scope

This policy covers:
- The INHERIT JSON Schema files
- The OpenAPI specification
- The test suite and validation tooling
- The SDK generation pipeline
- CI/CD configurations

Schema design issues that could lead to data exposure (e.g. a schema that inadvertently requires sensitive data in a field that should be optional) are in scope.

## Encrypted Reporting

If your report contains sensitive details, you may request our PGP public key by emailing security@openinherit.org with the subject line "PGP key request". We will respond with the key within one working day.

## Disclosure

We follow coordinated disclosure. We will work with you to understand and address the issue before any public disclosure.

We aim to release fixes within **90 days** of a confirmed vulnerability. If you believe a longer or shorter timeline is appropriate, we are happy to discuss.

## Recognition

We gratefully acknowledge security researchers who report vulnerabilities responsibly. With your permission, we will credit you in the relevant release notes.
