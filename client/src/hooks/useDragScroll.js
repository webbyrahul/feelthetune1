import { useRef } from 'react';

export default function useDragScroll() {
  const containerRef = useRef(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = (event) => {
    const container = containerRef.current;
    if (!container) return;
    dragState.current = {
      isDown: true,
      startX: event.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft
    };
    container.classList.add('dragging');
  };

  const onMouseLeave = () => {
    const container = containerRef.current;
    if (!container) return;
    dragState.current.isDown = false;
    container.classList.remove('dragging');
  };

  const onMouseUp = () => {
    const container = containerRef.current;
    if (!container) return;
    dragState.current.isDown = false;
    container.classList.remove('dragging');
  };

  const onMouseMove = (event) => {
    const container = containerRef.current;
    if (!container || !dragState.current.isDown) return;
    event.preventDefault();
    const x = event.pageX - container.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    container.scrollLeft = dragState.current.scrollLeft - walk;
  };

  return {
    containerRef,
    dragHandlers: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove
    }
  };
}
