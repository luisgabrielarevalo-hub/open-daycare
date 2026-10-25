export type PostKind =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type PostAudienceKind = "child" | "room";

export type Post = {
  id: string;
  kind: PostKind;
  audienceKind: PostAudienceKind;
  authorName: string;
  authorInitial: string;
  avatarBg: string;
  avatarColor: string;
  time: string;
  audience: string;
  body: string;
  reactions: number;
  comments: number;
  photoLabel?: string;
  photos?: string[];
};

export type StaffProfile = {
  name: string;
  role: string;
  initial: string;
  room: string;
  childCount: number;
  dateLabel: string;
};

export const staffProfile: StaffProfile = {
  name: "Caro Giménez",
  role: "Maestra · Soles",
  initial: "C",
  room: "Sala Soles",
  childCount: 12,
  dateLabel: "martes 17 jun",
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
  allergiesNotes?: string;
  parents: LinkedParent[];
};

export const children: Child[] = [
  {
    id: "mateo-fernandez",
    fullName: "Mateo Fernández",
    ageLabel: "3 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "12 mar 2022",
    joinedLabel: "feb 2025",
    avatarBg: "#A9D9E8",
    avatarColor: "#1F7A93",
    tag: { label: "MANÍ", tone: "allergy" },
    allergiesNotes:
      "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.",
    parents: [
      {
        name: "Lucía Fernández",
        relationship: "Mamá",
        initial: "L",
        avatarBg: "#C9B6E8",
        avatarColor: "#FFFFFF",
        status: "active",
        statusLabel: "activa",
      },
      {
        name: "Diego Fernández",
        relationship: "Papá",
        initial: "D",
        avatarBg: "#A9C7E8",
        avatarColor: "#FFFFFF",
        status: "pending",
        statusLabel: "invitación enviada",
      },
    ],
  },
  {
    id: "sofia-mendez",
    fullName: "Sofía Méndez",
    ageLabel: "2 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "8 ago 2023",
    joinedLabel: "mar 2025",
    avatarBg: "#F4B8CC",
    avatarColor: "#C44A7A",
    parents: [
      {
        name: "Camila Méndez",
        relationship: "Mamá",
        initial: "C",
        avatarBg: "#F4B8CC",
        avatarColor: "#C44A7A",
        status: "active",
        statusLabel: "activa",
      },
    ],
  },
  {
    id: "benjamin-ruiz",
    fullName: "Benjamín Ruiz",
    ageLabel: "3 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "21 nov 2022",
    joinedLabel: "ene 2025",
    avatarBg: "#B9DEC4",
    avatarColor: "#3E8B62",
    parents: [
      {
        name: "Andrés Ruiz",
        relationship: "Papá",
        initial: "A",
        avatarBg: "#A9C7E8",
        avatarColor: "#FFFFFF",
        status: "active",
        statusLabel: "activo",
      },
      {
        name: "Paula Ruiz",
        relationship: "Mamá",
        initial: "P",
        avatarBg: "#F4DC8E",
        avatarColor: "#9A7B1E",
        status: "active",
        statusLabel: "activa",
      },
    ],
  },
  {
    id: "valentina-soto",
    fullName: "Valentina Soto",
    ageLabel: "2 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "4 abr 2023",
    joinedLabel: "feb 2025",
    avatarBg: "#F4DC8E",
    avatarColor: "#9A7B1E",
    tag: { label: "VINCULAR", tone: "link" },
    parents: [],
  },
  {
    id: "tomas-diaz",
    fullName: "Tomás Díaz",
    ageLabel: "3 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "17 jun 2022",
    joinedLabel: "feb 2025",
    avatarBg: "#C9B6E8",
    avatarColor: "#7B5FC0",
    tag: { label: "LACTOSA", tone: "allergy" },
    allergiesNotes:
      "Intolerancia a la lactosa. Usar leche sin lactosa en las comidas.",
    parents: [
      {
        name: "Mariana Díaz",
        relationship: "Mamá",
        initial: "M",
        avatarBg: "#F4B8CC",
        avatarColor: "#C44A7A",
        status: "active",
        statusLabel: "activa",
      },
    ],
  },
  {
    id: "emma-castro",
    fullName: "Emma Castro",
    ageLabel: "2 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "29 sep 2023",
    joinedLabel: "mar 2025",
    avatarBg: "#F4B8CC",
    avatarColor: "#C44A7A",
    parents: [
      {
        name: "Pablo Castro",
        relationship: "Papá",
        initial: "P",
        avatarBg: "#B9DEC4",
        avatarColor: "#FFFFFF",
        status: "active",
        statusLabel: "activo",
      },
    ],
  },
  {
    id: "lucas-romero",
    fullName: "Lucas Romero",
    ageLabel: "3 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "3 feb 2022",
    joinedLabel: "ene 2025",
    avatarBg: "#A9D9E8",
    avatarColor: "#1F7A93",
    parents: [
      {
        name: "Natalia Romero",
        relationship: "Mamá",
        initial: "N",
        avatarBg: "#C9B6E8",
        avatarColor: "#FFFFFF",
        status: "active",
        statusLabel: "activa",
      },
    ],
  },
  {
    id: "olivia-vega",
    fullName: "Olivia Vega",
    ageLabel: "2 años",
    room: "Soles",
    roomFullName: "Sala Soles",
    birthDateLabel: "15 may 2023",
    joinedLabel: "abr 2025",
    avatarBg: "#B9DEC4",
    avatarColor: "#3E8B62",
    parents: [
      {
        name: "Sofía Vega",
        relationship: "Mamá",
        initial: "S",
        avatarBg: "#F4DC8E",
        avatarColor: "#9A7B1E",
        status: "active",
        statusLabel: "activa",
      },
    ],
  },
];

export const posts: Post[] = [
  {
    id: "potty-milestone",
    kind: "achievement",
    audienceKind: "child",
    authorName: "Mateo",
    authorInitial: "M",
    avatarBg: "#A9D9E8",
    avatarColor: "#1F7A93",
    time: "14:20 · publicado por vos",
    audience: "familia de Mateo",
    body: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    reactions: 3,
    comments: 1,
  },
  {
    id: "tempera-painting",
    kind: "activity",
    audienceKind: "child",
    authorName: "Mateo",
    authorInitial: "M",
    avatarBg: "#A9D9E8",
    avatarColor: "#1F7A93",
    time: "09:40 · publicado por vos",
    audience: "familia de Mateo",
    body: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.",
    reactions: 5,
    comments: 2,
    photoLabel: "Foto · pintando con témperas",
  },
  {
    id: "park-reminder",
    kind: "announcement",
    audienceKind: "room",
    authorName: "Anuncio general",
    authorInitial: "",
    avatarBg: "#CCD8F4",
    avatarColor: "#4E72C8",
    time: "07:50 · publicado por vos",
    audience: "toda la sala",
    body: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.",
    reactions: 8,
    comments: 0,
  },
];
