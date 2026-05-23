import type { GroupMemberRow, GroupRow } from '@/types';

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export class Group {
  constructor(
    public id: string,
    public name: string,
    public createdBy: string,
    public members: GroupMember[],
    public inviteCode: string,
    public description?: string,
    public avatarUrl?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  getMemberById(userId: string): GroupMember | undefined {
    return this.members.find((m) => m.userId === userId);
  }

  isAdmin(userId: string): boolean {
    return this.getMemberById(userId)?.role === 'admin';
  }

  isMember(userId: string): boolean {
    return this.members.some((m) => m.userId === userId);
  }

  getMemberCount(): number {
    return this.members.length;
  }

  getShareableInviteLink(baseUrl?: string): string {
    const base = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/join/${this.inviteCode}`;
  }

  static fromRow(row: GroupRow, members: GroupMemberRow[]): Group {
    const groupMembers: GroupMember[] = members
      .filter((m) => m.group_id === row.id)
      .map((m) => ({
        id: m.id,
        userId: m.user_id,
        groupId: m.group_id,
        role: m.role,
        joinedAt: new Date(m.joined_at),
      }));
    return new Group(
      row.id,
      row.name,
      row.created_by,
      groupMembers,
      row.invite_code,
      row.description,
      row.avatar_url,
      new Date(row.created_at),
      new Date(row.updated_at),
    );
  }
}
