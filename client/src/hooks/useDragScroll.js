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
    if (typeof preventDefault === 'function') preventDefault();
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const walk = (x - dragState.current.startX) * 1.5;
    container.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const onMouseDown = (event) => {
    if (event.button !== 0) return;
    startDrag(event.clientX);
  };
  const onMouseLeave = () => endDrag();
  const onMouseUp = () => endDrag();
  const onMouseMove = (event) => moveDrag(event.clientX, () => event.preventDefault());

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startDrag(event.clientX);
  };
  const onPointerMove = (event) => moveDrag(event.clientX, () => event.preventDefault());
  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();

  const onTouchStart = (event) => {
    if (!event.touches?.length) return;
    startDrag(event.touches[0].clientX);
  };
  const onTouchMove = (event) => {
    if (!event.touches?.length) return;
    moveDrag(event.touches[0].clientX, () => event.preventDefault());
  };
  const onTouchEnd = () => endDrag();
  const onTouchCancel = () => endDrag();

  return {
    containerRef,
    dragHandlers: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel
    }
  };
}
