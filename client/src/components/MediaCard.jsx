export default function MediaCard({ title, subtitle, image }) {
  return (
    <article className="media-card">
      <img src={image} alt={title} loading="lazy" />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </article>
  );
}
