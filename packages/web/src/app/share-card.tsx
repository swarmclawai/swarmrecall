const background = '#0A0A0A';
const panel = '#111111';
const border = '#333333';
const text = '#E0E0E0';
const muted = '#888888';
const dim = '#555555';
const green = '#00FF88';
const orange = '#FF6B35';
const red = '#FF4444';

const pillars = ['Memory', 'Knowledge', 'Learnings', 'Skills'];

export const shareImageAlt =
  'SwarmRecall share image for Memory for AI Agents with terminal-inspired branding.';

export const shareImageSize = {
  width: 1200,
  height: 630,
};

export const shareImageContentType = 'image/png';

function Pillar({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        border: `1px solid ${border}`,
        background: panel,
        color: text,
        fontSize: 28,
        lineHeight: 1,
      }}
    >
      <span style={{ color: green }}>{'>'}</span>
      <span>{label}</span>
    </div>
  );
}

export function ShareCard() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: background,
        color: text,
        fontFamily:
          '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          background:
            'linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,255,136,0) 45%), linear-gradient(180deg, rgba(255,107,53,0.08) 0%, rgba(255,107,53,0) 20%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          background:
            'repeating-linear-gradient(0deg, transparent 0, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 10px)',
          opacity: 0.28,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 28,
          display: 'flex',
          border: `1px solid ${border}`,
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flex: 1,
          padding: '56px 64px',
          gap: 42,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 720,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 26,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                color: dim,
                fontSize: 24,
              }}
            >
              <span>$ swarmrecall --share</span>
              <span style={{ color: green }}>online</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 18,
                  fontSize: 74,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                }}
              >
                <span style={{ color: green }}>{'>'}</span>
                <span>
                  Swarm<span style={{ color: green }}>Recall</span>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: 30,
                  color: text,
                }}
              >
                Memory for AI Agents
              </div>

              <div
                style={{
                  display: 'flex',
                  maxWidth: 650,
                  fontSize: 24,
                  lineHeight: 1.55,
                  color: muted,
                }}
              >
                Persistent memory, knowledge, learnings, and skills. Your
                agents remember everything.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 20,
              color: dim,
            }}
          >
            <span style={{ color: green }}>swarmrecall.ai</span>
            <span style={{ color: border }}>/</span>
            <span>hosted persistence layer</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            minWidth: 0,
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 14,
            padding: '24px 0 24px 8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 18px',
              border: `1px solid ${border}`,
              background: panel,
              fontSize: 22,
              color: dim,
            }}
          >
            <span style={{ width: 12, height: 12, background: red }} />
            <span style={{ width: 12, height: 12, background: orange }} />
            <span style={{ width: 12, height: 12, background: green }} />
            <span style={{ marginLeft: 10 }}>terminal://agent-state</span>
          </div>

          {pillars.map((pillar) => (
            <Pillar key={pillar} label={pillar} />
          ))}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 18px',
              border: `1px solid ${border}`,
              background: '#0D0D0D',
              fontSize: 22,
              color: muted,
            }}
          >
            <span style={{ color: green, marginRight: 14 }}>{'>'}</span>
            <span>state survives across sessions, providers, and platforms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
