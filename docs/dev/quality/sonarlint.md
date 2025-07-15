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
| **SonarCloud** | Team-wide analysis | Pull requests |

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
2. Fix critical security issues and bugs
3. Consider fixing code smells if time permits

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

### Connect to SonarCloud (Optional)

For team-synchronized rules:

1. `Cmd+Shift+P` → "SonarLint: Configure Connection"
2. Choose "SonarCloud"
3. Enter your token from [SonarCloud Security](https://sonarcloud.io/account/security)
4. Select organization: `zopio`
5. Select project: `zopio_zopio`

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

## Resources

- [SonarLint Rules Reference](https://rules.sonarsource.com/typescript)
- [Security Hotspots Guide](https://docs.sonarcloud.io/digging-deeper/security-hotspots/)
- [Zopio SonarCloud Dashboard](https://sonarcloud.io/project/overview?id=zopio_zopio)

---

## Getting Help

- **Configuration Issues**: Check `.sonarlint/sonarlint.json`
- **False Positives**: Discuss in PR or team chat
- **Bug Reports**: Label with `quality` in GitHub Issues
