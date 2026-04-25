import { ref } from 'vue';

export function useSplitDrag() {
  const leftPanelWidth = ref(35);
  const isDragging = ref(false);
  const startX = ref(0);
  const startWidth = ref(0);

  const startDrag = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    isDragging.value = true;
    startX.value = event.clientX;
    startWidth.value = leftPanelWidth.value;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;

    event.preventDefault();

    const containerWidth = window.innerWidth;
    const deltaX = event.clientX - startX.value;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const newWidth = startWidth.value + deltaPercent;

    leftPanelWidth.value = Math.max(25, Math.min(50, newWidth));
  };

  const stopDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;

    event?.preventDefault();
    isDragging.value = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  };

  return {
    leftPanelWidth,
    isDragging,
    startDrag,
  };
}
