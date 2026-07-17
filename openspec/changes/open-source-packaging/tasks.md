# open-source-packaging — tasks

## 1. Repo safety

- [x] 1.1 Write `.gitignore` (data.db, node_modules/, .next/, dev.log, *.tsbuildinfo); `git init`; verify `git status` never lists data.db
- [ ] 1.2 Owner rotates the DeepSeek API key and saves the new one in Settings (old key appeared in local logs)

## 2. License & docs

- [x] 2.1 Add MIT `LICENSE`
- [x] 2.2 Rewrite `README.md` (EN): requirements, install/run, Settings walkthrough with provider table, free search default + optional Claude, batch add, data/backup, troubleshooting; link to zh-CN
- [x] 2.3 Write `README.zh-CN.md` with equivalent content, link back to EN

## 3. Publish

- [x] 3.1 Initial commit; create GitHub repo and push (owner confirms repo name/visibility); verify GitHub shows MIT license and renders both READMEs
