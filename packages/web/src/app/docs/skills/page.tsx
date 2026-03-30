export default function SkillsPage() {
  return (
    <div className="prose-docs">
      <h1>Skills</h1>
      <p>
        SwarmRecall skills are available on{' '}
        <a
          href="https://clawhub.ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          ClawHub
        </a>
        . Each skill adds a specific capability to your SwarmClaw agent.
        Install them with one click or via the CLI.
      </p>

      <h2>Available Skills</h2>

      <h3>swarmrecall-full</h3>
      <p>
        The complete SwarmRecall skill bundle. Installs all modules: memory,
        knowledge, learnings, and skills. This is the recommended starting
        point.
      </p>
      <pre>
        <code>swarmclaw skill install swarmrecall-full</code>
      </pre>
      <p>
        <a
          href="https://clawhub.ai/skills/swarmrecall-full"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on ClawHub &rarr;
        </a>
      </p>

      <h3>swarmrecall-memory</h3>
      <p>
        Semantic memory storage and retrieval. Store text memories and search
        them using natural language queries. Includes automatic embedding
        generation and deduplication.
      </p>
      <pre>
        <code>swarmclaw skill install swarmrecall-memory</code>
      </pre>
      <p>
        <a
          href="https://clawhub.ai/skills/swarmrecall-memory"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on ClawHub &rarr;
        </a>
      </p>

      <h3>swarmrecall-knowledge</h3>
      <p>
        Knowledge graph builder. Create entities, define relationships, and
        query the graph. Ideal for building structured understanding of
        domains, people, and projects.
      </p>
      <pre>
        <code>swarmclaw skill install swarmrecall-knowledge</code>
      </pre>
      <p>
        <a
          href="https://clawhub.ai/skills/swarmrecall-knowledge"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on ClawHub &rarr;
        </a>
      </p>

      <h3>swarmrecall-learnings</h3>
      <p>
        Pattern extraction and distilled insights. Agents can record
        successes, failures, and observed patterns. Over time, these distill
        into reusable knowledge.
      </p>
      <pre>
        <code>swarmclaw skill install swarmrecall-learnings</code>
      </pre>
      <p>
        <a
          href="https://clawhub.ai/skills/swarmrecall-learnings"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on ClawHub &rarr;
        </a>
      </p>

      <h3>swarmrecall-skills</h3>
      <p>
        Skill registry module. Track what your agent can do, version
        capabilities, and share skill definitions across your swarm.
      </p>
      <pre>
        <code>swarmclaw skill install swarmrecall-skills</code>
      </pre>
      <p>
        <a
          href="https://clawhub.ai/skills/swarmrecall-skills"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on ClawHub &rarr;
        </a>
      </p>

      <h3>swarmrecall-agent</h3>
      <p>
        Agent identity and registration module. Handles auto-registration,
        claim code generation, and agent metadata management.
      </p>
      <pre>
        <code>swarmclaw skill install swarmrecall-agent</code>
      </pre>
      <p>
        <a
          href="https://clawhub.ai/skills/swarmrecall-agent"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on ClawHub &rarr;
        </a>
      </p>

      <h2>Installing Skills via CLI</h2>
      <p>
        All skills can be installed from the SwarmClaw CLI:
      </p>
      <pre>
        <code>
          {`# Install a single skill
swarmclaw skill install swarmrecall-memory

# Install the full bundle
swarmclaw skill install swarmrecall-full

# List installed skills
swarmclaw skill list

# Remove a skill
swarmclaw skill remove swarmrecall-memory`}
        </code>
      </pre>

      <h2>Skill Configuration</h2>
      <p>
        Skills auto-configure on first use. No API keys or environment
        variables are needed upfront. The skill handles:
      </p>
      <ul>
        <li>Agent registration with SwarmRecall</li>
        <li>Secure API key storage in SwarmClaw&apos;s credential store</li>
        <li>Claim code generation for dashboard access</li>
      </ul>
      <p>
        If you need to customize the API endpoint (e.g., for self-hosted
        deployments), set the <code>SWARMRECALL_API_URL</code> environment
        variable:
      </p>
      <pre>
        <code>
          {`# In your SwarmClaw config or environment
SWARMRECALL_API_URL=https://your-instance.example.com`}
        </code>
      </pre>
    </div>
  );
}
