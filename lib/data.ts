export type PostKind =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type StaffProfile = {
  id: string;
  name: string;
  role: string;
  roleKey: "staff" | "parent" | "admin";
  initial: string;
  room: string;
  childCount: number;
  dateLabel: string;
};

export type ChildTagTone = "allergy" | "link";

export type ChildTag = {
  label: string;
  tone: ChildTagTone;
};

export type ParentLinkStatus = "active" | "pending";

export type LinkedParent = {
  name: string;
  relationship: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
  status: ParentLinkStatus;
  statusLabel: string;
};

export type Child = {
  id: string;
  fullName: string;
  ageLabel: string;
  room: string;
  roomFullName: string;
  birthDateLabel: string;
  joinedLabel: string;
  avatarBg: string;
  avatarColor: string;
  tag?: ChildTag;
  tags?: ChildTag[];
  allergiesNotes?: string;
  parents: LinkedParent[];
};
