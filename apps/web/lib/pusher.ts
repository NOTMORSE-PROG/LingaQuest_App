import Pusher from "pusher";

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? "ap1",
  useTLS: true,
});

export function roomChannel(roomId: string) {
  return `room-${roomId}`;
}
