# License 兼容性说明

## 许可证概览

| 组件 | License | 版本 |
|------|---------|------|
| Mole CLI（上游） | GPL-3.0 | v1.43.0 |
| Mole GUI（本项目） | MIT | v0.3.1 |

## 兼容性分析

### GPL-3.0 与 MIT 的关系

- **MIT 许可证**：宽松许可证，允许自由使用、修改、分发，包括商业用途，唯一要求是保留版权声明。
- **GPL-3.0 许可证**：强 copyleft 许可证，要求派生作品同样以 GPL-3.0 发布。

### Mole GUI 的集成方式

Mole GUI 通过以下方式集成 Mole CLI：

1. **git submodule**：Mole 源码作为子模块引入（`mole-src/`），编译为 Go 二进制
2. **subprocess 调用**：GUI 通过 `std::process::Command` 启动 Mole 二进制，通过 stdin/stdout 通信
3. **非链接集成**：GUI 不链接 Mole 的任何库，仅作为独立进程调用

### 兼容性结论

**Mole GUI 以 MIT 许可证发布是合规的**，原因如下：

1. **进程隔离**：Mole GUI 通过 subprocess 调用 Mole CLI，两者运行在独立进程中，不共享内存空间。
2. **非派生作品**：根据 GPL-3.0 FAQ，仅通过命令行接口调用 GPL 程序的独立软件不属于"派生作品"（derivative work），无需继承 GPL 许可证。
3. **Mole 二进制保持 GPL**：打包在 GUI 中的 Mole 二进制文件本身仍受 GPL-3.0 约束，其源码通过 `mole-src/` 子模块提供。

### 分发时的注意事项

当分发 Mole GUI（如 `.dmg` 安装包）时，需满足以下条件：

1. **Mole 源码可用性**：打包的 Mole 二进制受 GPL-3.0 约束，必须向用户提供其源码或获取途径。本项目通过 `mole-src/` 子模块和 GitHub 仓库满足此要求。
2. **GPL 声明**：应在文档或关于页面中注明 Mole CLI 使用 GPL-3.0 许可证，并提供指向上游仓库的链接。
3. **MIT 部分独立**：GUI 自身的源代码（`src/`、`src-tauri/`，不包含 `mole-src/`）可自由以 MIT 许可证使用。

## 建议

1. 在 README.md 和应用内注明 Mole CLI 的 GPL-3.0 许可证
2. 确保 `mole-src/` 子模块在发布版本中可访问
3. 如将来改为静态链接 Mole 库（而非 subprocess 调用），需重新评估许可证兼容性
