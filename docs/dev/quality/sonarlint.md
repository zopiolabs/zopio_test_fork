# SonarLint for VS Code Integration Guide

## Overview

SonarLint is a powerful IDE extension that provides real-time code quality and security analysis directly in Visual Studio Code. This guide will walk you through setting up and using SonarLint effectively in the Zopio project.

## Why SonarLint?

- **Real-time Feedback**: Catch code quality issues as you type
- **Security Analysis**: Identify potential security vulnerabilities immediately
- **Code Smell Detection**: Find maintainability issues before they become technical debt
- **Bug Prevention**: Detect common coding mistakes and potential runtime errors
- **Consistent Standards**: Enforce team-wide code quality standards automatically

## Installation

### For VS Code

#### Step 1: Install SonarLint Extension

1. Open VS Code
2. Go to Extensions (⌘⇧X on Mac, Ctrl+Shift+X on Windows/Linux)
3. Search for "SonarLint"
4. Install the official "SonarLint" extension by SonarSource (`sonarsource.sonarlint-vscode`)
5. Reload VS Code when prompted

#### Step 2: Verify Installation

After installation, you should see:
- A SonarLint icon in the Activity Bar (left sidebar)
- "SonarLint" in the status bar at the bottom
- New code analysis results appearing in the Problems panel

### For Cursor

Cursor is built on VS Code and supports the same extensions:

#### Step 1: Install SonarLint Extension

1. Open Cursor
2. Go to Extensions (⌘⇧X on Mac, Ctrl+Shift+X on Windows/Linux)
3. Search for "SonarLint"
4. Install the official "SonarLint" extension by SonarSource
5. Restart Cursor when prompted

#### Step 2: Cursor-Specific Configuration

1. **Enable Extension**: Cursor may disable some extensions by default
   - Go to Settings → Extensions
   - Ensure SonarLint is enabled
   
2. **AI Integration**: Cursor's AI can help fix SonarLint issues
   - When SonarLint highlights an issue, use Cursor's AI to suggest fixes
   - Type: "Fix this SonarLint issue: [issue description]"

#### Step 3: Verify Installation

- Check the Problems panel for SonarLint analysis
- Look for the SonarLint status in the bottom status bar
- Test by creating an intentional issue (e.g., unused variable)

### For Windsurf

Windsurf (by Codeium) also supports VS Code extensions:

#### Step 1: Install SonarLint Extension

1. Open Windsurf
2. Access the Extensions marketplace:
   - Click the Extensions icon in the Activity Bar, or
   - Use Command Palette (⌘⇧P) → "Extensions: Install Extensions"
3. Search for "SonarLint"
4. Install the official SonarLint extension
5. Restart Windsurf if prompted

#### Step 2: Windsurf-Specific Setup

1. **Extension Compatibility**: 
   - Windsurf uses VS Code's extension API
   - Most VS Code extensions work without modification
   
2. **Codeium AI Integration**:
   - Windsurf's AI can automatically fix SonarLint issues
   - Right-click on underlined code → "Codeium: Fix Issue"
   - Or use inline suggestions when SonarLint detects problems

3. **Performance Settings**:
   - If SonarLint affects Windsurf's performance:
     ```json
     "sonarlint.ls.javaHome": null,
     "sonarlint.output.showAnalyzerLogs": false
     ```

#### Step 3: Verify Installation

- Open any TypeScript file in the Zopio project
- Check for SonarLint annotations in the editor
- Verify the Problems panel shows SonarLint issues

## Configuration for Zopio

### Project-Specific Settings

The Zopio project includes pre-configured SonarLint settings:

#### `.vscode/settings.json`
```json
{
  "sonarlint.pathToNodeExecutable": "node",
  "sonarlint.output.showAnalyzerLogs": true,
  "sonarlint.output.showVerboseLogs": false,
  "sonarlint.connectedMode.project": {
    "connectionId": "SonarCloud",
    "projectKey": "zopiolabs_zopio_test_fork"
  },
  "sonarlint.rules": {
    "typescript:S1848": {
      "level": "off"
    },
    "typescript:S6479": {
      "level": "off"
    }
  }
}
```

#### `.sonarlint/sonarlint.json`
```json
{
  "rules": {
    "typescript:S1848": {
      "level": "off"
    },
    "javascript:S3776": {
      "parameters": {
        "threshold": 20
      }
    },
    "typescript:S3776": {
      "parameters": {
        "threshold": 20
      }
    },
    "typescript:S1479": {
      "parameters": {
        "maximum": 35
      }
    },
    "typescript:S6478": {
      "level": "off"
    },
    "typescript:S6582": {
      "level": "off"
    }
  },
  "typeScript": {
    "globals": [
      // React, Next.js, and Node.js globals
      "React", "JSX", "__dirname", "__filename", 
      "exports", "global", "module", "process", "require"
    ]
  },
  "excludedRules": [
    "common/DebuggingStatement",
    "common/DuplicatedBlocks"
  ],
  "exclude": [
    "packages/database/generated/**",
    "devapps/emailstudio/.react-email/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/.turbo/**"
  ]
}
```

### Understanding the Configuration

1. **Node Executable Path**: Uses the system Node.js installation
2. **Connected Mode**: Configured to sync with SonarCloud project `zopiolabs_zopio_test_fork`
3. **Logging**: Analyzer logs enabled for debugging, verbose logs disabled
4. **Rule Overrides**: 
   - TypeScript rules S1848, S6478, S6582 disabled for project compatibility
   - Cognitive complexity threshold increased to 20 for monorepo patterns
   - Maximum switch cases increased to 35
5. **Exclusions**: 
   - Generated code (Prisma, Next.js builds)
   - Dependencies and build artifacts
   - Test coverage reports
6. **Global Variables**: Configured for React, Next.js, and Node.js environments

## Using SonarLint

### Real-Time Analysis

SonarLint automatically analyzes your code as you type. Issues appear:
- As squiggly underlines in the editor
- In the Problems panel (⌘⇧M / Ctrl+Shift+M)
- In the SonarLint view in the Activity Bar

### Issue Severity Levels

1. **🔴 Bugs**: Code that's likely broken or will fail
2. **🟠 Vulnerabilities**: Security issues that need immediate attention
3. **🟡 Code Smells**: Maintainability issues that should be addressed
4. **ℹ️ Info**: Best practice suggestions and minor improvements

### Viewing Issue Details

1. Hover over underlined code to see the issue description
2. Click the lightbulb icon for quick fixes (when available)
3. Click "Why is this an issue?" for detailed explanations

### Quick Actions

For many issues, SonarLint provides automatic fixes:
1. Place cursor on the issue
2. Press ⌘. (Mac) or Ctrl+. (Windows/Linux)
3. Select the suggested fix from the menu

## Common Issues and Solutions

### TypeScript Specific

#### Unused Imports
```typescript
// ❌ Issue: Unused import
import { unusedFunction } from './utils';

// ✅ Fix: Remove unused imports
// SonarLint will highlight and offer to remove automatically
```

#### Complex Functions
```typescript
// ❌ Issue: Cognitive complexity too high
function complexFunction(data: any) {
  if (data) {
    if (data.type === 'A') {
      if (data.value > 10) {
        // Multiple nested conditions
      }
    }
  }
}

// ✅ Fix: Extract into smaller functions
function processData(data: any) {
  if (!data) return;
  
  if (data.type === 'A') {
    handleTypeA(data);
  }
}

function handleTypeA(data: any) {
  if (data.value > 10) {
    // Handle specific case
  }
}
```

#### Security Issues
```typescript
// ❌ Issue: Potential SQL injection
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Fix: Use parameterized queries with Prisma
import { database } from '@repo/database';

const user = await database.user.findUnique({
  where: { id: userId }
});
```

### React/Next.js Specific

#### Missing Keys in Lists
```tsx
// ❌ Issue: Missing key prop
items.map(item => <div>{item.name}</div>)

// ✅ Fix: Add unique key
items.map(item => <div key={item.id}>{item.name}</div>)
```

#### Accessibility Issues
```tsx
// ❌ Issue: Missing alt text
<img src="/logo.png" />

// ✅ Fix: Add descriptive alt text
<img src="/logo.png" alt="Zopio logo" />

// ❌ Issue: Click handler on non-interactive element
<div onClick={handleClick}>Click me</div>

// ✅ Fix: Use semantic HTML
<button onClick={handleClick}>Click me</button>
```

#### Hook Dependencies
```typescript
// ❌ Issue: Missing dependencies in useEffect
useEffect(() => {
  fetchData(userId);
}, []); // userId missing from dependency array

// ✅ Fix: Include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

## Best Practices

### 1. Address Issues Immediately
- Fix issues as they appear rather than accumulating technical debt
- Use quick fixes when available
- Understand why something is an issue before fixing

### 2. Configure Team Standards
- Agree on which rules to enforce project-wide
- Document exceptions in `.sonarlint/sonarlint.json`
- Review and update rules periodically

### 3. Use the SonarLint Panel
- Open the SonarLint view to see all issues in current file
- Filter by severity to prioritize critical issues
- Use the "Clean as You Code" approach

### 4. Integration with CI/CD
- SonarLint rules should match your SonarCloud configuration
- Fix issues locally before pushing to avoid CI failures
- Use connected mode for synchronized rules

### 5. AI-Assisted Development Best Practices

#### When Using Cursor
- **Security First**: Always let SonarLint validate AI-generated code
- **Learn from Issues**: Ask Cursor to explain why SonarLint flagged something
- **Batch Fixes**: Use Cursor's multi-cursor to fix similar issues across files
- **Context Sharing**: Include SonarLint error messages in your Cursor prompts

#### When Using Windsurf
- **Codeium + SonarLint**: Let Codeium generate code, then validate with SonarLint
- **Auto-fix Workflow**: Codeium suggests → SonarLint validates → You approve
- **Performance Balance**: Disable real-time analysis for very large files
- **Learning Mode**: Use Windsurf's explain feature for SonarLint rules

#### General AI Tips
- Never blindly accept AI fixes for security issues
- Always understand the security implications of suggested changes
- Use AI to learn about best practices, not bypass them
- Combine AI efficiency with SonarLint's security expertise

## Monorepo-Specific Guidance

### Working with Packages

When working in the Zopio monorepo:

1. **Open from Root**: Always open VS Code from the repository root, not individual packages
2. **File Analysis**: SonarLint analyzes all TypeScript/JavaScript files across packages
3. **Shared Configuration**: Settings apply to all packages uniformly

### Common Monorepo Issues

#### Import Resolution
```typescript
// ✅ Correct: Use workspace aliases
import { Button } from '@repo/design-system/ui';

// ❌ Incorrect: Relative imports across packages
import { Button } from '../../../packages/design-system/ui';
```

#### Generated Files
Files in these directories are automatically excluded:
- `packages/database/generated/**` - Prisma generated client
- `devapps/emailstudio/.react-email/**` - React Email generated files
- `**/dist/**` - Build outputs
- `**/.next/**` - Next.js build artifacts
- `**/coverage/**` - Test coverage reports
- `**/node_modules/**` - Dependencies
- `**/.turbo/**` - Turborepo cache

## Troubleshooting

### General Issues

#### SonarLint Not Working

1. **Check Output Panel**
   - View → Output → Select "SonarLint" from dropdown
   - Look for error messages

2. **Verify Node.js**
   ```bash
   node --version  # Should be v18 or higher (Zopio requires >=18)
   ```

3. **Restart Language Service**
   - Command Palette → "TypeScript: Restart TS Server"

### IDE-Specific Issues

#### Cursor Issues

1. **Extension Not Loading**
   - Cursor sometimes disables extensions for performance
   - Go to Settings → Extensions → Enable SonarLint
   - Restart Cursor after enabling

2. **Conflicts with AI Features**
   - If Cursor's AI suggestions conflict with SonarLint:
   - Prioritize SonarLint for security issues
   - Use Cursor AI to implement SonarLint's suggestions

3. **Performance**
   - Cursor + SonarLint may use more resources
   - Consider disabling real-time analysis for large files:
   ```json
   "sonarlint.disableTelemetry": true,
   "sonarlint.output.showAnalyzerLogs": false
   ```

#### Windsurf Issues

1. **Extension Compatibility**
   - Some VS Code extensions may need updates for Windsurf
   - Check Windsurf's extension compatibility list
   - Update to latest Windsurf version if issues persist

2. **Codeium Integration Conflicts**
   - Codeium's autocomplete may override SonarLint warnings
   - Configure Codeium to respect SonarLint annotations:
   ```json
   "codeium.enableCodeLens": false,
   "codeium.enableInlineCompletions": true
   ```

3. **Memory Usage**
   - Windsurf + extensions can be memory intensive
   - Increase memory allocation if needed:
   ```json
   "sonarlint.ls.vmargs": "-Xmx2G"
   ```

### False Positives

If SonarLint reports incorrect issues:

1. **Suppress Specific Issues**
   ```typescript
   // NOSONAR - Explanation why this is okay
   const necessaryComplexCode = ...;
   ```

2. **Configure Rule Exceptions**
   - Edit `.sonarlint/sonarlint.json`:
   ```json
   {
     "rules": {
       "typescript:RuleID": {
         "level": "off"
       }
     }
   }
   ```

### Performance Issues

If SonarLint slows down your IDE:

1. **Disable Verbose Logging**
   ```json
   "sonarlint.output.showVerboseLogs": false
   ```

2. **Check for Large Files**
   - SonarLint may struggle with very large files
   - Consider splitting large files

3. **IDE-Specific Optimizations**
   - **VS Code**: Use workspace trust features
   - **Cursor**: Disable unused Cursor features when using SonarLint
   - **Windsurf**: Limit concurrent analysis threads

## Advanced Features

### Connected Mode with SonarCloud

To sync with the team's SonarCloud configuration:

1. **Generate Personal Token**
   - Go to [SonarCloud Security](https://sonarcloud.io/account/security)
   - Generate new token with "Execute Analysis" permission
   - Name it descriptively (e.g., "VSCode SonarLint")

2. **Configure Connection**
   - Command Palette (⌘⇧P) → "SonarLint: Configure Connection"
   - Choose "SonarCloud"
   - Enter your token when prompted
   - Organization: `zopiolabs`
   - Project Key: `zopiolabs_zopio_test_fork`

3. **Verify Connection**
   - Status bar should show "SonarLint: Connected Mode"
   - Rules will sync with SonarCloud configuration

### GitHub Actions Integration

The Zopio project includes comprehensive SonarCloud integration through GitHub Actions:

#### Workflow Configuration (`.github/workflows/sonarcloud.yml`)

The workflow automatically runs on:
- Pushes to the `develop` branch
- Pull requests targeting `develop`

Key features:
1. **Automatic Analysis**: Runs SonarCloud scanner on every PR and push
2. **Coverage Integration**: Generates and uploads test coverage reports
3. **Quality Gate Comments**: Posts analysis results directly on PRs
4. **Module-Based Analysis**: Separate analysis for different parts of the monorepo

#### Module Configuration (`sonar-project.properties`)

The project uses modular analysis for better organization:
```properties
# Main project configuration
sonar.projectKey=zopiolabs_zopio_test_fork
sonar.organization=zopiolabs
sonar.projectName=zopio_test_fork

# Module definitions
sonar.modules=apps-api,apps-app,packages-database,packages-design-system

# Module-specific source and test directories
apps-api.sonar.sources=apps/api
apps-api.sonar.tests=apps/api/__tests__
apps-app.sonar.sources=apps/app
apps-app.sonar.tests=apps/app/__tests__
```

#### Quality Gates

The project enforces strict quality requirements:
- **Coverage**: Minimum 80% on new code (when 20+ lines added)
- **Duplications**: Maximum 3% duplicated lines
- **Maintainability**: A rating required
- **Reliability**: A rating required (no bugs)
- **Security**: A rating required (no vulnerabilities)

### Custom Rules

Create project-specific rules:

1. **Define Rule Configuration**
   ```json
   "sonarlint.rules": {
     "typescript:S125": {
       "level": "error",
       "parameters": {
         "format": "^[A-Z][a-zA-Z0-9]*$"
       }
     }
   }
   ```

2. **Share with Team**
   - Commit `.sonarlint/sonarlint.json`
   - Document custom rules in team wiki

## Integration with Zopio Workflow

### Pre-Commit Checks

Before committing:
1. Ensure Problems panel shows no critical SonarLint issues
2. Run quality checks:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

### Pull Request Workflow

1. **Local Development**
   - Fix all SonarLint issues in changed files
   - Run: Command Palette → "SonarLint: Show All Issues"

2. **Before Push**
   - Verify no new security vulnerabilities or bugs
   - Check that code smells are minimized

3. **CI Integration**
   - SonarCloud runs automatically on all PRs
   - Must pass quality gates for merge:
     - No new bugs
     - No new vulnerabilities
     - 80% coverage on new code (when 20+ lines added)
     - Maintainability rating A

## Coverage and Testing

### Running Tests with Coverage

```bash
# Run all tests with coverage (from root)
pnpm test -- --coverage --run

# Run specific app tests with coverage
cd apps/app && pnpm test -- --coverage --run
cd apps/api && pnpm test -- --coverage --run

# View coverage reports (generated locally in each app)
open apps/app/coverage/index.html
open apps/api/coverage/index.html
```

### Coverage Integration

Coverage reports are generated locally in each app's directory:
- `apps/app/coverage/lcov.info` - Frontend app coverage
- `apps/api/coverage/lcov.info` - API coverage
- Each package can have its own `./coverage` directory

SonarCloud workflow:
1. GitHub Actions runs tests with coverage
2. Coverage files are collected from each app/package
3. Results are uploaded to SonarCloud
4. Quality gate results posted as PR comments

## Quick Reference

### Keyboard Shortcuts

#### VS Code / Cursor / Windsurf (Common)

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| View Problems | ⌘⇧M | Ctrl+Shift+M |
| Quick Fix | ⌘. | Ctrl+. |
| Next Problem | F8 | F8 |
| Previous Problem | ⇧F8 | Shift+F8 |
| Show All Issues | ⌘⇧P → "SonarLint: Show All Issues" | Ctrl+Shift+P → "SonarLint: Show All Issues" |

#### Cursor-Specific

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| AI Fix Suggestion | ⌘K | Ctrl+K |
| Apply AI Fix | ⌘⏎ | Ctrl+Enter |
| Chat about Issue | ⌘L | Ctrl+L |

#### Windsurf-Specific

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Codeium Fix | ⌥⏎ | Alt+Enter |
| Show Codeium Suggestions | ⌘I | Ctrl+I |
| Navigate Codeium Fixes | Tab | Tab |

### Common Rule IDs

| Rule | Description | Severity | Action |
|------|-------------|----------|---------|
| S125 | Remove commented code | Minor | Clean up |
| S1481 | Remove unused variables | Major | Remove |
| S3776 | Reduce cognitive complexity | Critical | Refactor |
| S6479 | No redundant type annotations | Minor | Simplify |
| S1848 | Check object existence | Major | Add checks |
| S2589 | Boolean expressions should not be gratuitous | Major | Simplify |
| S1854 | Dead stores should be removed | Major | Remove |

### Useful Commands

Access via Command Palette (⌘⇧P / Ctrl+Shift+P):
- `SonarLint: Show All Issues` - View all issues in workspace
- `SonarLint: Configure Connection` - Set up SonarCloud sync
- `SonarLint: Update All Project Bindings` - Refresh connected mode
- `SonarLint: Deactivate Rule` - Disable specific rule

## Security Best Practices

### Never Commit Secrets
```typescript
// ❌ Never do this
const apiKey = "sk-abc123...";

// ✅ Use environment variables
const apiKey = process.env.API_KEY;
```

### Validate User Input
```typescript
// ❌ Vulnerable to injection
const query = `SELECT * FROM users WHERE name = '${userName}'`;

// ✅ Use parameterized queries
const user = await database.user.findFirst({
  where: { name: userName }
});
```

### Handle Errors Securely
```typescript
// ❌ Exposes internal details
catch (error) {
  res.status(500).json({ error: error.stack });
}

// ✅ Safe error handling
catch (error) {
  logger.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
```

## Team Collaboration

### Sharing Configuration

1. **Rule Customizations**: Commit `.sonarlint/sonarlint.json`
2. **VS Code Settings**: Commit `.vscode/settings.json`
3. **Documentation**: Update this guide for team-specific patterns

### Reporting Issues

When you find a false positive or need rule adjustment:

1. Document the issue with code example
2. Discuss in team chat or PR
3. Update configuration if team agrees
4. Commit changes for everyone

## Next Steps

1. **Install SonarLint** if you haven't already
2. **Open a TypeScript file** in the Zopio project
3. **Make an intentional mistake** (e.g., unused variable)
4. **See SonarLint in action** with real-time feedback
5. **Fix the issue** using the quick fix suggestion
6. **Connect to SonarCloud** for team-synchronized rules
7. **Explore the SonarLint panel** for project-wide insights

## Additional Resources

- [SonarLint VS Code Documentation](https://docs.sonarsource.com/sonarlint/vs-code/)
- [TypeScript Rules Reference](https://rules.sonarsource.com/typescript/)
- [React/JSX Rules](https://rules.sonarsource.com/javascript/)
- [Security Hotspot Guide](https://docs.sonarcloud.io/digging-deeper/security-hotspots/)
- [Zopio SonarCloud Dashboard](https://sonarcloud.io/project/overview?id=zopiolabs_zopio_test_fork)

## Getting Help

### General Support
- **Configuration Issues**: Check `.sonarlint/sonarlint.json` and `.vscode/settings.json`
- **False Positives**: Create a GitHub issue with the `quality` label
- **Questions**: Ask in the team chat or during code reviews
- **Bug Reports**: Include the SonarLint output logs

### IDE-Specific Support

#### VS Code
- [VS Code SonarLint Issues](https://github.com/SonarSource/sonarlint-vscode/issues)
- [VS Code Extension Docs](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarlint-vscode)

#### Cursor
- Check Cursor's extension compatibility in Settings
- [Cursor Discord](https://discord.gg/cursor) for community support
- Report extension issues to both Cursor and SonarLint teams

#### Windsurf
- [Windsurf Documentation](https://docs.windsurf.com/)
- Extension compatibility list in Windsurf settings
- Codeium + SonarLint integration issues: Check Windsurf forums

### Useful Resources
- [SonarLint Community Forum](https://community.sonarsource.com/c/sonarlint)
- [Stack Overflow - SonarLint Tag](https://stackoverflow.com/questions/tagged/sonarlint)

---

*Last updated: January 2025*  
*Maintainer: Zopio Development Team*