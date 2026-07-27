interface AvatarProps {
  emoji: string;
  size?: number;
}

export default function Avatar({ emoji, size = 40 }: AvatarProps) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {emoji}
    </div>
  );
}
