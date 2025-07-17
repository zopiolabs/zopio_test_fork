# SonarLint Integration Guide

SonarLint provides real-time code quality and security analysis in VSCode, complementing our existing Biome setup. This guide helps contributors use SonarLint effectively in the Zopio project.

---

## Quick Start

### 1. Install SonarLint Extension

VSCode will automatically recommend the extension when you open the project. If not:

- Open Extensions (`Cmd+Shift+X`)
- Search for "SonarLint"
- Install `sonarsource.sonarlint-vscode`

### 2. Verify It's Working

- Open any TypeScript file
- Look for underlined code with security or quality issues
- Hover over underlined code to see details

That's it! SonarLint is now analyzing your code in real-time.

---

## How It Works

### Our Quality Stack

| Tool | Purpose | When It Runs |
|------|---------|--------------|
| **Biome** | Code formatting & basic linting | Save, pre-commit, CI |
| **SonarLint** | Security & advanced quality | Real-time in editor |
| **TypeScript** | Type checking | Build time, CI |
| **Vitest** | Test runner with coverage | Local dev, CI |
| **SonarCloud** | Team-wide analysis with coverage | Pull requests |

### What SonarLint Catches

- **Security Vulnerabilities**: SQL injection, XSS, insecure cryptography
- **Bugs**: Null pointer exceptions, resource leaks, logic errors
- **Code Smells**: Complex functions, duplicate code, unclear naming
- **Security Hotspots**: Code that needs security review

---

## Developer Workflow

### Writing Code

1. **Real-time Feedback**: Issues appear as you type
2. **Quick Fixes**: Click the lightbulb icon for automatic fixes
3. **Learn More**: Each issue links to detailed explanations

### Before Committing

1. Check the Problems panel (`Cmd+Shift+M`) for SonarLint issues
2. Fix critical security issues and bugs immediately
3. Consider fixing code smells if time permits
4. Run pre-commit hooks to ensure code quality:

   ```bash
   # Pre-commit hooks will run automatically with:
   git commit -m "your message"
   
   # Or manually run quality checks:
   pnpm lint
   pnpm typecheck
   ```

### Pull Requests

Your PR will be automatically analyzed by SonarCloud, which:

- Posts a quality gate status comment
- Adds inline annotations on problematic code
- Tracks new issues vs existing ones

---

## Common Tasks

### View All Issues

```bash
Cmd+Shift+P → "SonarLint: Show All Issues"
```

### Suppress False Positives

For a single line:

```typescript
// NOSONAR - Explanation why this is safe
const dynamicQuery = `SELECT * FROM ${table}`;
```

For specific rules project-wide, edit `.sonarlint/sonarlint.json`:

```json
{
  "rules": {
    "typescript:S1234": {
      "level": "off"
    }
  }
}
```

### Connect to SonarCloud (Recommended for Team)

For team-synchronized rules and quality gates:

1. **Get your SonarCloud token:**
   - Go to [SonarCloud Security](https://sonarcloud.io/account/security)
   - Generate a new token with a descriptive name (e.g., "VSCode SonarLint")
   - Copy the token (keep it secure!)

2. **Configure SonarLint connection:**
   - `Cmd+Shift+P` → "SonarLint: Configure Connection"
   - Choose "SonarCloud"
   - Enter your token when prompted
   - Select organization: `zopiolabs`
   - Select project: `zopiolabs_zopio_test_fork`

3. **Verify connection:**
   - Check that "SonarLint: Connected Mode" shows in the status bar
   - Open any TypeScript file and confirm rules are synchronized

**Note:** Each team member needs their own SonarCloud token. Never share or commit tokens to the repository.

---

## Configuration

### Project Rules

Custom rules are in `.sonarlint/sonarlint.json`:

- Adjusted complexity thresholds
- Test file exclusions
- Framework-specific globals

### VSCode Settings

SonarLint settings in `.vscode/settings.json`:

- Analyzer logs enabled for debugging
- Specific rules disabled to avoid conflicts with Biome

---

## Troubleshooting

### SonarLint Not Working?

1. Check Output panel → SonarLint
2. Ensure file is in a supported language (JS/TS)
3. Restart VSCode

### Too Many False Positives?

1. Update to latest SonarLint version
2. Report persistent issues to the team
3. Consider rule suppression (see above)

### Performance Issues?

1. Disable verbose logs in settings
2. Exclude large generated files
3. Check Output panel for errors
4. For monorepo issues, ensure proper workspace configuration

### Monorepo-Specific Issues

**SonarLint not analyzing files in packages/:**

- Ensure you're opening the root directory, not individual packages
- Check that files match the inclusion patterns in `.sonarlint/sonarlint.json`

**False positives on generated files:**

- Verify exclusions in `.sonarlint/sonarlint.json` cover all generated directories
- Common exclusions: `packages/database/generated/**`, `**/*.d.ts`

**Rules not synchronized:**

- Confirm SonarCloud connection shows correct project: `zopiolabs_zopio_test_fork`
- Check organization access: `zopiolabs`
- Refresh connection: `Cmd+Shift+P` → "SonarLint: Update All Project Bindings"

---

## Best Practices

### Do

- Fix security vulnerabilities immediately
- Address bugs before merging
- Use SonarLint to learn secure coding patterns
- Report false positives to improve configuration

### Don't

- Ignore security issues without review
- Suppress warnings without understanding them
- Disable SonarLint entirely
- Commit code with unresolved vulnerabilities

---

## Test Coverage

### Running Tests with Coverage

To generate coverage reports for SonarCloud:

```bash
# Run all tests with coverage
pnpm test -- --coverage --run

# Coverage reports are generated at:
# - coverage/lcov.info (for SonarCloud)
# - coverage/index.html (for local viewing)
```

### Coverage Configuration

Test coverage is configured in each app's `vitest.config.mjs`:

- Coverage provider: V8
- Output formats: text, lcov, html
- Reports location: `./coverage` (repository root)
- Excludes: node_modules, dist, config files, test files

### Quality Gates

SonarCloud enforces:

- 80% coverage on new code (when 20+ lines added)
- No new bugs or vulnerabilities
- Maintainability rating A
- Security rating A

---

## Resources

- [SonarLint Rules Reference](https://rules.sonarsource.com/typescript)
- [Security Hotspots Guide](https://docs.sonarcloud.io/digging-deeper/security-hotspots/)
- [Zopio SonarCloud Dashboard](https://sonarcloud.io/project/overview?id=zopiolabs_zopio_test_fork)

---

## Getting Help

- **Configuration Issues**: Check `.sonarlint/sonarlint.json`
- **False Positives**: Discuss in PR or team chat
- **Bug Reports**: Label with `quality` in GitHub Issues
