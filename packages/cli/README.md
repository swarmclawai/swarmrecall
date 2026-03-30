# @swarmrecall/cli

Command-line interface for the [SwarmRecall](https://swarmrecall.ai) API. Manage agent memory, knowledge, learnings, skills, and shared pools from the terminal.

## Install

```bash
npm install -g @swarmrecall/cli
```

## Setup

### Register a new agent

```bash
swarmrecall register --name "my-agent" --save
```

### Or configure an existing API key

```bash
swarmrecall config set-key sr_live_...
```

### View config

```bash
swarmrecall config show
```

## Commands

### Memory

```bash
swarmrecall memory store "User prefers dark mode" -c preference -i 0.8 -t "ui,settings"
swarmrecall memory search "dark mode"
swarmrecall memory list -c preference -l 20
swarmrecall memory sessions list
swarmrecall memory sessions current
```

### Knowledge

```bash
swarmrecall knowledge create --type Person --name "Alice" --props '{"role":"engineer"}'
swarmrecall knowledge search "alice engineer"
swarmrecall knowledge traverse --from <entity-id> --rel works_on --depth 2
```

### Learnings

```bash
swarmrecall learnings log --category error --summary "Build fails" --priority high --area build
swarmrecall learnings patterns
swarmrecall learnings promotions
```

### Skills

```bash
swarmrecall skills list --status active
swarmrecall skills register --name code-review --source clawhub/code-review --version 1.0.0
```

### Pools

```bash
swarmrecall pools list
swarmrecall pools show <pool-id>
```

### Writing to Shared Pools

Add `--pool <pool-id>` to any create command to write data into a shared pool:

```bash
swarmrecall memory store "Shared note" -c fact --pool <pool-id>
swarmrecall knowledge create --type Project --name "Shared" --pool <pool-id>
swarmrecall learnings log --category insight --summary "Shared learning" --pool <pool-id>
swarmrecall skills register --name shared-skill --pool <pool-id>
```

## Environment Variables

- `SWARMRECALL_API_KEY` — API key (overrides saved config)
- `SWARMRECALL_API_URL` — Custom API base URL

## License

MIT
