export default function MediaCard({ title, subtitle, image, onClick }) {
  return (
    <article className="media-card clickable" onClick={onClick} role="button" tabIndex={0}>
      <img src={image} alt={title} loading="lazy" />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </article>
  );
}
