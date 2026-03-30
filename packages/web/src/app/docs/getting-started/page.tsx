export default function GettingStartedPage() {
  return (
    <div className="prose-docs">
      <h1>Getting Started</h1>
      <p>
        Get your agent connected to SwarmRecall in under five minutes. No
        upfront API key configuration required.
      </p>

      <h2>1. Install the SwarmRecall skill from ClawHub</h2>
      <p>
        Head to{' '}
        <a
          href="https://clawhub.ai/skills/swarmrecall"
          target="_blank"
          rel="noopener noreferrer"
        >
          clawhub.ai/skills/swarmrecall
        </a>{' '}
        and click <strong>Install</strong>. This adds the SwarmRecall skill to
        your SwarmClaw agent.
      </p>
      <p>
        Alternatively, install it from the CLI:
      </p>
      <pre>
        <code>swarmclaw skill install swarmrecall</code>
      </pre>

      <h2>2. Your agent auto-registers</h2>
      <p>
        The first time your agent calls any SwarmRecall method, it
        automatically registers itself with the service. No manual setup
        needed. The skill handles:
      </p>
      <ul>
        <li>Generating a unique agent identity</li>
        <li>Establishing a secure API key</li>
        <li>Creating the agent&apos;s memory and knowledge stores</li>
      </ul>

      <h2>3. Your agent gives you a claim code</h2>
      <p>
        After registration, your agent receives a <strong>claim code</strong>{' '}
        — a short alphanumeric string that links the agent to your account.
        The agent will display this code to you in the chat.
      </p>
      <pre>
        <code>
          {`Your SwarmRecall claim code is: ABC123XYZ\nVisit swarmrecall.ai/claim to link your dashboard.`}
        </code>
      </pre>

      <h2>4. Claim your dashboard</h2>
      <p>
        Visit{' '}
        <a href="/claim">swarmrecall.ai/claim</a> and:
      </p>
      <ol>
        <li>Sign in with Google, GitHub, or email</li>
        <li>Enter the claim code your agent gave you</li>
        <li>Your agent is now linked to your account</li>
      </ol>
      <p>
        Once claimed, you can view your agent&apos;s memories, knowledge
        graph, learnings, and skills from the dashboard.
      </p>

      <h2>5. (Optional) Create additional API keys</h2>
      <p>
        If you want to integrate SwarmRecall into other tools or scripts, you
        can create additional API keys from the{' '}
        <a href="/settings/api-keys">Settings &rarr; API Keys</a> page. Each
        key can be scoped to specific agents or given full account access.
      </p>

      <h2>What&apos;s next?</h2>
      <ul>
        <li>
          <a href="/docs/api-reference">API Reference</a> — Full endpoint
          documentation
        </li>
        <li>
          <a href="/docs/sdk">SDK Guide</a> — TypeScript SDK setup and usage
        </li>
        <li>
          <a href="/docs/skills">Skills</a> — Browse available ClawHub skills
        </li>
      </ul>
    </div>
  );
}
