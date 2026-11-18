export const metadata = {
  title: "Khám phá poster - Mocaemtui",
};

const POSTER_WALL_URL =
  process.env.NEXT_PUBLIC_POSTER_WALL_URL ?? "http://localhost:3100";

export default function KhamPhaPage() {
  return (
    <div className="w-full h-[calc(100dvh-4rem)] bg-black">
      <iframe
        src={POSTER_WALL_URL}
        title="Khám phá phim - Poster Wall"
        className="w-full h-full border-0"
        allow="fullscreen"
      />
    </div>
  );
}
