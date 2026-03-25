import { useRef } from 'react';

export default function useDragScroll() {
  const containerRef = useRef(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  const startDrag = (clientX) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    dragState.current = {
      isDown: true,
      startX: clientX - rect.left,
      scrollLeft: container.scrollLeft
    };
    container.classList.add('dragging');
  };

  const endDrag = () => {
    const container = containerRef.current;
    if (!container) return;
    dragState.current.isDown = false;
    container.classList.remove('dragging');
  };

  const moveDrag = (clientX, preventDefault) => {
    const container = containerRef.current;
    if (!container || !dragState.current.isDown) return;
    if (preventDefault) preventDefault();
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const walk = (x - dragState.current.startX) * 1.5;
    container.scrollLeft = dragState.current.scrollLeft - walk;
  };

  // Use Pointer Events to handle mouse, touch, and pen uniformly
  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startDrag(event.clientX);
  };
  const onPointerMove = (event) => moveDrag(event.clientX, () => event.preventDefault());
  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();
  const onPointerLeave = () => endDrag();

  return {
    containerRef,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave
    }
  };
}
