# Contributing to This Project

Thank you for your interest in contributing! This document outlines the process for contributing to our project.

## Getting Started

1. Fork the repository
2. Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test your changes thoroughly
5. Commit your changes with clear, descriptive commit messages
6. Push to your fork
7. Submit a Pull Request

## Pull Request Guidelines

- Ensure your PR addresses a specific issue or adds value to the project
- Include a clear description of the changes
- Keep changes focused and atomic
- Follow existing code style and conventions
- Include tests if applicable
- Update documentation as needed
- Ensure your PR follows the [project's philosophy](https://docs.zopio.dev/philosophy/)

## Code Style

- Follow the existing code formatting in the project (ensure you have Biome installed)
- Write clear, self-documenting code
- Add comments only when necessary to explain complex logic
- Use meaningful variable and function names

## Code Quality

We use multiple tools to ensure code quality:

### Biome (Primary Formatter/Linter)

- Handles code formatting and basic linting
- Runs automatically on pre-commit via Husky
- Run manually: `pnpm format` and `pnpm lint`

### SonarLint (Security & Quality Analysis)

- Provides real-time feedback in VSCode for:
  - Security vulnerabilities
  - Bug detection
  - Code smells
  - Complexity issues
- Install the extension: `sonarsource.sonarlint-vscode`
- See [SonarLint Integration Guide](../docs/dev/quality/sonarlint.md) for details

### Pre-commit Checks

- Biome formatting and linting via `lint-staged`
- SPDX license header verification
- Commit message format validation (conventional commits)

### CI/CD Quality Gates

- All PRs must pass:
  - Biome formatting checks
  - TypeScript compilation
  - Unit tests
  - SonarCloud analysis (security, bugs, code smells)

## Reporting Issues

- Use the GitHub issue tracker
- Check if the issue already exists before creating a new one
- Provide a clear description of the issue
- Include steps to reproduce if applicable
- Add relevant labels

## Questions or Need Help?

Feel free to open an issue for questions or join our discussions. We're here to help!

## Code of Conduct

Please note that this project follows a Code of Conduct. By participating, you are expected to uphold this code.

Thank you for contributing!
