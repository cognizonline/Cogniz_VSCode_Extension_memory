# GitHub Release Instructions

## Create Release on GitHub

1. Go to https://github.com/cognizonline/Cogniz_VSCode_Extension_memory/releases/new

2. Fill in the release details:
   - **Tag**: `v0.3.3`
   - **Release title**: `Cogniz Memory Extension v0.3.3`
   - **Description**: Use the content below

3. Upload the VSIX file:
   - Locate: `cogniz-vs-0.3.3.vsix` in the extension directory
   - Drag and drop to the release assets area

4. Click **Publish release**

---

## Release Notes (Copy & Paste)

```markdown
## Cogniz Memory - VS Code Extension v0.3.3

### Installation

1. Download the `cogniz-vs-0.3.3.vsix` file from Assets below
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Install from VSIX"
5. Select the downloaded file
6. Reload VS Code

### Features

- ✅ Save text selections and clipboard to Cogniz Memory Platform
- ✅ Search and retrieve memories across all projects
- ✅ Project-based memory organization
- ✅ Activity bar sidebar with memory viewer
- ✅ Real-time sync with cogniz.online
- ✅ Enhanced API logging for troubleshooting
- ✅ Command palette integration for all actions

### What's New in v0.3.3

- **Fixed**: Wildcard query handling - now properly returns all memories
- **Enhanced**: API request/response logging for better troubleshooting
- **Improved**: Error messages are more descriptive
- **Better**: Cache invalidation on refresh and project switch

### Configuration

After installation:

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "Cogniz: Configure Connection"
3. Enter your details:
   - **Base URL**: `https://cogniz.online`
   - **API Key**: Get from [cogniz.online/dashboard](https://cogniz.online/dashboard)
   - **Project ID**: Your default project (e.g., `default`)

### Quick Start

**Save Memory:**
- Select text → `Ctrl+Shift+P` → "Cogniz: Save Selection as Memory"

**View Memories:**
- Click Cogniz icon in Activity Bar (left sidebar)

**Search Memories:**
- `Ctrl+Shift+P` → "Cogniz: Search Memories"

### Support & Documentation

- **Documentation**: [cogniz.online/docs](https://cogniz.online/docs)
- **Dashboard**: [cogniz.online/dashboard](https://cogniz.online/dashboard)
- **Report Issues**: [GitHub Issues](https://github.com/cognizonline/Cogniz_VSCode_Extension_memory/issues)
- **Email**: support@cogniz.online

### Requirements

- VS Code 1.85.0 or higher
- Active Cogniz account at [cogniz.online](https://cogniz.online)
- Internet connection for API synchronization

### Technical Details

- **Version**: 0.3.3
- **Size**: ~531KB
- **API Endpoint**: `https://cogniz.online/wp-json/memory/v1/`
- **Platform**: Windows, macOS, Linux

---

**Made with ❤️ by the Cogniz Team**
```

---

## After Publishing

1. Update the README.md to include the release link
2. Announce in Cogniz dashboard news
3. Send email to customers about new extension
4. Update documentation with installation instructions

## Files to Upload

- `cogniz-vs-0.3.3.vsix` (Primary extension file)

The VSIX file is located at:
`C:\Users\Savannah Babette\mcp_ultra\mem0_aisl_16_09\direct\Browser\cogniz VS\cogniz-vs-0.3.3.vsix`
