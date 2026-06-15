# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.0.1-alpha.1] - 2026-06-15

### Added / 新增

- macOS 窗口拖拽支持，可通过侧边栏品牌区域拖拽移动窗口。
- macOS window drag support, allowing window movement via sidebar brand area.
- Analyze 组件增量过滤功能，支持实时过滤目录和文件条目。
- Analyze component incremental filter, supporting real-time filtering of directory and file entries.
- License 兼容性说明文档，详细说明 MIT 与 GPL-3.0 的兼容性。
- License compatibility documentation, explaining MIT and GPL-3.0 compatibility.
- Initial release of Mole GUI
- Basic application structure and core functionality

### Changed / 变更

- 将 mole-src 从内联文件转换为正确的 git 子模块，便于版本管理。
- Convert mole-src from inline files to proper git submodule for better version management.
- 更新 Mole CLI 从 v1.42.0 到 v1.43.0，包含新功能和 bug 修复。
- Update Mole CLI from v1.42.0 to v1.43.0, including new features and bug fixes.
- Dashboard 图表优化，改进历史数据记录和显示效果。
- Dashboard chart optimization, improving history data recording and display.
- LineChart 组件增强，支持自定义格式化和空刻度隐藏。
- LineChart component enhancement, supporting custom formatting and empty tick hiding.
- CI 配置更新，仅在标签推送时触发构建。
- CI configuration update, triggering builds only on tag push.

### Fixed / 修复

- Overlay titlebar 模式的拖拽区域支持，修复窗口无法拖拽的问题。
- Overlay titlebar mode drag region support, fixing window drag issue.
- Clean 组件 dry-run 项目解析，正确显示预览清理项。
- Clean component dry-run item parsing, correctly displaying preview cleanup items.

## [0.3.1] - 2026-06-15

### Added
- macOS window drag support and chart optimization
- Overlay titlebar mode with drag region support

### Changed
- Update pnpm version configuration
- Update CI configuration to trigger only on tag push
