# zopio

## From idea to enterprise: Full-Stack business framework designed to build scalable apps

[![npm downloads](https://img.shields.io/npm/dy/zopio)](https://www.npmjs.com/package/zopio)
[![npm version](https://img.shields.io/npm/v/zopio)](https://www.npmjs.com/package/zopio)
[![GitHub license](https://img.shields.io/github/license/zopiolabs/zopio)](https://github.com/zopiolabs/zopio/blob/main/LICENSE)
[![Tech Stack](https://img.shields.io/badge/tech-stack-0690fa.svg?style=flat)](https://stackshare.io/zopiolabs/zopio)
[![Security](https://github.com/zopiolabs/zopio/actions/workflows/security.yml/badge.svg)](https://github.com/zopiolabs/zopio/actions/workflows/security.yml)
[![Build](https://github.com/zopiolabs/zopio/actions/workflows/build.yml/badge.svg)](https://github.com/zopiolabs/zopio/actions/workflows/build.yml)
[![Release](https://github.com/zopiolabs/zopio/actions/workflows/release.yml/badge.svg)](https://github.com/zopiolabs/zopio/actions/workflows/release.yml)
[![SonarCloud](https://sonarcloud.io/api/project_badges/measure?project=zopio_zopio&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=zopio_zopio)

## Overview

[zopio](https://github.com/zopiolabs/zopio) is a modern full-stack business framework designed to build scalable business apps with Auto UI and plugin extensibility – built on a developer-first [Next.js](https://nextjs.org/) base. It is designed to be a comprehensive starting point for new apps, providing a solid, opinionated foundation with a minimal amount of configuration.

## Getting Started

Clone the repo using:

```sh
npx zopio@latest init 
```

> 🚀 **Ready to build something amazing?**  
> 👉 [Start with the docs](https://docs.zopio.dev)

## 📐 Architecture Overview

_The Zopio monorepo is organized into five main workspaces:_

- **apps/** – Production apps and user-facing frontends
- **devapps/** – Internal tools for developers
- **packages/** – Shared logic, UI, and system modules
- **registry/** – Plugin & integration catalog with validation
- **websites/** – Public-facing documentation and marketing sites

---

### 🧱 Applications (`apps/`)

_Customer-facing and core service apps built on the Zopio framework._

| App        | Description                                  | Status       |
|------------|----------------------------------------------|--------------|
| 🧑‍💼 `app`       | Main SaaS dashboard for customers           | ✅ |
| ⚙️ `api`       | Backend API (authentication, business logic) | ✅ |
| 📘 `docs`      | Mintlify-based product documentation         | ✅ |
| 🌐 `web`       | CMS-powered frontend or renderer             | ✅ |
| 🧩 `hub`       | Module marketplace frontend                  | 🛣 Roadmap |
| 🛠 `admin`     | Admin panel for agencies & operators         | 🛣 Roadmap |
| 🧭 `onboarding` | Tenant onboarding wizard with Auto UI             | 🛣 Roadmap |
| 🏢 `portal`     | B2B client portal with private content and roles  | 🛣 Roadmap |
| 📊 `status`     | System & API status dashboard (uptime, latency)   | 🛣 Roadmap |

---

### 🛠 Developer Tools (`devapps/`)

_Development and infrastructure support tools, mostly used by internal teams._

| Tool             | Description                                  | Status       |
|------------------|----------------------------------------------|--------------|
| 🧰 `cli`          | CLI utility for scaffolding plugins/apps     | ✅ |
| 🗂 `dbstudio`      | Visual DB explorer (Prisma Studio wrapper)   | ✅ |
| ✉️ `emailstudio`  | Resend-compatible email previewer            | ✅ |
| 🎨 `storybook`     | UI component viewer & design system explorer| ✅ |
| 🧪 `uistudio`      | AI-powered Auto UI / page builder            | 🛣 Roadmap |
| 🧩 `devpanel`      | System & runtime management panel            | 🛣 Roadmap |

---

### 📦 Shared Packages (`packages/`)

_Modular and reusable building blocks powering all Zopio apps._

| Domain           | Modules (Sample) |
|------------------|------------------|
| 🔐 **Auth**        | `auth`, `auth-rbac`, `auth-hooks`, `auth-log`, `auth-abac`, `auth-runner` |
| 🧠 **Logic & DX**  | `crud`, `cms`, `mcp`, `feature-flags`, `rate-limit`, `webhooks` |
| 🗃 **Infra**       | `database`, `data`, `next-config`, `security`, `storage` |
| 🔭 **Observability** | `analytics`, `notifications`, `observability` |
| 🎨 **UI & Design** | `design-system`, `email`, `view`, `view-builder` |
| 🤖 **Workflow**    | `ai`, `trigger`, `trigger-rules` |
| 🌍 **Support**     | `internationalization`, `seo`, `typescript-config`, `testing` |

---

### 🧩 Module Registry (`registry/`)

_All modules listed in the `hub` marketplace are defined here._

| Folder           | Description |
|------------------|-------------|
| 📦 `plugins/`        | UI plugins and extensions |
| 🔌 `integrations/`   | External integrations (e.g. Clerk, Stripe, Supabase) |
| 🧱 `apps/`            | Embedded micro frontends (e.g. CMS panel, CRM) |
| 🧰 `tools/`           | CLI helpers (e.g. `create-plugin`, formatters) |
| 📑 `schemas/`         | JSON schema definitions for validation |
| 🧪 `ci/`              | Validation scripts and registry tests |
| 🧬 `types/`           | Shared types for metadata (e.g. PluginManifest) |
| 📚 `examples/`        | Usage examples and stubs |
| 📂 `templates/`       | Scaffolding templates used by CLI |

_Each module must include a `zopio.module.json` manifest file describing its type, entry point, metadata, and optional schema definition._

---

### 🌍 Public Websites (`websites/`)

| Folder            | Description |
|-------------------|-------------|
| 📘 `zopio-docs/`     | Developer and API documentation |
| ✨ `zopio-splash/`   | Public landing / marketing site |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](.github/CONTRIBUTING.md) for:

- Code style and quality standards
- Pre-commit hooks and CI checks
- Security analysis with SonarLint
- PR submission guidelines

## ❤️ Join Zopio Community

We're building Zopio together with developers like you.

- ⭐️ Star us on GitHub to show your support
- 💬 [Join the discussion](https://github.com/zopiolabs/zopio/discussions)

Let's shape the future of business frameworks, together!

## DX & Automation Toolkit

### 🧩 Repository Automation & Contribution Setup

_This repo includes automated quality checks and contribution tooling:_

| Folder       | Purpose                                                                 |
|--------------|-------------------------------------------------------------------------|
| `.github/`   | GitHub templates, policies, and workflow automation                     |
| `.husky/`    | Local Git hooks (e.g. linting, tests before commits)                    |
| `.vscode/`   | VS Code workspace config for consistent developer environment (DX/onboarding)      |
| `.sonarlint/`| SonarLint project-specific rules and configuration                      |
| `e2e/`       | End-to-end tests for critical user journeys (e.g. Playwright, Cypress)      |

_These ensure a consistent developer experience and enforce contribution standards across all packages and apps._

### 🛡️ Code Quality & Security

Zopio uses a comprehensive quality stack to ensure secure, maintainable code:

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Biome** | Code formatting & linting | Pre-commit, CI |
| **SonarLint** | Real-time security analysis | VSCode |
| **SonarCloud** | PR quality gates | GitHub Actions |
| **TypeScript** | Type safety | Build time |

See [Code Quality Guide](docs/dev/quality/sonarlint.md) for setup instructions.
