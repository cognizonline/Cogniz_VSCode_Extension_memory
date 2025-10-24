# Cogniz Memory - VS Code Extension

Give your AI context and memory across all your projects. The Cogniz Memory VS Code extension seamlessly integrates with the Cogniz Memory Platform to provide persistent memory for your AI assistants.

![Cogniz Memory Extension](https://cogniz.online/assets/vscode-extension-banner.png)

## Features

- **Save Anywhere**: Store selected text or clipboard content with a single command
- **Smart Search**: Find memories across all your projects instantly
- **Project-Based Organization**: Memories are automatically organized by project
- **Activity Bar Integration**: Quick access to recent memories in the sidebar
- **Command Palette**: All features accessible via `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- **Real-time Sync**: Automatic synchronization with Cogniz Memory Platform

## Installation

### Prerequisites

1. **VS Code** version 1.85.0 or higher
2. **Cogniz Account** at [cogniz.online](https://cogniz.online)
3. **API Key** from your Cogniz dashboard

### Install from VSIX

1. Download the latest `.vsix` file from the [Releases](https://github.com/cognizonline/Cogniz_VSCode_Extension_memory/releases) page
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Install from VSIX"
5. Select the downloaded `.vsix` file

### Install from VS Code Marketplace

Coming soon! The extension will be available in the VS Code Marketplace.

## Quick Start

### 1. Configure Connection

```
Ctrl+Shift+P → "Cogniz: Configure Connection"
```

Enter your details:
- **Base URL**: `https://cogniz.online`
- **API Key**: Get from [cogniz.online/dashboard](https://cogniz.online/dashboard)
- **Project ID**: Your default project (e.g., `default`)

### 2. Save Your First Memory

Select some text in your editor, then:
```
Ctrl+Shift+P → "Cogniz: Save Selection as Memory"
```

### 3. View Your Memories

Click the Cogniz icon in the Activity Bar (left sidebar) to see all your memories.

## Usage Guide

### Saving Memories

#### Save Selected Text
1. **Select** text in your editor
2. **Press** `Ctrl+Shift+P` / `Cmd+Shift+P`
3. **Type** "Cogniz: Save Selection as Memory"
4. Your text is saved to the current project

**Quick Shortcut**: `Ctrl+Alt+M` (Windows/Linux) or `Cmd+Alt+M` (Mac)

#### Save from Clipboard
1. **Copy** text to clipboard
2. **Press** `Ctrl+Shift+P` / `Cmd+Shift+P`
3. **Type** "Cogniz: Save Clipboard as Memory"
4. Clipboard content is saved

### Viewing & Managing Memories

#### Sidebar View
- Click the **Cogniz icon** in Activity Bar
- View **up to 50 recent memories**
- **Switch projects** using dropdown
- **Refresh** to see latest memories

#### Memory Actions
- **Copy**: Copy to clipboard
- **Insert**: Insert at cursor
- **View Details**: See full content

### Searching Memories

1. **Press** `Ctrl+Shift+P` / `Cmd+Shift+P`
2. **Type** "Cogniz: Search Memories"
3. **Enter** your search query
4. **Select** a result to insert it

### Project Management

Organize memories by project:
- Each project has separate memories
- Switch projects in the sidebar dropdown
- Project ID is set during configuration

## Commands Reference

Access all commands via Command Palette (`Ctrl+Shift+P`):

| Command | Description | Shortcut |
|---------|-------------|----------|
| **Cogniz: Configure Connection** | Set up API credentials | - |
| **Cogniz: Save Selection as Memory** | Save selected text | `Ctrl+Alt+M` |
| **Cogniz: Save Clipboard as Memory** | Save clipboard content | - |
| **Cogniz: Search Memories** | Search all memories | - |
| **Cogniz: Open Dashboard** | Open Cogniz dashboard | - |
| **Cogniz: Show Configuration** | View current settings | - |

## Troubleshooting

### No Memories Showing

**Solution:**
1. Click the **refresh button** in sidebar
2. Verify **API key** is correct
3. Check you have memories in the **selected project**
4. Run `Cogniz: Show Configuration` to verify settings

### Authentication Errors

**Solution:**
1. Verify your **API key** at [cogniz.online/dashboard](https://cogniz.online/dashboard)
2. Ensure **Base URL** is `https://cogniz.online`
3. Re-run `Cogniz: Configure Connection`

### Extension Not Working

**Solution:**
1. **Reload VS Code**: `Developer: Reload Window`
2. **Check version**: Ensure VS Code 1.85.0+
3. **View logs**: Open Developer Tools (`Ctrl+Shift+I`) and filter for `[Cogniz]`

### Getting Help

- **Documentation**: [cogniz.online/docs](https://cogniz.online/docs)
- **Dashboard**: [cogniz.online/dashboard](https://cogniz.online/dashboard)
- **GitHub Issues**: [Report a bug](https://github.com/cognizonline/Cogniz_VSCode_Extension_memory/issues)
- **Email Support**: support@cogniz.online

## Advanced Features

### Debug Logging

Enable detailed logging for troubleshooting:

1. Press `Ctrl+Shift+P` → "Developer: Toggle Developer Tools"
2. Open **Console** tab
3. Filter for `[Cogniz]`
4. See detailed API requests and responses

### Custom Projects

Create and manage multiple projects:

1. Visit [cogniz.online/dashboard](https://cogniz.online/dashboard)
2. Navigate to **Projects**
3. Create new project
4. Switch to it in VS Code sidebar

### API Integration

The extension uses the Cogniz Memory Platform REST API:

- **Endpoint**: `https://cogniz.online/wp-json/memory/v1/`
- **Authentication**: Bearer token via API key
- **Rate Limits**: As per your Cogniz account tier

## Version History

### v0.3.3 (Latest)
- ✅ Enhanced API logging
- ✅ Improved error messages
- ✅ Better cache invalidation
- ✅ Fixed wildcard query handling

### v0.3.2
- Dashboard link updated to cogniz.online
- Comprehensive debug logging
- Enhanced refresh functionality

### v0.3.1
- Content deduplication added
- Duplicate memory fix
- Improved memory display

### v0.3.0
- Rebranded from Mem0 to Cogniz
- Updated API endpoints
- WordPress platform integration

[View Full Changelog](CHANGELOG.md)

## Security & Privacy

- 🔒 **Encrypted Communication**: All data transmitted via HTTPS
- 🔑 **Secure Storage**: API keys stored in VS Code's secret storage
- 🔐 **Project Isolation**: Memories separated by project
- 📦 **No Local Cache**: Memories stored on Cogniz platform only

## System Requirements

| Requirement | Version |
|-------------|---------|
| VS Code | 1.85.0 or higher |
| Node.js | 18.x or higher (bundled with VS Code) |
| Operating System | Windows, macOS, or Linux |
| Internet | Required for API communication |

## Frequently Asked Questions

### Do I need a paid account?

Check [cogniz.online/pricing](https://cogniz.online/pricing) for current plans. A free tier is available.

### Can I use this offline?

No, the extension requires internet connection to sync with the Cogniz Memory Platform.

### How are memories organized?

Memories are organized by:
- **Project ID**: Each project has separate memories
- **Timestamp**: Newest memories appear first
- **Content**: Searchable across all memories

### What data is sent to Cogniz?

Only the content you explicitly save:
- Selected text from editor
- Clipboard content when using clipboard save
- File metadata (filename, language)
- Project ID

### Can I export my memories?

Yes! Visit [cogniz.online/dashboard](https://cogniz.online/dashboard) and use the export feature.

## Contributing

This is a commercial product. For feature requests or bug reports, please use [GitHub Issues](https://github.com/cognizonline/Cogniz_VSCode_Extension_memory/issues).

## License

Copyright © 2025 Cogniz. All rights reserved.

This extension is proprietary software. Use is subject to the terms in your Cogniz account agreement.

## About Cogniz

Cogniz Memory Platform provides persistent memory and context for AI assistants across multiple platforms and tools.

**Website**: [cogniz.online](https://cogniz.online)
**Dashboard**: [cogniz.online/dashboard](https://cogniz.online/dashboard)
**Documentation**: [cogniz.online/docs](https://cogniz.online/docs)

---

**Made with ❤️ by the Cogniz Team**
