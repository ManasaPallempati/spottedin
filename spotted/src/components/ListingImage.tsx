import type { ListingPhoto } from "@/data/types";

// Stock/product photo with the token gradient behind it, so cards stay
// designed even if the remote image is unavailable.
export function ListingImage({
  photo,
  className = "",
  sizes: _sizes,
}: {
  photo: ListingPhoto;
  className?: string;
  sizes?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(160deg, ${photo.c1}, ${photo.c2})` }}
    >
      {photo.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.src}
          alt={photo.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!photo.src && <span className="sr-only">{photo.alt}</span>}
    </div>
  );
}
