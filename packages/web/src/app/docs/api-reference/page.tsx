export default function ApiReferencePage() {
  return (
    <div className="prose-docs font-mono">
      <h1 className="text-2xl font-bold text-[#00FF88] mb-2">## API Reference</h1>
      <p className="text-[#888] text-sm mb-8">
        The SwarmRecall REST API is organized around resource modules. All
        endpoints accept and return JSON. Authentication is via Bearer token
        (either an agent API key or a Firebase ID token).
      </p>
      <p>
        Base URL:{' '}
        <code>https://api.swarmrecall.ai</code> (production) or{' '}
        <code>http://localhost:3300</code> (local development)
      </p>

      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Authentication</h2>
      <p>
        All requests must include an <code>Authorization</code> header:
      </p>
      <pre>
        <code>Authorization: Bearer &lt;token&gt;</code>
      </pre>
      <p>
        Agent API keys are used for agent-to-service calls. Firebase ID
        tokens are used for dashboard (owner) calls.
      </p>

      {/* Registration */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Registration</h2>
      <p>Agent self-registration and claim flow.</p>

      <h3>
        <code>POST /api/v1/register</code>
      </h3>
      <p>Register a new agent. No auth required.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td>Display name for the agent</td>
          </tr>
          <tr>
            <td><code>platform</code></td>
            <td>string</td>
            <td>Optional. Platform identifier (e.g. &quot;swarmclaw&quot;)</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Response:</strong> <code>agentId</code>,{' '}
        <code>apiKey</code>, <code>claimCode</code>
      </p>

      <h3>
        <code>POST /api/v1/claim</code>
      </h3>
      <p>Claim an agent. Requires Firebase ID token.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>claimCode</code></td>
            <td>string</td>
            <td>The claim code from agent registration</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Response:</strong> <code>agentId</code>, <code>ownerId</code>
      </p>

      {/* Memory */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Memory</h2>
      <p>Store and retrieve agent memories with semantic search.</p>

      <h3>
        <code>POST /api/v1/memory</code>
      </h3>
      <p>Store a memory. Requires agent API key.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>content</code></td>
            <td>string</td>
            <td>The memory content to store</td>
          </tr>
          <tr>
            <td><code>tags</code></td>
            <td>string[]</td>
            <td>Optional. Tags for filtering</td>
          </tr>
          <tr>
            <td><code>metadata</code></td>
            <td>object</td>
            <td>Optional. Arbitrary key-value metadata</td>
          </tr>
        </tbody>
      </table>

      <h3>
        <code>GET /api/v1/memory/search?q=&lt;query&gt;</code>
      </h3>
      <p>Semantic search across memories. Requires agent API key.</p>
      <table>
        <thead>
          <tr>
            <th>Param</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>q</code></td>
            <td>string</td>
            <td>Search query</td>
          </tr>
          <tr>
            <td><code>limit</code></td>
            <td>number</td>
            <td>Optional. Max results (default 10)</td>
          </tr>
          <tr>
            <td><code>tags</code></td>
            <td>string</td>
            <td>Optional. Comma-separated tag filter</td>
          </tr>
        </tbody>
      </table>

      <h3>
        <code>GET /api/v1/memory/:id</code>
      </h3>
      <p>Get a specific memory by ID.</p>

      <h3>
        <code>DELETE /api/v1/memory/:id</code>
      </h3>
      <p>Delete a specific memory.</p>

      {/* Knowledge */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Knowledge</h2>
      <p>Entity and relationship graph management.</p>

      <h3>
        <code>POST /api/v1/knowledge/entities</code>
      </h3>
      <p>Create or update an entity.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td>Entity name</td>
          </tr>
          <tr>
            <td><code>type</code></td>
            <td>string</td>
            <td>Entity type (e.g. &quot;person&quot;, &quot;concept&quot;)</td>
          </tr>
          <tr>
            <td><code>properties</code></td>
            <td>object</td>
            <td>Optional. Entity properties</td>
          </tr>
        </tbody>
      </table>

      <h3>
        <code>POST /api/v1/knowledge/relations</code>
      </h3>
      <p>Create a relationship between entities.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>fromEntityId</code></td>
            <td>string</td>
            <td>Source entity ID</td>
          </tr>
          <tr>
            <td><code>toEntityId</code></td>
            <td>string</td>
            <td>Target entity ID</td>
          </tr>
          <tr>
            <td><code>type</code></td>
            <td>string</td>
            <td>Relationship type (e.g. &quot;knows&quot;, &quot;uses&quot;)</td>
          </tr>
        </tbody>
      </table>

      <h3>
        <code>GET /api/v1/knowledge/entities</code>
      </h3>
      <p>List all entities. Supports <code>?type=</code> filter.</p>

      <h3>
        <code>GET /api/v1/knowledge/entities/:id</code>
      </h3>
      <p>Get entity with its relations.</p>

      <h3>
        <code>GET /api/v1/knowledge/search?q=&lt;query&gt;</code>
      </h3>
      <p>Search across entities and relations.</p>

      {/* Learnings */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Learnings</h2>
      <p>Pattern extraction and distilled insights.</p>

      <h3>
        <code>POST /api/v1/learnings</code>
      </h3>
      <p>Store a learning.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>content</code></td>
            <td>string</td>
            <td>The learning content</td>
          </tr>
          <tr>
            <td><code>category</code></td>
            <td>string</td>
            <td>Optional. Category (e.g. &quot;success&quot;, &quot;failure&quot;, &quot;pattern&quot;)</td>
          </tr>
          <tr>
            <td><code>confidence</code></td>
            <td>number</td>
            <td>Optional. Confidence score 0-1</td>
          </tr>
        </tbody>
      </table>

      <h3>
        <code>GET /api/v1/learnings</code>
      </h3>
      <p>
        List learnings. Supports <code>?category=</code> and{' '}
        <code>?limit=</code> filters.
      </p>

      <h3>
        <code>GET /api/v1/learnings/search?q=&lt;query&gt;</code>
      </h3>
      <p>Semantic search across learnings.</p>

      {/* Skills */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Skills</h2>
      <p>Agent skill registry.</p>

      <h3>
        <code>POST /api/v1/skills</code>
      </h3>
      <p>Register a skill.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td>Skill name</td>
          </tr>
          <tr>
            <td><code>description</code></td>
            <td>string</td>
            <td>What the skill does</td>
          </tr>
          <tr>
            <td><code>version</code></td>
            <td>string</td>
            <td>Optional. Semantic version</td>
          </tr>
          <tr>
            <td><code>schema</code></td>
            <td>object</td>
            <td>Optional. JSON schema for skill parameters</td>
          </tr>
        </tbody>
      </table>

      <h3>
        <code>GET /api/v1/skills</code>
      </h3>
      <p>List all skills for the agent.</p>

      <h3>
        <code>GET /api/v1/skills/:id</code>
      </h3>
      <p>Get a specific skill.</p>

      <h3>
        <code>DELETE /api/v1/skills/:id</code>
      </h3>
      <p>Remove a skill.</p>

      {/* Owners */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Owners</h2>
      <p>Owner (dashboard user) management. Requires Firebase token.</p>

      <h3>
        <code>GET /api/v1/owners/me</code>
      </h3>
      <p>Get the current owner profile.</p>

      <h3>
        <code>GET /api/v1/owners/me/agents</code>
      </h3>
      <p>List all agents owned by the current user.</p>

      {/* Agents */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## Agents</h2>
      <p>Agent management endpoints.</p>

      <h3>
        <code>GET /api/v1/agents/:id</code>
      </h3>
      <p>Get agent details. Requires owner token or agent API key.</p>

      <h3>
        <code>PATCH /api/v1/agents/:id</code>
      </h3>
      <p>Update agent settings. Requires owner token.</p>

      <h3>
        <code>DELETE /api/v1/agents/:id</code>
      </h3>
      <p>Delete an agent and all its data. Requires owner token.</p>

      {/* API Keys */}
      <h2 className="text-lg font-bold text-[#E0E0E0] mt-8 mb-3">## API Keys</h2>
      <p>Manage API keys. Requires Firebase token.</p>

      <h3>
        <code>POST /api/v1/api-keys</code>
      </h3>
      <p>Create a new API key.</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td>Display name for the key</td>
          </tr>
          <tr>
            <td><code>agentId</code></td>
            <td>string</td>
            <td>Optional. Scope to a specific agent</td>
          </tr>
        </tbody>
      </table>

      <h3>
        <code>GET /api/v1/api-keys</code>
      </h3>
      <p>List all API keys.</p>

      <h3>
        <code>DELETE /api/v1/api-keys/:id</code>
      </h3>
      <p>Revoke an API key.</p>
    </div>
  );
}
