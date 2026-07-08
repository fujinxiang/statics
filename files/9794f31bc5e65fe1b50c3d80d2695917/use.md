cp /Users/fujinxiang/Documents/Code/CVTE/cai/bin/cai-darwin-arm64 ~/.local/bin



安装命令:
Unix:

curl -fsSL https://repo.gz.cvte.cn/repo/repository/generic-public-local/cai/install.sh | sh


Windows:

  
irm https://repo.gz.cvte.cn/repo/repository/generic-public-local/cai/install.ps1 | iex


修改：
AuthExchangeService 改名为 AuthService，文档中不能再用 AES 缩写，不能再用 aes 目录名，改为 authservice, 
域名分别改为 
authservice.gz.cvte.cn  
agentgateway.gz.cvte.cn  
agentgateway-ui.gz.cvte.cn

环境变量 AUTH_EXCHANGE_SERVICE_ORIGIN 也改为 AUTH_SERVICE_ORIGIN


修改 cai cli 代码之后，测试一遍流程，使用线上服务

AUTH_SERVICE_ORIGIN 已经被我手动改为 AUTHSERVICE_ORIGIN
并且，已经在cai代码中内置这两个变量作为默认值，不要求用户一定得配置环境变量
export AUTHSERVICE_ORIGIN=https://authservice.gz.cvte.cn
export AGENTGATEWAY_ORIGIN=https://agentgateway.gz.cvte.cn


## 本地调试（不打包）

开发时无需构建二进制，直接用 `go run` 跑即可。`internal/configdata/service.env`
是源码内的嵌入文件，每次 `go run` / `go build` 都会把最新内容通过 `go:embed`
编译进去。

常用调试命令：

```bash
# 扫码登录（打印 debug 日志到 stderr）
go run . login --debug

# 查看当前用户；--debug 会额外输出 access_token 原文与 JWT header/payload
go run . info --debug

# 调用业务接口
go run . invoke --service skills-manage --action group.list --debug

# 清理本地凭证
go run . logout
```

临时指向非生产网关：编辑 `internal/configdata/service.env` 里的
`CAI_BASE_URL` / `CAI_SYS_PREFIX`，改完直接 `go run .`，调试完记得改回。

查看已保存的凭证：

- macOS：`security find-generic-password -s cai -w`
- 文件兜底：`cat ~/.config/cai/tokens.json`

## 审计日志

`cai login` / `cai logout` 会同步上报 `cli_login` / `cli_logout` 到 AuthService，
`cai invoke` / `cai mcp` / `cai push` 由服务端写入 `exchange` / `config_change`。
查询与字段说明见 [audit-log.md](./audit-log.md)。

## invoke 透传 header

`cai invoke` 在 token exchange 后会将 AuthService 返回的 `headers_to_backend` 转发到
agentgateway（如 `x-iac-token`）。链路说明、排查与 MCP 范围差异见
[2026-07-03-exchange-x-iac-token-header.md](./2026-07-03-exchange-x-iac-token-header.md)。

## daemon（后台进程）

`cai daemon` 把 cai 作为后台常驻进程运行，目前只做 **token 自动续期**——
飞书事件长连接、Agent loop、Tool Registry 等后续阶段还未接入。

```bash
cai daemon start             # 后台启动；打印 pid
cai daemon status            # 查看 pid / uptime / 用户名 / 最近刷新时间 / 错误次数
cai daemon status --json     # 机器可读
cai daemon stop              # SIGTERM → 8s 超时 → SIGKILL
cai daemon stop --timeout 5s # 自定义超时
```

文件落点 `~/.cai/daemon/`：

| 文件 | 用途 |
|------|------|
| `daemon.pid` | 当前进程 PID；进程不在跑时会被 `start` / `stop` 自愈清理 |
| `daemon.log` | daemon 子进程 stdout/stderr + zap 结构化日志；不轮转，按需手动清理 |
| `status.json` | 运行态快照（启动时间、最近刷新、用户名、错误次数等）；`stop` 会清掉 |

行为约束：

- daemon 调内部业务时复用「当前登录用户」的 JWT，不再为机器人单独发 token。
- daemon 在跑期间若你在另一终端 `cai logout`，daemon 在下一次 tick（30s 内）会优雅退出。
- access_token 失效（refresh_token 过期 / 最大会话期限超时）时 daemon 也会优雅退出，需要重新 `cai login` 后再 `cai daemon start`。

设计文档与后续阶段路线见 [cai-daemon-agent-design.md](./cai-daemon-agent-design.md)。

### 飞书机器人接入（Phase 2，2.11.0 起）

daemon 启动时若检测到 bot 凭据，会额外启动飞书事件长连接 consumer，
订阅 `im.message.receive_v1`，收到消息后写日志 + 回一句 echo。

前置准备：

1. 在飞书开放平台创建自建应用，添加「机器人」能力。
2. 在「事件订阅」里选择「使用长连接接收事件」，订阅 `im.message.receive_v1`。
3. 拿到 `App ID`（`cli_xxx`）和 `App Secret`。

写入凭据（keyring 优先，文件兜底 `~/.cai/daemon/bot.json` 0600）：

```bash
cai daemon config set-bot --app-id=cli_xxx --app-secret=xxx
cai daemon config show        # app_id 全显，app_secret 脱敏（前 4 + 末 4）
cai daemon config clear-bot   # 清除
```

启动 daemon 并验证：

```bash
cai daemon start --log-level=debug
cai daemon status             # 看到 lark: connected
tail -f ~/.cai/daemon/daemon.log   # 用飞书给 bot 发私聊 ping，应看到 OnP2MessageReceiveV1 + echo 回复
```

注意事项：

- 未配置 bot 时 daemon 仍正常跑（只做 token 续期），`status` 会显示 `lark: not configured`。
- `set-bot` / `clear-bot` 后必须 `cai daemon stop && cai daemon start` 才生效——凭据只在启动时加载一次。
- Phase 2 群聊消息只在群里回 reply，私聊回新消息；触发条件 / 白名单留待 Phase 4。
- App Secret 仅本地存储；`config show` 严格脱敏，永不输出明文。

### Agent 工具白名单（Phase 3，2.12.0 起）

daemon 内置 Agent（Phase 4 起接 LLM）需要先知道「允许调哪些 service」。白名单存 `~/.cai/daemon/agent.json`（0600），默认空。

```bash
# 配置白名单（逗号分隔）
cai daemon config set-agent --allow-services=skills-manage,lark-im
cai daemon config show-agent
cai daemon config clear-agent

# 允许所有已 sync 的 service（通配符；shell 里要加引号）
cai daemon config set-agent --allow-services='*'

# 查看当前 registry 里的全部 Tool（按需构建，不发 daemon）
cai daemon tools list
cai daemon tools list --service skills-manage
```

`*` 通配符会展开成本地 `~/.cai/skills/manifest.json` 里所有已 sync 的 service。SKILL.md 没有 `### action_id` 标题格式的 service 会被记 `no_actions` 错误跳过，但不会阻塞其他 service。

`tools list` 行为：

- 对每个 allow service：
  - HTTP service：解析 `~/.cai/skills/<svc>/SKILL.md` 的 `### action_id — 描述` 标题，每个 action 一个 tool
  - MCP service：通过 agentgateway 调 `tools/list`，每个 tool 一个 tool
- service 不在本地 skillcache（`~/.cai/skills/<svc>/SKILL.md` 不存在）→ `[warn] not_synced`，先 `cai skill sync <svc>`
- 部分失败不阻塞其他 service，错误汇总到 stderr
- 当前不含 `tools exec`（Phase 4 配套 LLM 时补）

### Agent + LLM（Phase 4，2.13.0 起）

把 daemon 从「EchoHandler 鹦鹉学舌」升级为「真 Agent」：飞书消息 → LLM 选 tool（原生 function calling）→ 调 invoke/mcp → 把结果回灌 → 最终回复。需要 LLM 配置 + 非空 Agent 白名单才能启用，否则 daemon 退化为 EchoHandler。

```bash
# 配置 LLM 网关（OpenAI 兼容）
cai daemon config set-llm \
    --base-url=https://ai.cvte.cn/v1 \
    --model=deepseek-chat \
    --api-key=sk-xxx
cai daemon config show-llm        # base_url + model 全显，api_key 脱敏
cai daemon config clear-llm

# 还需要 bot 凭据 + Agent 白名单（Phase 2 / Phase 3 已配的话跳过）
cai daemon config set-bot --app-id=cli_xxx --app-secret=xxx
cai daemon config set-agent --allow-services=skills-manage

# 启动 daemon
cai daemon start --log-level=debug
cai daemon status                 # 看到 agent: enabled
```

Agent 行为：

- **触发条件**：私聊全量响应；群聊必须包含 `@` 才响应（Phase 5 精确判定 mentions 字段）。
- **超时**：单次 Agent 调用 30s。超时返回当前最后的 LLM 文本。
- **护栏**：白名单 service（Phase 3 配置）+ 单次 30s 超时；内部还有「连续重复 tool 调用 3 次」安全阀防 LLM 死循环。
- **跨消息上下文**：Phase 4 不维护，每条消息独立 Agent 调用。
- **失败 UX**：Agent 失败时回「[cai daemon] Agent 出错：…」（限 200 字符）+ 调 onError 写 daemon.log。
- **未配 LLM 或白名单**：daemon 仍正常跑，但收消息后回「Agent 未配置 LLM / 工具白名单」提示。

飞书端用法举例：

```text
你（私聊）：查我所在的技能组
bot：你所在的技能组：frontend、backend。

你（私聊）：查 cai 这个技能的详情
bot：cai 技能由 fujinxiang 维护，版本 2.13.0...

你（群聊 @bot）：刚才那个技能有多少个文件？
bot：（Phase 4 不维护上下文）请提供完整意图，比如「查 cai 技能的文件数量」。
```



## 启动

  cd /Users/fujinxiang/Documents/Code/CVTE/cai

  # 1. 后台启动 daemon（go run 会编译临时二进制并 spawn 后台进程）
  go run . daemon start --log-level=debug

  # 2. 新开终端 tail 日志
  tail -f ~/.cai/daemon/daemon.log

  # 3. 在飞书发消息，观察日志
  #    期望：INFO message received chat_id=... msg_type=text ...

  # 4. 测完停
  go run . daemon stop

  # 5. 看 daemon 状态
  go run . daemon status

  重要：第一次 go run . daemon start 后，daemon 子进程是 go run 编译出来的临时二进制（路径类似 /tmp/go-build.../cai）。停
  daemon 时也要用 go run . daemon stop，stop 是按 PID 文件杀进程，跟二进制路径无关。

  但注意：如果你之后改了代码，必须 stop 后再 start，否则跑的还是旧二进制。

  其它常用命令：

  # 看 bot 凭据
  go run . daemon config show

  # 配 LLM（如果要用 Agent 而非 EchoHandler）
  go run . daemon config set-llm --base-url=... --model=... --api-key=...

  # 配 agent 白名单（要让 Agent 真工作必须配）
  go run . daemon config set-agent --allow-services=skills-manage

  # 看 registry 里的 tool
  go run . daemon tools list

  启动 daemon 后跑飞书测试，把 tail -f ~/.cai/daemon/daemon.log 的输出贴给我，我立刻帮你看为什么收不到消息。