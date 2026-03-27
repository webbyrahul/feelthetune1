import useDragScroll from '../hooks/useDragScroll';

export default function HorizontalScroller({ children }) {
  const { containerRef, dragHandlers } = useDragScroll();

  return (
    <div ref={containerRef} className="scroller" {...dragHandlers}>
      {children}
    </div>
  );
}
