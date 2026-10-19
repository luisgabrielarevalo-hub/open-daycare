export type PostKind = "achievement" | "activity" | "announcement";

export type Post = {
  id: string;
  kind: PostKind;
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

export const posts: Post[] = [
  {
    id: "potty-milestone",
    kind: "achievement",
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
