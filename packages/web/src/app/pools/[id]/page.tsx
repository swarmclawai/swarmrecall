'use client';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type AccessLevel = 'none' | 'read' | 'readwrite';

interface Pool {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface PoolMember {
  agentId: string;
  agentName: string;
  memoryAccess: AccessLevel;
  knowledgeAccess: AccessLevel;
  learningsAccess: AccessLevel;
  skillsAccess: AccessLevel;
}

interface Agent {
  id: string;
  name: string;
}

const accessBadgeClass: Record<AccessLevel, string> = {
  none: 'bg-gray-100 text-gray-600',
  read: 'bg-blue-50 text-blue-700',
  readwrite: 'bg-green-50 text-green-700',
};

export default function PoolDetailPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const [pool, setPool] = useState<Pool | null>(null);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit pool state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [memoryAccess, setMemoryAccess] = useState<AccessLevel>('read');
  const [knowledgeAccess, setKnowledgeAccess] = useState<AccessLevel>('read');
  const [learningsAccess, setLearningsAccess] = useState<AccessLevel>('read');
  const [skillsAccess, setSkillsAccess] = useState<AccessLevel>('read');
  const [addingMember, setAddingMember] = useState(false);

  // Edit member state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemoryAccess, setEditMemoryAccess] = useState<AccessLevel>('read');
  const [editKnowledgeAccess, setEditKnowledgeAccess] = useState<AccessLevel>('read');
  const [editLearningsAccess, setEditLearningsAccess] = useState<AccessLevel>('read');
  const [editSkillsAccess, setEditSkillsAccess] = useState<AccessLevel>('read');
  const [updatingMember, setUpdatingMember] = useState(false);

  const poolId = params.id as string;

  const loadPool = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await apiFetch<Pool & { members: PoolMember[] }>(
        `/manage/pools/${poolId}`,
        token,
      );
      setPool(data);
      setMembers(data.members ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pool');
    } finally {
      setLoading(false);
    }
  }, [poolId, getToken]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = await getToken();
      await apiFetch(`/manage/pools/${poolId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      setEditing(false);
      await loadPool();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update pool');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this pool?')) return;
    setError('');
    try {
      const token = await getToken();
      await apiFetch(`/manage/pools/${poolId}`, token, {
        method: 'DELETE',
      });
      window.location.href = '/pools';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to archive pool');
    }
  };

  const openAddMember = async () => {
    setShowAddMember(true);
    try {
      const token = await getToken();
      const data = await apiFetch<{ data: Agent[] }>('/agents', token);
      setAgents(data.data ?? []);
    } catch {
      setError('Failed to load agents');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    setError('');
    try {
      const token = await getToken();
      await apiFetch(`/manage/pools/${poolId}/members`, token, {
        method: 'POST',
        body: JSON.stringify({
          agentId: selectedAgentId,
          memoryAccess,
          knowledgeAccess,
          learningsAccess,
          skillsAccess,
        }),
      });
      setShowAddMember(false);
      setSelectedAgentId('');
      setMemoryAccess('read');
      setKnowledgeAccess('read');
      setLearningsAccess('read');
      setSkillsAccess('read');
      await loadPool();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const startEditMember = (member: PoolMember) => {
    setEditingMemberId(member.agentId);
    setEditMemoryAccess(member.memoryAccess);
    setEditKnowledgeAccess(member.knowledgeAccess);
    setEditLearningsAccess(member.learningsAccess);
    setEditSkillsAccess(member.skillsAccess);
  };

  const handleUpdateMember = async (agentId: string) => {
    setUpdatingMember(true);
    setError('');
    try {
      const token = await getToken();
      await apiFetch(`/manage/pools/${poolId}/members/${agentId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          memoryAccess: editMemoryAccess,
          knowledgeAccess: editKnowledgeAccess,
          learningsAccess: editLearningsAccess,
          skillsAccess: editSkillsAccess,
        }),
      });
      setEditingMemberId(null);
      await loadPool();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setUpdatingMember(false);
    }
  };

  const handleRemoveMember = async (agentId: string) => {
    if (!confirm('Remove this agent from the pool?')) return;
    setError('');
    try {
      const token = await getToken();
      await apiFetch(`/manage/pools/${poolId}/members/${agentId}`, token, {
        method: 'DELETE',
      });
      await loadPool();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/pools" className="hover:text-gray-900">
            Pools
          </Link>
          <span>/</span>
          <span className="text-gray-900">{pool?.name ?? 'Pool'}</span>
        </nav>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {pool && (
          <>
            {/* Pool header */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              {editing ? (
                <form onSubmit={handleEdit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="edit-pool-name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Name
                    </label>
                    <input
                      id="edit-pool-name"
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-pool-desc"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="edit-pool-desc"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {pool.name}
                    </h1>
                    {pool.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {pool.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      Created {new Date(pool.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditName(pool.name);
                        setEditDescription(pool.description ?? '');
                        setEditing(true);
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleArchive}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Members section */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Members</h2>
                <button
                  onClick={openAddMember}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Add Member
                </button>
              </div>

              {/* Add member form */}
              {showAddMember && (
                <form
                  onSubmit={handleAddMember}
                  className="border-b border-gray-200 px-6 py-4 space-y-4 bg-gray-50"
                >
                  <h3 className="text-sm font-semibold text-gray-900">
                    Add Agent to Pool
                  </h3>
                  <div>
                    <label
                      htmlFor="member-agent"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Agent
                    </label>
                    <select
                      id="member-agent"
                      required
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                    >
                      <option value="">Select an agent...</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <label
                        htmlFor="add-memory-access"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Memory
                      </label>
                      <select
                        id="add-memory-access"
                        value={memoryAccess}
                        onChange={(e) => setMemoryAccess(e.target.value as AccessLevel)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                      >
                        <option value="none">none</option>
                        <option value="read">read</option>
                        <option value="readwrite">readwrite</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="add-knowledge-access"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Knowledge
                      </label>
                      <select
                        id="add-knowledge-access"
                        value={knowledgeAccess}
                        onChange={(e) => setKnowledgeAccess(e.target.value as AccessLevel)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                      >
                        <option value="none">none</option>
                        <option value="read">read</option>
                        <option value="readwrite">readwrite</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="add-learnings-access"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Learnings
                      </label>
                      <select
                        id="add-learnings-access"
                        value={learningsAccess}
                        onChange={(e) => setLearningsAccess(e.target.value as AccessLevel)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                      >
                        <option value="none">none</option>
                        <option value="read">read</option>
                        <option value="readwrite">readwrite</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="add-skills-access"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Skills
                      </label>
                      <select
                        id="add-skills-access"
                        value={skillsAccess}
                        onChange={(e) => setSkillsAccess(e.target.value as AccessLevel)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                      >
                        <option value="none">none</option>
                        <option value="read">read</option>
                        <option value="readwrite">readwrite</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={addingMember}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {addingMember ? 'Adding...' : 'Add Member'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Members table */}
              {members.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-500">
                    No members yet. Add an agent to this pool.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Memory
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Knowledge
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Learnings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Skills
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.agentId}>
                          {editingMemberId === member.agentId ? (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {member.agentName}
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={editMemoryAccess}
                                  onChange={(e) => setEditMemoryAccess(e.target.value as AccessLevel)}
                                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                                >
                                  <option value="none">none</option>
                                  <option value="read">read</option>
                                  <option value="readwrite">readwrite</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={editKnowledgeAccess}
                                  onChange={(e) => setEditKnowledgeAccess(e.target.value as AccessLevel)}
                                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                                >
                                  <option value="none">none</option>
                                  <option value="read">read</option>
                                  <option value="readwrite">readwrite</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={editLearningsAccess}
                                  onChange={(e) => setEditLearningsAccess(e.target.value as AccessLevel)}
                                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                                >
                                  <option value="none">none</option>
                                  <option value="read">read</option>
                                  <option value="readwrite">readwrite</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={editSkillsAccess}
                                  onChange={(e) => setEditSkillsAccess(e.target.value as AccessLevel)}
                                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                                >
                                  <option value="none">none</option>
                                  <option value="read">read</option>
                                  <option value="readwrite">readwrite</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleUpdateMember(member.agentId)}
                                    disabled={updatingMember}
                                    className="text-sm font-medium text-gray-900 hover:text-gray-700 disabled:opacity-50 cursor-pointer"
                                  >
                                    {updatingMember ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingMemberId(null)}
                                    className="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {member.agentName}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[member.memoryAccess]}`}
                                >
                                  {member.memoryAccess}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[member.knowledgeAccess]}`}
                                >
                                  {member.knowledgeAccess}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[member.learningsAccess]}`}
                                >
                                  {member.learningsAccess}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${accessBadgeClass[member.skillsAccess]}`}
                                >
                                  {member.skillsAccess}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => startEditMember(member)}
                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member.agentId)}
                                    className="text-sm font-medium text-red-500 hover:text-red-700 cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
