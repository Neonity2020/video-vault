# Git Hook 和 Push 报错解决方案指南

当 Claude Code / AI 助手尝试替你执行 `git commit` 或 `git push` 时，请务必注意本项目内的 Rust 代码质量检查机制。

## 报错背景
本项目根目录下没有 `Cargo.toml`（Rust 后端存放在 `src-tauri` 目录下），但 `cargo-husky` 生成的 `.git/hooks/pre-commit` 和 `.git/hooks/pre-push` 钩子会在项目根目录自动运行以下指令，导致“找不到文件”并阻止提交：
- `cargo test --all`
- `cargo check --all`
- `cargo clippy --all -- -D warnings`
- `cargo fmt --all -- --check`

## 解决方案
当前这两个 git hook 脚本已经被修改为：`cd src-tauri && cargo <command>` 以在子 shell 中正确定位到 Rust 后端代码检查。

## Claude Code 执行准则
你在协助用户提交代码并执行 `git push` 前，如果你修改过 `src-tauri/**/*.rs` 内的任何文件，**请必须强制作业并独立执行如下操作：**

1. 强制统一格式：执行 `cd src-tauri && cargo fmt`。否则钩子因格式不合格拒绝入库。
2. 强制警告排查：执行 `cd src-tauri && cargo clippy --all -- -D warnings` 来发现一切警告（连任何 `useless_format`, `collapsible_if` 等警告都会因 `-D` 被转为 Error 导致提交失败）。
3. 如果 `clippy` 检测到问题，必须**主动修复所有代码报错与警告**。

只有当你在当前终端完整看到 `clippy` 0 警告执行通过，以及通过 `cargo fmt --check` 后，才可正常执行后续的 `git add .`, `git commit` 和 `git push`操作，保证顺畅无错的丝滑体验。
